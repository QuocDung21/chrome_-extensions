import React, { useCallback, useEffect, useState } from 'react';

import {
    Folder as FolderIcon,
    FolderOpen as FolderOpenIcon,
    Refresh as RefreshIcon,
    InsertDriveFile as FileIcon,
    Download as DownloadIcon
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
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Paper,
    Snackbar,
    Typography
} from '@mui/material';
import { createLazyFileRoute } from '@tanstack/react-router';

import {
    clearDirectoryHandle,
    getDirectoryHandle,
    storeDirectoryHandle,
    verifyAndRequestPermission
} from '../../db/db';

interface WordFile {
    name: string;
    file: File;
    size: number;
    lastModified: number;
    handle: FileSystemFileHandle;
}

const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
const formatDate = (ts: number) => new Date(ts).toLocaleString('vi-VN');

function LocalTemplateLoaderComponent() {
    const [folderPath, setFolderPath] = useState<string>('');
    const [wordFiles, setWordFiles] = useState<WordFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [isRestoring, setIsRestoring] = useState(true);

    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'info' | 'warning';
    }>({ open: false, message: '', severity: 'info' });

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
                                if (fileNameLower.endsWith('.docx') || fileNameLower.endsWith('.doc')) {
                                    files.push({
                                        name: `${procedureHandle.name}/${file.name}`,
                                        file,
                                        size: file.size,
                                        lastModified: file.lastModified,
                                        handle: fileHandle
                                    });
                                }
                            }
                        }
                    } catch (e) {
                        console.warn(`Thư mục 'docx' không tồn tại trong '${procedureHandle.name}', đang bỏ qua.`);
                    }
                }
            }
            setWordFiles(files.sort((a, b) => a.name.localeCompare(b.name)));
            setFolderPath(handle.name || 'Selected Folder');
            setSnackbar({ open: true, message: `Đã tìm thấy ${files.length} file Word hợp lệ.`, severity: 'success' });
        } catch (error) {
            console.error('Lỗi khi tải file từ thư mục:', error);
            setSnackbar({ open: true, message: 'Không thể tải file từ thư mục đã lưu.', severity: 'error' });
            await clearDirectoryHandle();
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const restoreDirectory = async () => {
            const savedHandle = await getDirectoryHandle();
            if (savedHandle) {
                const hasPermission = await verifyAndRequestPermission(savedHandle);
                if (hasPermission) await loadFilesFromHandle(savedHandle);
                else await clearDirectoryHandle();
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
                    message: 'Trình duyệt không hỗ trợ chọn thư mục. Vui lòng sử dụng Chrome, Edge hoặc Firefox mới nhất.',
                    severity: 'error'
                });
            }
        } catch (error: any) {
            if (error?.name !== 'AbortError') {
                setSnackbar({ open: true, message: 'Không thể truy cập thư mục. Vui lòng thử lại.', severity: 'error' });
            }
        } finally {
            setLoading(false);
        }
    }, [loadFilesFromHandle]);

    const handleDownloadFile = useCallback(async (wordFile: WordFile) => {
        try {
            const file = await wordFile.handle.getFile();
            const blob = new Blob([await file.arrayBuffer()], { type: file.type || 'application/octet-stream' });
            const { saveAs } = await import('file-saver');
            const name = wordFile.name.split('/').pop() || wordFile.name;
            saveAs(blob, name);
            setSnackbar({ open: true, message: `Đã tải: ${name}`, severity: 'success' });
        } catch (error) {
            console.error('❌ Lỗi khi tải file:', error);
            setSnackbar({ open: true, message: 'Không thể tải file', severity: 'error' });
        }
    }, []);

    const handleClearFolder = useCallback(async () => {
        setFolderPath('');
        setWordFiles([]);
        await clearDirectoryHandle();
    }, []);

    return (
        <Box sx={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', p: { xs: 1, sm: 1, md: 1 } }}>
            <Card sx={{ borderRadius: 2, mb: 2 }}>
                <CardHeader
                    title="Chọn thư mục chứa Mẫu (.docx)"
                    subheader="Cấu trúc: <Mã TTHC>/docx/<file.docx>"
                    sx={{ '& .MuiCardHeader-title': { fontWeight: 700 } }}
                />
                <CardContent>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleSelectFolder}
                            startIcon={<FolderOpenIcon />}
                            disabled={loading}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                        >
                            {loading ? 'Đang quét...' : 'Chọn thư mục'}
                        </Button>
                        {folderPath && (
                            <Chip icon={<FolderIcon />} label={`Thư mục: ${folderPath}`} color="primary" variant="outlined" sx={{ fontWeight: 500 }} />
                        )}
                    </Box>
                </CardContent>
            </Card>

            <Card sx={{ borderRadius: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', backdropFilter: 'blur(10px)', background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(255,255,255,0.2)', height: 'calc(100vh - 300px)' }}>
                <CardHeader
                    title={`Danh sách mẫu (${wordFiles.length})`}
                    action={
                        wordFiles.length > 0 && (
                            <Button variant="outlined" size="small" onClick={handleClearFolder} startIcon={<RefreshIcon />}>Xóa lựa chọn</Button>
                        )
                    }
                    sx={{ '& .MuiCardHeader-title': { fontSize: '1.1rem', fontWeight: 600 } }}
                />
                <CardContent sx={{ height: 'calc(100% - 80px)', overflow: 'auto' }}>
                    {loading || isRestoring ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                            <CircularProgress />
                        </Box>
                    ) : wordFiles.length === 0 ? (
                        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2, background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', border: '2px dashed #dee2e6' }}>
                            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                                📂 Chưa chọn thư mục nào
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Vui lòng chọn thư mục chứa các mẫu .docx để hiển thị
                            </Typography>
                        </Paper>
                    ) : (
                        <List>
                            {wordFiles.map(wordFile => (
                                <ListItem key={wordFile.name} disablePadding>
                                    <ListItemButton onClick={() => handleDownloadFile(wordFile)} sx={{ borderRadius: 2, mb: 0.5 }}>
                                        <ListItemIcon>
                                            <FileIcon color="primary" />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={wordFile.name}
                                            secondary={`Kích thước: ${formatFileSize(wordFile.size)} | Cập nhật: ${formatDate(wordFile.lastModified)}`}
                                            primaryTypographyProps={{ fontWeight: 600 }}
                                        />
                                        <DownloadIcon fontSize="small" />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </CardContent>
            </Card>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export const Route = createLazyFileRoute('/local-template-loader/')({
    component: LocalTemplateLoaderComponent
});

