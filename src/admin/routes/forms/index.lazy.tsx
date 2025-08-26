import { useEffect, useRef, useState } from 'react';

// --- Imports từ các thư viện ---
// Material-UI Components & Icons
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';
import {
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    CircularProgress,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Modal,
    Paper,
    Typography
} from '@mui/material';
// Syncfusion CSS
import '@syncfusion/ej2-base/styles/material.css';
import '@syncfusion/ej2-buttons/styles/material.css';
import '@syncfusion/ej2-dropdowns/styles/material.css';
import '@syncfusion/ej2-inputs/styles/material.css';
import '@syncfusion/ej2-lists/styles/material.css';
import '@syncfusion/ej2-navigations/styles/material.css';
import '@syncfusion/ej2-popups/styles/material.css';
// Syncfusion Components & Modules
import {
    DocumentEditorContainerComponent,
    Print,
    SfdtExport,
    Toolbar
} from '@syncfusion/ej2-react-documenteditor';
import '@syncfusion/ej2-react-documenteditor/styles/material.css';
import '@syncfusion/ej2-splitbuttons/styles/material.css';
// TanStack Router
import { createLazyFileRoute } from '@tanstack/react-router';

// --- Helper Functions for IndexedDB ---
// Các hàm này quản lý việc lưu và lấy quyền truy cập thư mục (folderHandle)
const DB_NAME = 'WebAppStorage';
const STORE_NAME = 'fileSystemHandles';

function getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = () => reject('Lỗi khi mở IndexedDB');
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = event => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

async function saveFolderHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    store.put(handle, 'syncFolderHandle');
    await tx.done;
}

async function getFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get('syncFolderHandle');
    return new Promise(resolve => {
        request.onsuccess = () => resolve(request.result || null);
    });
}

// --- Cấu hình và Dữ liệu mẫu ---
const SERVER_BASE_URL = 'http://laptrinhid.qlns.vn'; // Thay thế bằng URL server của bạn
const SYNCFUSION_SERVICE_URL =
    'https://ej2services.syncfusion.com/production/web-services/api/documenteditor/';
const serverResponse = {
    success: true,
    data: [
        '/uploads/files/18.TKyeucaubansaotrichluchotich5eb55ed7-e7fa-4609-80c2-5d665d60887c.docx'
    ]
};

// Kích hoạt các module cần thiết cho Syncfusion Document Editor
DocumentEditorContainerComponent.Inject(Print, SfdtExport, Toolbar);

