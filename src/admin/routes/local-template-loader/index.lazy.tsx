import React, { useCallback, useEffect, useRef, useState } from 'react';

// --- ICON ---
import {
    Close as CloseIcon,
    Download,
    Edit as EditIcon,
    InsertDriveFile as FileIcon,
    Folder as FolderIcon,
    FolderOpen as FolderOpenIcon,
    Print as PrintIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Paper,
    Snackbar,
    Typography
} from '@mui/material';
// --- SYNCFUSION WORD EDITOR ---
import '@syncfusion/ej2-base/styles/material.css';
import '@syncfusion/ej2-buttons/styles/material.css';
import '@syncfusion/ej2-dropdowns/styles/material.css';
import '@syncfusion/ej2-inputs/styles/material.css';
import '@syncfusion/ej2-lists/styles/material.css';
import '@syncfusion/ej2-navigations/styles/material.css';
import '@syncfusion/ej2-popups/styles/material.css';
import {
    DocumentEditorContainerComponent,
    Print,
    Ribbon,
    SfdtExport,
    Toolbar
} from '@syncfusion/ej2-react-documenteditor';
import '@syncfusion/ej2-react-documenteditor/styles/material.css';
import '@syncfusion/ej2-splitbuttons/styles/material.css';
import { createLazyFileRoute, useNavigate, useRouter } from '@tanstack/react-router';

DocumentEditorContainerComponent.Inject(Toolbar, Ribbon, Print);

// --- CẤU HÌNH ---
const SYNCFUSION_SERVICE_URL =
    'https://services.syncfusion.com/react/production/api/documenteditor/';

// --- TYPE DEFINITIONS ---
interface WordFile {
    name: string;
    file: File;
    size: number;
    lastModified: number;
}

interface EditorState {
    selectedFile: WordFile | null;
    showEditorModal: boolean;
    syncfusionLoading: boolean;
    syncfusionDocumentReady: boolean;
}

