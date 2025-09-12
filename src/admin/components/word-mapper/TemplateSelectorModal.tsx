import React, { useMemo } from 'react';

import {
    CheckCircle as CheckCircleIcon,
    Close as CloseIcon,
    Warning as WarningIcon
} from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Typography
} from '@mui/material';

// Types for CSV template records
export interface TTHCRecord {
    maTTHC: string;
    tenTTHC: string;
    linhVuc: string;
    doiTuong?: string;
    capThucHien?: string;
    mauDon: string;
    tenFile?: string;
}

export interface EnhancedTTHCRecord extends TTHCRecord {
    isTemplateAvailable: boolean;
}

export interface FilterOptions {
    linhVuc: string[];
    thuTucByLinhVuc: { [linhVuc: string]: string[] };
}

export interface FilterState {
    linhVuc: string;
    thuTuc: string;
    availability: 'all' | 'available' | 'unavailable';
}

interface TemplateSelectorModalProps {
    open: boolean;
    onClose: () => void;
    onTemplateSelect: (record: EnhancedTTHCRecord) => void;
    csvLoading: boolean;
    filteredRecords: EnhancedTTHCRecord[];
    filters: FilterState;
    filterOptions: FilterOptions;
    onFilterChange: (key: keyof FilterState, value: string) => void;
    onClearFilters: () => void;
}

const extractTemplateName = (fullPath: string): string => {
    if (!fullPath || !fullPath.includes('/')) return '';
    const parts = fullPath.split('/');
    return parts[parts.length - 1]; // Get the last part (filename)
};