// --- Component Chính: SyncPage ---
function SyncPage() {
    // State quản lý quyền truy cập thư mục
    const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);
    // State quản lý giao diện (trạng thái, loading, danh sách file)
    const [status, setStatus] = useState('Sẵn sàng khởi tạo...');
    const [isLoading, setIsLoading] = useState(false);
    const [fileList, setFileList] = useState<string[]>([]);
    // State cho Modal Editor
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingFile, setEditingFile] = useState<string | null>(null);
    const sfContainerRef = useRef<DocumentEditorContainerComponent>(null);

    // Effect chạy lần đầu để kiểm tra quyền truy cập đã được lưu chưa
    useEffect(() => {
        getFolderHandle().then(handle => {
            if (handle) {
                setFolderHandle(handle);
                setStatus('Đã tìm thấy thư mục đồng bộ. Sẵn sàng hoạt động.');
            } else {
                setStatus('Chào mừng! Vui lòng chọn một thư mục để bắt đầu.');
            }
        });
    }, []);

    // --- Các hàm xử lý sự kiện ---

    // 1. CHỌN THƯ MỤC
    const handleChooseFolder = async () => {
        try {
            const handle = await (window as any).showDirectoryPicker();
            await saveFolderHandle(handle);
            setFolderHandle(handle);
            setFileList([]);
            setStatus('Đã chọn thư mục thành công!');
        } catch (err) {
            console.error('Người dùng đã hủy hoặc có lỗi:', err);
            setStatus('Bạn đã hủy thao tác chọn thư mục.');
        }
    };

    // 2. ĐỒNG BỘ FILE TỪ SERVER
    const handleSyncFile = async () => {
        if (!folderHandle) return;
        setIsLoading(true);
        setStatus('Đang xử lý...');
        try {
            const relativePath = serverResponse.data[0];
            const downloadUrl = `${SERVER_BASE_URL}${relativePath}`;
            const fileName = relativePath.split('/').pop();
            if (!fileName) throw new Error('Không thể lấy tên file.');

            setStatus(`Đang tải file: ${fileName}...`);
            const response = await fetch(downloadUrl);
            if (!response.ok) throw new Error(`Lỗi tải file: ${response.statusText}`);
            const fileBlob = await response.blob();

            setStatus(`Đang ghi file vào thư mục của bạn...`);
            const fileHandle = await folderHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(fileBlob);
            await writable.close();

            setStatus(`Đồng bộ thành công file: ${fileName}`);
            alert(`Đã đồng bộ thành công file "${fileName}"!`);
        } catch (error: any) {
            handleError(error, 'đồng bộ');
        } finally {
            setIsLoading(false);
        }
    };

    // 3. QUÉT CÁC FILE TRONG THƯ MỤC
    const handleListFiles = async () => {
        if (!folderHandle) return;
        setIsLoading(true);
        setStatus('Đang quét các file...');
        try {
            const files: string[] = [];
            for await (const entry of folderHandle.values()) {
                if (
                    entry.kind === 'file' &&
                    (entry.name.endsWith('.docx') || entry.name.endsWith('.doc'))
                ) {
                    files.push(entry.name);
                }
            }
            setFileList(files);
            setStatus(`Tìm thấy ${files.length} file.`);
        } catch (error: any) {
            handleError(error, 'quét file');
        } finally {
            setIsLoading(false);
        }
    };

    // 4. MỞ FILE TRONG EDITOR
    const handleOpenFileInEditor = async (fileName: string) => {
        if (!folderHandle) return;
        setIsLoading(true);
        setStatus(`Đang mở file: ${fileName}...`);
        try {
            const fileHandle = await folderHandle.getFileHandle(fileName);
            const file = await fileHandle.getFile();

            const formData = new FormData();
            formData.append('file', file, file.name);

            setStatus(`Đang chuyển đổi file...`);
            const response = await fetch(`${SYNCFUSION_SERVICE_URL}Import`, {
                method: 'POST',
                body: formData
            });
            if (!response.ok) throw new Error('Lỗi khi chuyển đổi file.');
            const sfdtJson = await response.json();

            setEditingFile(fileName);
            sfContainerRef.current?.documentEditor.open(sfdtJson.sfdt);
            setIsEditorOpen(true);
            setStatus(`Đã mở file ${fileName}.`);
        } catch (error: any) {
            handleError(error, 'mở file');
        } finally {
            setIsLoading(false);
        }
    };

    // 5. LƯU THAY ĐỔI TỪ EDITOR
    const handleSaveChanges = async () => {
        if (!sfContainerRef.current || !folderHandle || !editingFile) return;
        setIsLoading(true);
        setStatus(`Đang lưu thay đổi cho file: ${editingFile}...`);
        try {
            const blob: Blob = await sfContainerRef.current.documentEditor.saveAsBlob('Docx');
            const fileHandle = await folderHandle.getFileHandle(editingFile, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();

            setStatus(`Đã lưu thành công file: ${editingFile}`);
            alert(`Đã lưu thành công file: ${editingFile}`);
            handleCloseEditor();
        } catch (error: any) {
            handleError(error, 'lưu file');
        } finally {
            setIsLoading(false);
        }
    };

    // 6. ĐÓNG EDITOR
    const handleCloseEditor = () => {
        setIsEditorOpen(false);
        setEditingFile(null);
    };

    // 7. HÀM XỬ LÝ LỖI CHUNG
    const handleError = (error: any, action: string) => {
        console.error(`Lỗi trong quá trình ${action}:`, error);
        const message = `Thao tác ${action} thất bại: ${error.message}`;
        setStatus(message);
        alert(message);
    };

    return (
        <Box sx={{ p: 4, bgcolor: '#f0f2f5', minHeight: '100vh' }}>
            <Card sx={{ maxWidth: 800, margin: 'auto', boxShadow: 3 }}>
                <CardContent>
                    <Typography variant="h5" component="div" gutterBottom>
                        Trình Quản lý & Đồng bộ File
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ minHeight: 20 }}>
                        Trạng thái: {status}
                    </Typography>
                </CardContent>
                <CardActions
                    sx={{ justifyContent: 'center', p: 2, gap: 1, borderTop: '1px solid #eee' }}
                >
                    {isLoading ? (
                        <CircularProgress />
                    ) : !folderHandle ? (
                        <Button variant="contained" onClick={handleChooseFolder}>
                            Chọn thư mục làm việc
                        </Button>
                    ) : (
                        <>
                            <Button variant="contained" color="primary" onClick={handleSyncFile}>
                                Đồng bộ File Test
                            </Button>
                            <Button variant="outlined" color="secondary" onClick={handleListFiles}>
                                Quét các file
                            </Button>
                        </>
                    )}
                </CardActions>

                {fileList.length > 0 && (
                    <>
                        <Divider sx={{ my: 1 }} />
                        <CardContent>
                            <Typography variant="h6">Các file trong thư mục</Typography>
                            <List>
                                {fileList.map(fileName => (
                                    <ListItem
                                        key={fileName}
                                        secondaryAction={
                                            <Button
                                                edge="end"
                                                onClick={() => handleOpenFileInEditor(fileName)}
                                                disabled={isLoading}
                                            >
                                                Xem / Sửa
                                            </Button>
                                        }
                                    >
                                        <IconButton edge="start" color="primary">
                                            <DescriptionIcon />
                                        </IconButton>
                                        <ListItemText primary={fileName} />
                                    </ListItem>
                                ))}
                            </List>
                        </CardContent>
                    </>
                )}
            </Card>

            <Modal open={isEditorOpen} onClose={handleCloseEditor}>
                <Paper
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '95vw',
                        height: '95vh',
                        boxShadow: 24,
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <Box
                        sx={{
                            p: 1,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            bgcolor: '#f5f5f5',
                            borderBottom: '1px solid #ddd'
                        }}
                    >
                        <Typography variant="subtitle1" sx={{ ml: 2 }}>
                            Đang chỉnh sửa: <strong>{editingFile}</strong>
                        </Typography>
                        <Box>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleSaveChanges}
                                disabled={isLoading}
                                sx={{ mr: 1 }}
                            >
                                {isLoading ? (
                                    <CircularProgress size={24} color="inherit" />
                                ) : (
                                    'Lưu thay đổi'
                                )}
                            </Button>
                            <IconButton onClick={handleCloseEditor}>
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </Box>
                    <Box sx={{ flexGrow: 1, position: 'relative' }}>
                        <DocumentEditorContainerComponent
                            id="sf-docx-editor-modal"
                            ref={sfContainerRef}
                            serviceUrl={SYNCFUSION_SERVICE_URL}
                            enableToolbar={true}
                            height={'100%'}
                        />
                    </Box>
                </Paper>
            </Modal>
        </Box>
    );
}

// --- Định nghĩa Route của TanStack ---
export const Route = createLazyFileRoute('/forms/')({
    component: SyncPage
});
