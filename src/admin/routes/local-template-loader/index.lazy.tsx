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
    Refresh as RefreshIcon,
    Save as SaveIcon
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
    Toolbar
} from '@syncfusion/ej2-react-documenteditor';
import '@syncfusion/ej2-react-documenteditor/styles/material.css';
import '@syncfusion/ej2-splitbuttons/styles/material.css';
import { createLazyFileRoute, useNavigate, useRouter } from '@tanstack/react-router';

// --- IDB UTILS ---
import {
    clearDirectoryHandle,
    getDirectoryHandle,
    storeDirectoryHandle,
    verifyAndRequestPermission
} from '../../db/db_local';

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
    handle: FileSystemFileHandle;
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
    const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
    const [isRestoring, setIsRestoring] = useState(true);
    const [editorState, setEditorState] = useState<EditorState>({
        selectedFile: null,
        showEditorModal: false,
        syncfusionLoading: false,
        syncfusionDocumentReady: false
    });

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

    const loadFilesFromHandle = useCallback(async (handle: FileSystemDirectoryHandle) => {
        setLoading(true);
        try {
            const files: WordFile[] = [];
            for await (const procedureHandle of handle.values()) {
                if (procedureHandle.kind === 'directory') {
                    try {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-expect-error
                        const docxFolderHandle = await procedureHandle.getDirectoryHandle('docx');
                        for await (const fileHandle of docxFolderHandle.values()) {
                            if (fileHandle.kind === 'file') {
                                const file = await fileHandle.getFile();
                                const fileNameLower = file.name.toLowerCase();
                                if (
                                    fileNameLower.endsWith('.docx') ||
                                    fileNameLower.endsWith('.doc')
                                ) {
                                    files.push({
                                        name: `${procedureHandle.name}/${file.name}`,
                                        file: file,
                                        size: file.size,
                                        lastModified: file.lastModified,
                                        handle: fileHandle
                                    });
                                }
                            }
                        }
                    } catch (e) {
                        console.warn(
                            `Thư mục 'docx' không tồn tại trong '${procedureHandle.name}', đang bỏ qua.`
                        );
                    }
                }
            }
            setWordFiles(files.sort((a, b) => a.name.localeCompare(b.name)));
            setFolderPath(handle.name || 'Selected Folder');
            setDirHandle(handle);
            setSnackbar({
                open: true,
                message: `Đã tìm thấy ${files.length} file Word hợp lệ.`,
                severity: 'success'
            });
        } catch (error) {
            console.error('Lỗi khi tải file từ thư mục:', error);
            setSnackbar({
                open: true,
                message: 'Không thể tải file từ thư mục đã lưu.',
                severity: 'error'
            });
            await clearDirectoryHandle();
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const restoreDirectory = async () => {
            const savedHandle = await getDirectoryHandle();
            if (savedHandle) {
                console.log('✅ Tìm thấy thư mục đã lưu. Đang xác minh quyền...');
                const hasPermission = await verifyAndRequestPermission(savedHandle);
                if (hasPermission) {
                    await loadFilesFromHandle(savedHandle);
                } else {
                    setSnackbar({
                        open: true,
                        message: 'Bạn đã từ chối quyền truy cập thư mục đã lưu.',
                        severity: 'warning'
                    });
                    await clearDirectoryHandle();
                }
            } else {
                console.log('ℹ️ Không tìm thấy thư mục nào đã lưu.');
            }
            setIsRestoring(false);
        };
        restoreDirectory();
    }, [loadFilesFromHandle]);

    const handleSelectFolder = useCallback(async () => {
        try {
            setLoading(true);
            if ('showDirectoryPicker' in window) {
                const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
                await loadFilesFromHandle(dirHandle);
                await storeDirectoryHandle(dirHandle);
            } else {
                setSnackbar({
                    open: true,
                    message:
                        'Trình duyệt không hỗ trợ chọn thư mục. Vui lòng sử dụng Chrome, Edge hoặc Firefox mới nhất.',
                    severity: 'error'
                });
            }
        } catch (error: any) {
            console.error('Lỗi khi chọn thư mục:', error);
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
    }, [loadFilesFromHandle]);

    const handleFallbackFolderSelect = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files;
            if (!files || files.length === 0) return;
            setSnackbar({
                open: true,
                message:
                    'Phương án 2 không hỗ trợ cấu trúc thư mục con. Vui lòng dùng "Chọn thư mục".',
                severity: 'warning'
            });
        },
        []
    );

    const handleSelectFile = useCallback(async (wordFile: WordFile) => {
        console.log('🎯 Đã chọn file:', wordFile.name);
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

    const loadFileIntoSyncfusion = useCallback(async (wordFile: WordFile) => {
        console.log('🔄 Bắt đầu quá trình tải file:', wordFile.name);
        const waitForSyncfusion = async (maxRetries = 10): Promise<boolean> => {
            for (let i = 0; i < maxRetries; i++) {
                if (sfContainerRef.current?.documentEditor) {
                    console.log('✅ Syncfusion editor đã sẵn sàng.');
                    return true;
                }
                console.log(`⏳ Đợi Syncfusion editor (lần ${i + 1}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            return false;
        };
        const isReady = await waitForSyncfusion();
        if (!isReady) {
            console.error('❌ Syncfusion editor không sẵn sàng sau khi chờ.');
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
            console.log('🔄 Đang tải file vào Syncfusion...');
            const blob = wordFile.file;
            const form = new FormData();
            form.append('files', blob, wordFile.name);
            const importRes = await fetch(`${SYNCFUSION_SERVICE_URL}Import`, {
                method: 'POST',
                body: form
            });
            if (!importRes.ok) {
                throw new Error(`Lỗi khi import file: ${importRes.status} ${importRes.statusText}`);
            }
            const sfdtText = await importRes.text();
            if (!sfdtText || sfdtText.length < 100) {
                throw new Error('Dữ liệu chuyển đổi (SFDT) không hợp lệ.');
            }
            sfContainerRef.current!.documentEditor.open(sfdtText);
            setTimeout(() => {
                try {
                    const testSfdt = sfContainerRef.current?.documentEditor?.serialize();
                    if (testSfdt && testSfdt.length > 100) {
                        setEditorState(prev => ({
                            ...prev,
                            syncfusionDocumentReady: true,
                            syncfusionLoading: false
                        }));
                        console.log('✅ Tài liệu Syncfusion đã sẵn sàng.');
                        setSnackbar({
                            open: true,
                            message: `Đã tải thành công: ${wordFile.name}`,
                            severity: 'success'
                        });
                    } else {
                        throw new Error('Tài liệu không được tải đúng cách.');
                    }
                } catch (error) {
                    console.warn('⚠️ Lỗi khi kiểm tra tài liệu sẵn sàng:', error);
                    setEditorState(prev => ({
                        ...prev,
                        syncfusionDocumentReady: true,
                        syncfusionLoading: false
                    }));
                }
            }, 2000);
        } catch (e: any) {
            console.error('❌ Lỗi khi tải tài liệu Syncfusion:', e);
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

    const handleCloseEditor = useCallback(() => {
        setEditorState({
            selectedFile: null,
            showEditorModal: false,
            syncfusionLoading: false,
            syncfusionDocumentReady: false
        });
    }, []);

    const handlePrintClick = async () => {
        if (sfContainerRef.current?.documentEditor) {
            sfContainerRef.current.documentEditor.print();
        } else {
            console.error('Trình soạn thảo chưa sẵn sàng để in.');
        }
    };

    const handleDownloadClick = () => {
        if (sfContainerRef.current?.documentEditor) {
            const fileName = editorState.selectedFile?.name.split('/').pop() || 'Document.docx';
            sfContainerRef.current.documentEditor.save(fileName, 'Docx');
        } else {
            console.error('Trình soạn thảo chưa sẵn sàng để tải xuống.');
        }
    };

    // [THAY ĐỔI] Cập nhật logic lưu file để làm mới đối tượng File trong state
    const handleSaveFile = async () => {
        if (!sfContainerRef.current?.documentEditor || !editorState.selectedFile) {
            setSnackbar({
                open: true,
                message: 'Trình soạn thảo chưa sẵn sàng để lưu.',
                severity: 'error'
            });
            return;
        }

        const { handle: fileHandle, name: displayName } = editorState.selectedFile;

        try {
            setSnackbar({ open: true, message: 'Đang lưu file...', severity: 'info' });

            const docxBlob = await sfContainerRef.current.documentEditor.saveAsBlob('Docx');
            const writable = await fileHandle.createWritable();
            await writable.write(docxBlob);
            await writable.close();

            setSnackbar({
                open: true,
                message: `Đã lưu file thành công: ${displayName}`,
                severity: 'success'
            });

            // --- PHẦN SỬA LỖI ---
            // Sau khi lưu thành công, đọc lại file từ đĩa để lấy phiên bản mới nhất
            const updatedFileObject = await fileHandle.getFile();

            // Cập nhật lại danh sách file trong state với đối tượng File mới
            setWordFiles(prevFiles =>
                prevFiles.map(wf =>
                    wf.name === displayName
                        ? {
                              ...wf,
                              file: updatedFileObject, // <-- CẬP NHẬT FILE MỚI
                              size: updatedFileObject.size,
                              lastModified: updatedFileObject.lastModified
                          }
                        : wf
                )
            );
            // --- KẾT THÚC PHẦN SỬA LỖI ---
        } catch (error) {
            console.error('Lỗi khi lưu file:', error);
            setSnackbar({
                open: true,
                message: 'Lỗi khi lưu file. Vui lòng thử lại.',
                severity: 'error'
            });
        }
    };

    const handleClearFolder = useCallback(async () => {
        setWordFiles([]);
        setFolderPath('');
        setDirHandle(null);
        await clearDirectoryHandle();
        setSnackbar({ open: true, message: 'Đã xóa lựa chọn thư mục.', severity: 'info' });
    }, []);

    const handleSnackbarClose = useCallback(() => {
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (timestamp: number): string => {
        return new Date(timestamp).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    useEffect(() => {
        if (editorState.showEditorModal && editorState.selectedFile) {
            loadFileIntoSyncfusion(editorState.selectedFile);
        }
    }, [editorState.showEditorModal, editorState.selectedFile, loadFileIntoSyncfusion]);

    if (isRestoring) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh'
                }}
            >
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Đang kiểm tra thư mục đã lưu...</Typography>
            </Box>
        );
    }

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
                        title="Đồng bộ dữ liệu"
                        subheader="Chọn thư mục chứa các mẫu theo cấu trúc [Mã TTHC]/docx/[Tên file]"
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
                                {loading ? 'Đang quét...' : 'Chọn thư mục'}
                            </Button>
                            <input
                                type="file"
                                multiple
                                style={{ display: 'none' }}
                                id="fallback-folder-input"
                                onChange={handleFallbackFolderSelect}
                            />
                            {/* <Button
                                variant="outlined"
                                size="large"
                                onClick={() =>
                                    document.getElementById('fallback-folder-input')?.click()
                                }
                                startIcon={<FolderIcon />}
                                disabled={loading}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                                title="Phương án 2 không hỗ trợ cấu trúc thư mục con"
                            >
                                Chọn thư mục (Phương án 2)
                            </Button> */}
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
                        title={`Danh sách mẫu (${wordFiles.length})`}
                        action={
                            wordFiles.length > 0 && (
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={handleClearFolder}
                                    startIcon={<RefreshIcon />}
                                >
                                    Xóa lựa chọn
                                </Button>
                            )
                        }
                        sx={{ '& .MuiCardHeader-title': { fontSize: '1.1rem', fontWeight: 600 } }}
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
                                {wordFiles.map(wordFile => (
                                    <ListItem key={wordFile.name} disablePadding>
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
                            <Typography sx={{ paddingLeft: 2, fontWeight: 'bold' }}>
                                📄 {editorState.selectedFile?.name || 'Word Editor'}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Button
                                    variant="contained"
                                    onClick={handleSaveFile}
                                    startIcon={<SaveIcon />}
                                    disabled={!editorState.syncfusionDocumentReady}
                                    sx={{
                                        borderRadius: 1,
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        background: 'linear-gradient(45deg, #2e7d32, #4caf50)',
                                        '&:hover': {
                                            background: 'linear-gradient(45deg, #1b5e20, #2e7d32)'
                                        }
                                    }}
                                >
                                    Lưu file
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={handleDownloadClick}
                                    startIcon={<Download />}
                                    disabled={!editorState.syncfusionDocumentReady}
                                    sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
                                >
                                    Tải xuống
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={handlePrintClick}
                                    startIcon={<PrintIcon />}
                                    disabled={!editorState.syncfusionDocumentReady}
                                    sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
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