// --- COMPONENT CHÍNH ---
function LocalTemplateLoaderComponent() {
    const [folderPath, setFolderPath] = useState<string>('');
    const [wordFiles, setWordFiles] = useState<WordFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [editorState, setEditorState] = useState<EditorState>({
        selectedFile: null,
        showEditorModal: false,
        syncfusionLoading: false,
        syncfusionDocumentReady: false
    });

    // Snackbar state
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'info' | 'warning';
    }>({
        open: false,
        message: '',
        severity: 'info'
    });

    const navigate = useNavigate();
    const { history } = useRouter();
    const sfContainerRef = useRef<DocumentEditorContainerComponent | null>(null);

    // Handle folder selection
    const handleSelectFolder = useCallback(async () => {
        try {
            setLoading(true);

            // Check if the browser supports the File System Access API
            if ('showDirectoryPicker' in window) {
                // Use File System Access API for modern browsers
                const dirHandle = await (window as any).showDirectoryPicker({
                    mode: 'read'
                });

                const files: WordFile[] = [];

                // Iterate through all files in the directory
                for await (const [name, handle] of dirHandle.entries()) {
                    if (handle.kind === 'file') {
                        const file = await handle.getFile();

                        // Check if it's a Word document
                        if (
                            file.name.toLowerCase().endsWith('.docx') ||
                            file.name.toLowerCase().endsWith('.doc')
                        ) {
                            files.push({
                                name: file.name,
                                file: file,
                                size: file.size,
                                lastModified: file.lastModified
                            });
                        }
                    }
                }

                setWordFiles(files.sort((a, b) => a.name.localeCompare(b.name)));
                setFolderPath(dirHandle.name || 'Selected Folder');

                setSnackbar({
                    open: true,
                    message: `Đã tìm thấy ${files.length} file Word trong thư mục`,
                    severity: 'success'
                });
            } else {
                // Fallback for browsers that don't support File System Access API
                setSnackbar({
                    open: true,
                    message:
                        'Trình duyệt không hỗ trợ chọn thư mục. Vui lòng sử dụng Chrome, Edge hoặc Firefox mới nhất.',
                    severity: 'error'
                });
            }
        } catch (error: any) {
            console.error('Error selecting folder:', error);
            if (error.name !== 'AbortError') {
                setSnackbar({
                    open: true,
                    message: 'Không thể truy cập thư mục. Vui lòng thử lại.',
                    severity: 'error'
                });
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Handle fallback folder selection using input
    const handleFallbackFolderSelect = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files;
            if (!files || files.length === 0) return;

            setLoading(true);
            try {
                const wordFiles: WordFile[] = [];

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    if (
                        file.name.toLowerCase().endsWith('.docx') ||
                        file.name.toLowerCase().endsWith('.doc')
                    ) {
                        wordFiles.push({
                            name: file.name,
                            file: file,
                            size: file.size,
                            lastModified: file.lastModified
                        });
                    }
                }

                setWordFiles(wordFiles.sort((a, b) => a.name.localeCompare(b.name)));
                setFolderPath('Selected Folder');

                setSnackbar({
                    open: true,
                    message: `Đã tìm thấy ${wordFiles.length} file Word`,
                    severity: 'success'
                });
            } catch (error) {
                console.error('Error processing files:', error);
                setSnackbar({
                    open: true,
                    message: 'Lỗi khi xử lý file. Vui lòng thử lại.',
                    severity: 'error'
                });
            } finally {
                setLoading(false);
            }
        },
        []
    );

    // Handle file selection
    const handleSelectFile = useCallback(async (wordFile: WordFile) => {
        console.log('🎯 File selected:', wordFile.name);

        setEditorState(prev => ({
            ...prev,
            selectedFile: wordFile,
            showEditorModal: true,
            syncfusionLoading: true,
            syncfusionDocumentReady: false
        }));

        setSnackbar({
            open: true,
            message: `Đang tải file: ${wordFile.name}`,
            severity: 'info'
        });
    }, []);

    // Load file into Syncfusion editor
    const loadFileIntoSyncfusion = useCallback(async (wordFile: WordFile) => {
        console.log('🔄 Starting file load process for:', wordFile.name);

        // Wait for Syncfusion to be ready
        const waitForSyncfusion = async (maxRetries = 10): Promise<boolean> => {
            for (let i = 0; i < maxRetries; i++) {
                if (sfContainerRef.current?.documentEditor) {
                    console.log('✅ Syncfusion editor found, proceeding...');
                    return true;
                }
                console.log(`⏳ Waiting for Syncfusion editor (attempt ${i + 1}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            return false;
        };

        const isReady = await waitForSyncfusion();
        if (!isReady) {
            console.error('❌ Syncfusion editor not ready after waiting');
            setEditorState(prev => ({
                ...prev,
                syncfusionLoading: false,
                syncfusionDocumentReady: false
            }));
            setSnackbar({
                open: true,
                message: 'Syncfusion editor không sẵn sàng. Vui lòng thử lại.',
                severity: 'error'
            });
            return;
        }

        try {
            console.log('🔄 Loading file into Syncfusion...');

            const blob = wordFile.file;
            console.log('📦 File blob size:', blob.size, 'bytes');

            const form = new FormData();
            form.append('files', blob, wordFile.name);

            console.log('🔄 Converting DOCX to SFDT...');
            console.log('🌐 Syncfusion service URL:', SYNCFUSION_SERVICE_URL + 'Import');

            const importRes = await fetch(`${SYNCFUSION_SERVICE_URL}Import`, {
                method: 'POST',
                body: form
            });

            if (!importRes.ok) {
                console.error(
                    '❌ Syncfusion import failed:',
                    importRes.status,
                    importRes.statusText
                );
                throw new Error(`Lỗi khi import file: ${importRes.status} ${importRes.statusText}`);
            }

            const sfdtText = await importRes.text();
            console.log('✅ SFDT conversion completed, length:', sfdtText.length);

            if (!sfdtText || sfdtText.length < 100) {
                throw new Error('SFDT conversion returned invalid data');
            }

            console.log('🔄 Opening document in Syncfusion editor...');
            sfContainerRef.current!.documentEditor.open(sfdtText);

            // Wait for document to be fully loaded
            setTimeout(() => {
                try {
                    const testSfdt = sfContainerRef.current?.documentEditor?.serialize();
                    if (testSfdt && testSfdt.length > 100) {
                        setEditorState(prev => ({
                            ...prev,
                            syncfusionDocumentReady: true,
                            syncfusionLoading: false
                        }));
                        console.log('✅ Syncfusion document ready');

                        setSnackbar({
                            open: true,
                            message: `Đã tải thành công: ${wordFile.name}`,
                            severity: 'success'
                        });
                    } else {
                        throw new Error('Document not properly loaded');
                    }
                } catch (error) {
                    console.warn('⚠️ Error checking document readiness:', error);
                    // Still mark as ready to allow user interaction
                    setEditorState(prev => ({
                        ...prev,
                        syncfusionDocumentReady: true,
                        syncfusionLoading: false
                    }));
                }
            }, 2000);
        } catch (e: any) {
            console.error('❌ Error loading Syncfusion document:', e);
            setEditorState(prev => ({
                ...prev,
                syncfusionLoading: false,
                syncfusionDocumentReady: false
            }));
            setSnackbar({
                open: true,
                message: e?.message || 'Không thể mở tài liệu trong Syncfusion',
                severity: 'error'
            });
        }
    }, []);

    // Handle editor close
    const handleCloseEditor = useCallback(() => {
        setEditorState({
            selectedFile: null,
            showEditorModal: false,
            syncfusionLoading: false,
            syncfusionDocumentReady: false
        });
    }, []);

    // Handle print
    const handlePrintClick = async () => {
        if (sfContainerRef.current && sfContainerRef.current.documentEditor) {
            await sfContainerRef.current.documentEditor.print(window);
            await window.print();
            await history.back();
            await navigate({
                to: '/local-template-loader'
            });
            window.location.reload();
        } else {
            console.error('Document editor not ready to print.');
        }
    };

    // Handle download
    const handleDownloadClick = () => {
        if (sfContainerRef.current && sfContainerRef.current.documentEditor) {
            const fileName = editorState.selectedFile?.name || 'Document.docx';
            sfContainerRef.current.documentEditor.save(fileName, 'Docx');
        } else {
            console.error('Document editor not ready to download.');
        }
    };

    const handleSnackbarClose = useCallback(() => {
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);

    // Format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Format last modified date
    const formatDate = (timestamp: number): string => {
        return new Date(timestamp).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Load file when editor modal opens
    useEffect(() => {
        if (editorState.showEditorModal && editorState.selectedFile) {
            console.log('🚀 Triggering file load for:', editorState.selectedFile.name);
            loadFileIntoSyncfusion(editorState.selectedFile);
        }
    }, [editorState.showEditorModal, editorState.selectedFile, loadFileIntoSyncfusion]);

    return (
        <>
            <Box
                sx={{
                    width: '100%',
                    minHeight: '100vh',
                    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                    p: { xs: 1, sm: 2, md: 3 }
                }}
            >
                {/* Header */}
                <Card
                    sx={{
                        mb: 3,
                        borderRadius: 2,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        backdropFilter: 'blur(10px)',
                        background: 'rgba(255,255,255,0.9)',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}
                >
                    <CardHeader
                        title="📁 Tải mẫu đơn từ thư mục"
                        subheader="Chọn thư mục chứa file Word mẫu từ máy tính của bạn"
                        sx={{
                            '& .MuiCardHeader-title': {
                                fontSize: '1.5rem',
                                fontWeight: 700,
                                background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }
                        }}
                    />
                    <CardContent>
                        <Box
                            sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}
                        >
                            <Button
                                variant="contained"
                                size="large"
                                onClick={handleSelectFolder}
                                startIcon={<FolderOpenIcon />}
                                disabled={loading}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                                    '&:hover': {
                                        background: 'linear-gradient(45deg, #1565c0, #1976d2)',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(25,118,210,0.3)'
                                    },
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {loading ? 'Đang tải...' : 'Chọn thư mục'}
                            </Button>

                            {/* Fallback input for browsers that don't support File System Access API */}
                            <input
                                type="file"
                                multiple
                                onChange={handleFallbackFolderSelect}
                                style={{ display: 'none' }}
                                id="fallback-folder-input"
                            />
                            <Button
                                variant="outlined"
                                size="large"
                                onClick={() =>
                                    document.getElementById('fallback-folder-input')?.click()
                                }
                                startIcon={<FolderIcon />}
                                disabled={loading}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 600
                                }}
                            >
                                Chọn thư mục (Phương án 2)
                            </Button>

                            {folderPath && (
                                <Chip
                                    icon={<FolderIcon />}
                                    label={`Thư mục: ${folderPath}`}
                                    color="primary"
                                    variant="outlined"
                                    sx={{ fontWeight: 500 }}
                                />
                            )}
                        </Box>
                    </CardContent>
                </Card>

                {/* File List */}
                <Card
                    sx={{
                        borderRadius: 2,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        backdropFilter: 'blur(10px)',
                        background: 'rgba(255,255,255,0.95)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        height: 'calc(100vh - 300px)'
                    }}
                >
                    <CardHeader
                        title={`Danh sách file Word (${wordFiles.length})`}
                        action={
                            wordFiles.length > 0 && (
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => {
                                        setWordFiles([]);
                                        setFolderPath('');
                                    }}
                                    startIcon={<RefreshIcon />}
                                >
                                    Làm mới
                                </Button>
                            )
                        }
                        sx={{
                            '& .MuiCardHeader-title': {
                                fontSize: '1.1rem',
                                fontWeight: 600
                            }
                        }}
                    />
                    <CardContent sx={{ height: 'calc(100% - 80px)', overflow: 'auto' }}>
                        {loading ? (
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    height: '200px'
                                }}
                            >
                                <CircularProgress />
                                <Typography sx={{ ml: 2 }}>Đang quét thư mục...</Typography>
                            </Box>
                        ) : wordFiles.length === 0 ? (
                            <Paper
                                sx={{
                                    p: 6,
                                    textAlign: 'center',
                                    borderRadius: 2,
                                    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                                    border: '2px dashed #dee2e6'
                                }}
                            >
                                <Typography
                                    variant="h1"
                                    sx={{ fontSize: '4rem', opacity: 0.7, mb: 2 }}
                                >
                                    📁
                                </Typography>
                                <Typography
                                    variant="h5"
                                    color="text.secondary"
                                    sx={{ mb: 2, fontWeight: 600 }}
                                >
                                    Chưa chọn thư mục
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    Vui lòng chọn thư mục chứa các file Word mẫu để bắt đầu
                                </Typography>
                            </Paper>
                        ) : (
                            <List sx={{ width: '100%' }}>
                                {wordFiles.map((wordFile, index) => (
                                    <ListItem key={index} disablePadding>
                                        <ListItemButton
                                            onClick={() => handleSelectFile(wordFile)}
                                            sx={{
                                                mb: 1,
                                                borderRadius: 2,
                                                border: '1px solid rgba(0,0,0,0.1)',
                                                '&:hover': {
                                                    backgroundColor: 'primary.light',
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 4px 12px rgba(25,118,210,0.15)'
                                                },
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            <ListItemIcon>
                                                <FileIcon color="primary" />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    <Typography
                                                        variant="body1"
                                                        sx={{ fontWeight: 600 }}
                                                    >
                                                        {wordFile.name}
                                                    </Typography>
                                                }
                                                secondary={
                                                    <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                        >
                                                            📏 {formatFileSize(wordFile.size)}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                        >
                                                            📅 {formatDate(wordFile.lastModified)}
                                                        </Typography>
                                                    </Box>
                                                }
                                            />
                                            <Button
                                                variant="contained"
                                                size="small"
                                                startIcon={<EditIcon />}
                                                sx={{
                                                    borderRadius: 1,
                                                    textTransform: 'none',
                                                    fontWeight: 600,
                                                    background:
                                                        'linear-gradient(45deg, #1976d2, #42a5f5)'
                                                }}
                                            >
                                                Mở
                                            </Button>
                                        </ListItemButton>
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </CardContent>
                </Card>

                {/* Syncfusion Editor Modal */}
                <Dialog
                    open={editorState.showEditorModal}
                    onClose={handleCloseEditor}
                    fullWidth
                    sx={{
                        '& .MuiDialog-paper': {
                            width: { xs: '100vw', sm: '100vw' },
                            height: { xs: '100vh', sm: '100vh' },
                            maxHeight: { xs: '100vh', sm: '100vh' },
                            maxWidth: { xs: '100vw', sm: '100vw' },
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                            boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
                            overflow: 'hidden',
                            margin: { xs: 0, sm: 'auto' }
                        },
                        '& .MuiBackdrop-root': {
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            backdropFilter: 'blur(4px)'
                        }
                    }}
                >
                    <DialogTitle sx={{ padding: 0, margin: 0 }}>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingRight: 2,
                                paddingLeft: 2
                            }}
                        >
                            <Typography sx={{ paddingLeft: 2 }} fontWeight={'bold'}>
                                📄 {editorState.selectedFile?.name || 'Word Editor'}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Button
                                    variant="outlined"
                                    onClick={handleDownloadClick}
                                    startIcon={<Download />}
                                    disabled={!editorState.syncfusionDocumentReady}
                                    sx={{
                                        borderRadius: 1,
                                        textTransform: 'none',
                                        fontWeight: 600
                                    }}
                                >
                                    Tải xuống
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={handlePrintClick}
                                    startIcon={<PrintIcon />}
                                    disabled={!editorState.syncfusionDocumentReady}
                                    sx={{
                                        borderRadius: 1,
                                        textTransform: 'none',
                                        fontWeight: 600
                                    }}
                                >
                                    In
                                </Button>
                                <IconButton onClick={handleCloseEditor}>
                                    <CloseIcon style={{ fontSize: 24 }} />
                                </IconButton>
                            </Box>
                        </Box>
                    </DialogTitle>
                    <DialogContent sx={{ p: 1, height: 'calc(100% - 120px)' }}>
                        <Card
                            sx={{
                                position: 'relative',
                                height: '100%',
                                width: '100%',
                                borderRadius: 2,
                                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                                background: 'rgba(255,255,255,0.95)',
                                overflow: 'hidden'
                            }}
                        >
                            <CardContent sx={{ height: '100%', position: 'relative' }}>
                                {editorState.syncfusionLoading && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 1000,
                                            flexDirection: 'column',
                                            gap: 2
                                        }}
                                    >
                                        <CircularProgress />
                                        <Typography variant="body2" color="text.secondary">
                                            Đang tải tài liệu...
                                        </Typography>
                                    </Box>
                                )}

                                <DocumentEditorContainerComponent
                                    id="sf-docx-editor-local"
                                    ref={sfContainerRef}
                                    serviceUrl={SYNCFUSION_SERVICE_URL}
                                    enableToolbar={true}
                                    showPropertiesPane={false}
                                    height={'100%'}
                                    fileMenuItems={['Print']}
                                    enableLocalPaste={true}
                                />
                            </CardContent>
                        </Card>
                    </DialogContent>
                </Dialog>

                {/* Snackbar for notifications */}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={4000}
                    onClose={handleSnackbarClose}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                    <Alert
                        onClose={handleSnackbarClose}
                        severity={snackbar.severity}
                        sx={{ width: '100%' }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </>
    );
}

export const Route = createLazyFileRoute('/local-template-loader/')({
    component: LocalTemplateLoaderComponent
});
