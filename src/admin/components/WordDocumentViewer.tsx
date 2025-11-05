import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
    Delete as DeleteIcon,
    DragIndicator as DragIcon,
    Edit as EditIcon,
    Save as SaveIcon
} from '@mui/icons-material';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    Grid,
    IconButton,
    InputLabel,
    List,
    ListItem,
    ListItemSecondaryAction,
    ListItemText,
    MenuItem,
    Paper,
    Select,
    TextField,
    Typography
} from '@mui/material';

import { FieldMapping } from '../services/documentService';

interface WordDocumentViewerProps {
    documentFile: File | null;
    documentImageUrl?: string;
    availableDataFields: string[];
    onFieldMappingChange: (mappings: FieldMapping[]) => void;
    initialMappings?: FieldMapping[];
}

interface DragState {
    isDragging: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
}

interface SelectedRegion {
    x: number;
    y: number;
    width: number;
    height: number;
}

export const WordDocumentViewer: React.FC<WordDocumentViewerProps> = ({
    documentFile,
    documentImageUrl,
    availableDataFields,
    onFieldMappingChange,
    initialMappings = []
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>(initialMappings);
    const [dragState, setDragState] = useState<DragState>({
        isDragging: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0
    });
    const [selectedRegion, setSelectedRegion] = useState<SelectedRegion | null>(null);
    const [mappingDialog, setMappingDialog] = useState(false);
    const [newMapping, setNewMapping] = useState({
        fieldName: '',
        dataKey: '',
        fieldType: 'text' as 'text' | 'number' | 'date' | 'checkbox'
    });

    // Load document image onto canvas
    useEffect(() => {
        if (!documentImageUrl || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.onload = () => {
            // Set canvas size to match image
            canvas.width = img.width;
            canvas.height = img.height;

            // Draw image
            ctx.drawImage(img, 0, 0);

            // Draw existing field mappings
            drawFieldMappings(ctx);
        };
        img.src = documentImageUrl;
    }, [documentImageUrl, fieldMappings]);

    const drawFieldMappings = (ctx: CanvasRenderingContext2D) => {
        fieldMappings.forEach((mapping, index) => {
            // Draw mapping rectangle
            ctx.strokeStyle = '#1976d2';
            ctx.lineWidth = 2;
            ctx.strokeRect(mapping.x, mapping.y, mapping.width, mapping.height);

            // Draw mapping label
            ctx.fillStyle = '#1976d2';
            ctx.fillRect(mapping.x, mapping.y - 20, mapping.width, 20);

            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.fillText(`${mapping.fieldName} (${mapping.dataKey})`, mapping.x + 4, mapping.y - 6);
        });
    };

    const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        setDragState({
            isDragging: true,
            startX: x,
            startY: y,
            currentX: x,
            currentY: y
        });
    }, []);

    const handleCanvasMouseMove = useCallback(
        (event: React.MouseEvent<HTMLCanvasElement>) => {
            if (!dragState.isDragging) return;

            const canvas = canvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            setDragState(prev => ({
                ...prev,
                currentX: x,
                currentY: y
            }));

            // Redraw canvas with selection rectangle
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Clear and redraw
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Redraw document image
            if (documentImageUrl) {
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0);
                    drawFieldMappings(ctx);

                    // Draw current selection
                    ctx.strokeStyle = '#ff4444';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 5]);
                    ctx.strokeRect(
                        Math.min(dragState.startX, x),
                        Math.min(dragState.startY, y),
                        Math.abs(x - dragState.startX),
                        Math.abs(y - dragState.startY)
                    );
                    ctx.setLineDash([]);
                };
                img.src = documentImageUrl;
            }
        },
        [dragState, documentImageUrl, fieldMappings]
    );

    const handleCanvasMouseUp = useCallback(() => {
        if (!dragState.isDragging) return;

        const width = Math.abs(dragState.currentX - dragState.startX);
        const height = Math.abs(dragState.currentY - dragState.startY);

        // Only create mapping if selection is large enough
        if (width > 20 && height > 10) {
            setSelectedRegion({
                x: Math.min(dragState.startX, dragState.currentX),
                y: Math.min(dragState.startY, dragState.currentY),
                width,
                height
            });
            setMappingDialog(true);
        }

        setDragState(prev => ({ ...prev, isDragging: false }));
    }, [dragState]);

    const handleSaveMapping = () => {
        if (!selectedRegion || !newMapping.fieldName || !newMapping.dataKey) return;

        const mapping: FieldMapping = {
            id: Date.now().toString(),
            fieldName: newMapping.fieldName,
            dataKey: newMapping.dataKey,
            x: selectedRegion.x,
            y: selectedRegion.y,
            width: selectedRegion.width,
            height: selectedRegion.height,
            fieldType: newMapping.fieldType
        };

        const updatedMappings = [...fieldMappings, mapping];
        setFieldMappings(updatedMappings);
        onFieldMappingChange(updatedMappings);

        // Reset state
        setMappingDialog(false);
        setSelectedRegion(null);
        setNewMapping({ fieldName: '', dataKey: '', fieldType: 'text' });
    };

    const handleDeleteMapping = (mappingId: string) => {
        const updatedMappings = fieldMappings.filter(m => m.id !== mappingId);
        setFieldMappings(updatedMappings);
        onFieldMappingChange(updatedMappings);
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                Word Document Field Mapping
            </Typography>

            <Grid container spacing={3}>
                {/* Document Canvas */}
                <Grid item xs={8}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            Document Preview
                        </Typography>

                        {documentFile && documentImageUrl ? (
                            <Box
                                sx={{
                                    border: '1px solid #ccc',
                                    borderRadius: 1,
                                    overflow: 'auto',
                                    maxHeight: '600px'
                                }}
                            >
                                <canvas
                                    ref={canvasRef}
                                    style={{
                                        cursor: 'crosshair',
                                        display: 'block',
                                        maxWidth: '100%'
                                    }}
                                    onMouseDown={handleCanvasMouseDown}
                                    onMouseMove={handleCanvasMouseMove}
                                    onMouseUp={handleCanvasMouseUp}
                                />
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    height: 400,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '2px dashed #ccc',
                                    borderRadius: 1
                                }}
                            >
                                <Typography color="textSecondary">
                                    Upload a Word document to start mapping fields
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Field Mappings Panel */}
                <Grid item xs={4}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            Field Mappings ({fieldMappings.length})
                        </Typography>

                        <List dense>
                            {fieldMappings.map(mapping => (
                                <ListItem key={mapping.id} divider>
                                    <DragIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                    <ListItemText
                                        primary={mapping.fieldName}
                                        secondary={`${mapping.dataKey} (${mapping.fieldType})`}
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton
                                            edge="end"
                                            size="small"
                                            onClick={() => handleDeleteMapping(mapping.id)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>

                        {fieldMappings.length === 0 && (
                            <Typography color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
                                No field mappings yet. Click and drag on the document to create
                                mappings.
                            </Typography>
                        )}

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle2" gutterBottom>
                            Available Data Fields
                        </Typography>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {availableDataFields.map(field => (
                                <Chip key={field} label={field} size="small" variant="outlined" />
                            ))}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Field Mapping Dialog */}
            <Dialog
                open={mappingDialog}
                onClose={() => setMappingDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Create Field Mapping</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <TextField
                            label="Field Name"
                            fullWidth
                            value={newMapping.fieldName}
                            onChange={e =>
                                setNewMapping(prev => ({ ...prev, fieldName: e.target.value }))
                            }
                            sx={{ mb: 2 }}
                            placeholder="e.g., Full Name, Date of Birth"
                        />

                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Data Key</InputLabel>
                            <Select
                                value={newMapping.dataKey}
                                onChange={e =>
                                    setNewMapping(prev => ({ ...prev, dataKey: e.target.value }))
                                }
                            >
                                {availableDataFields.map(field => (
                                    <MenuItem key={field} value={field}>
                                        {field}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel>Field Type</InputLabel>
                            <Select
                                value={newMapping.fieldType}
                                onChange={e =>
                                    setNewMapping(prev => ({
                                        ...prev,
                                        fieldType: e.target.value as
                                            | 'text'
                                            | 'number'
                                            | 'date'
                                            | 'checkbox'
                                    }))
                                }
                            >
                                <MenuItem value="text">Text</MenuItem>
                                <MenuItem value="number">Number</MenuItem>
                                <MenuItem value="date">Date</MenuItem>
                                <MenuItem value="checkbox">Checkbox</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMappingDialog(false)}>Cancel</Button>
                    <Button
                        onClick={handleSaveMapping}
                        variant="contained"
                        disabled={!newMapping.fieldName || !newMapping.dataKey}
                        startIcon={<SaveIcon />}
                    >
                        Save Mapping
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default WordDocumentViewer;