export const TemplateSelectorModal: React.FC<TemplateSelectorModalProps> = ({
    open,
    onClose,
    onTemplateSelect,
    csvLoading,
    filteredRecords,
    filters,
    filterOptions,
    onFilterChange,
    onClearFilters
}) => {
    // Available thủ tục based on selected lĩnh vực
    const availableThuTuc = useMemo(() => {
        if (!filters.linhVuc || !filterOptions.thuTucByLinhVuc[filters.linhVuc]) {
            return [];
        }
        return filterOptions.thuTucByLinhVuc[filters.linhVuc].sort();
    }, [filters.linhVuc, filterOptions.thuTucByLinhVuc]);

    const handleTemplateSelect = (record: EnhancedTTHCRecord) => {
        if (!record.isTemplateAvailable) {
            // Show warning but don't close modal
            return;
        }
        onTemplateSelect(record);
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: { height: '90vh', maxHeight: '900px' }
            }}
        >
            <DialogTitle
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    pb: 1
                }}
            >
                <Typography variant="h6">Chọn mẫu đơn từ danh sách thủ tục hành chính</Typography>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 0 }}>
                <Box sx={{ p: 3 }}>
                    {/* Filter Controls */}
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                                Bộ lọc tìm kiếm
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Lĩnh vực</InputLabel>
                                    <Select
                                        value={filters.linhVuc}
                                        label="Lĩnh vực"
                                        onChange={e => onFilterChange('linhVuc', e.target.value)}
                                    >
                                        <MenuItem value="">Tất cả</MenuItem>
                                        {filterOptions.linhVuc.map(item => (
                                            <MenuItem key={item} value={item}>
                                                {item}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth size="small">
                                    <InputLabel>Thủ tục</InputLabel>
                                    <Select
                                        value={filters.thuTuc}
                                        label="Thủ tục"
                                        onChange={e => onFilterChange('thuTuc', e.target.value)}
                                        disabled={!filters.linhVuc}
                                    >
                                        <MenuItem value="">Tất cả</MenuItem>
                                        {availableThuTuc.map(item => (
                                            <MenuItem key={item} value={item}>
                                                {item}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth size="small">
                                    <InputLabel>Trạng thái mẫu</InputLabel>
                                    <Select
                                        value={filters.availability}
                                        label="Trạng thái mẫu"
                                        onChange={e =>
                                            onFilterChange('availability', e.target.value)
                                        }
                                    >
                                        <MenuItem value="all">Tất cả</MenuItem>
                                        <MenuItem value="available">Có sẵn mẫu</MenuItem>
                                        <MenuItem value="unavailable">Chưa có mẫu</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>

                            <Button variant="outlined" onClick={onClearFilters} size="small">
                                Xóa bộ lọc
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Template List */}
                    {csvLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Box>
                            {/* Summary */}
                            <Box
                                sx={{
                                    mb: 2,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <Typography variant="body2" color="text.secondary">
                                    Tìm thấy {filteredRecords.length} thủ tục hành chính
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Chip
                                        icon={<CheckCircleIcon />}
                                        label={`${filteredRecords.filter(r => r.isTemplateAvailable).length} có mẫu`}
                                        color="success"
                                        size="small"
                                        variant="outlined"
                                    />
                                    <Chip
                                        icon={<WarningIcon />}
                                        label={`${filteredRecords.filter(r => !r.isTemplateAvailable).length} chưa có`}
                                        color="warning"
                                        size="small"
                                        variant="outlined"
                                    />
                                </Box>
                            </Box>

                            {/* Template Grid */}
                            <Box
                                sx={{
                                    maxHeight: 'calc(90vh - 300px)',
                                    overflowY: 'auto',
                                    pr: 1
                                }}
                            >
                                {filteredRecords.length > 0 ? (
                                    filteredRecords.map((record, index) => (
                                        <Paper
                                            key={index}
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                mb: 2,
                                                borderRadius: 2,
                                                border: '1px solid #e0e0e0',
                                                '&:hover': {
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                                    borderColor: record.isTemplateAvailable
                                                        ? '#1976d2'
                                                        : '#ed6c02'
                                                },
                                                transition: 'all 0.2s ease-in-out',
                                                opacity: record.isTemplateAvailable ? 1 : 0.7
                                            }}
                                        >
                                            {/* Header */}
                                            <Box sx={{ mb: 2 }}>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'flex-start',
                                                        mb: 1
                                                    }}
                                                >
                                                    <Typography
                                                        variant="h6"
                                                        color="primary"
                                                        sx={{ fontWeight: 'bold' }}
                                                    >
                                                        {record.maTTHC}
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                    >
                                                        {record.capThucHien || 'Cấp Xã'}
                                                    </Typography>
                                                </Box>

                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{ mb: 1 }}
                                                >
                                                    Lĩnh vực: {record.linhVuc}
                                                </Typography>
                                            </Box>

                                            {/* Content */}
                                            <Typography
                                                variant="body1"
                                                sx={{ mb: 2, fontWeight: 500 }}
                                            >
                                                {record.tenTTHC}
                                            </Typography>

                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ mb: 2 }}
                                            >
                                                Đối tượng: {record.doiTuong || 'Công dân Việt Nam'}
                                            </Typography>

                                            {/* Template Status & Action */}
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    mt: 2,
                                                    pt: 2,
                                                    borderTop: '1px solid #e0e0e0'
                                                }}
                                            >
                                                <Box>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ fontWeight: 'bold', mb: 0.5 }}
                                                    >
                                                        Mẫu đơn:
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                    >
                                                        {record.tenFile ||
                                                            extractTemplateName(record.mauDon) ||
                                                            'Mẫu đơn'}
                                                    </Typography>
                                                </Box>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        gap: 1,
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    {record.isTemplateAvailable ? (
                                                        <>
                                                            <Chip
                                                                label="Có sẵn"
                                                                color="success"
                                                                size="small"
                                                                icon={<CheckCircleIcon />}
                                                            />
                                                            <Button
                                                                variant="contained"
                                                                color="primary"
                                                                size="small"
                                                                onClick={() =>
                                                                    handleTemplateSelect(record)
                                                                }
                                                            >
                                                                Chọn mẫu này
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Chip
                                                                label="Chưa có mẫu"
                                                                color="warning"
                                                                size="small"
                                                                icon={<WarningIcon />}
                                                            />
                                                            <Button
                                                                variant="outlined"
                                                                color="warning"
                                                                size="small"
                                                                disabled
                                                            >
                                                                Không khả dụng
                                                            </Button>
                                                        </>
                                                    )}
                                                </Box>
                                            </Box>
                                        </Paper>
                                    ))
                                ) : (
                                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                                        <Typography
                                            variant="h6"
                                            color="text.secondary"
                                            sx={{ mb: 1 }}
                                        >
                                            Không tìm thấy thủ tục nào
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Thử thay đổi bộ lọc để tìm kiếm mẫu đơn phù hợp
                                        </Typography>
                                    </Paper>
                                )}
                            </Box>
                        </Box>
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
};
