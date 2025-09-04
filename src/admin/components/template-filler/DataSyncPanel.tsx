import React, { useState } from 'react';

import {
    CloudDone as CloudDoneIcon,
    CloudDownload as CloudDownloadIcon,
    CloudOff as CloudOffIcon,
    CloudSync as CloudSyncIcon,
    Delete as DeleteIcon,
    Refresh as RefreshIcon,
    Storage as StorageIcon
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
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    LinearProgress,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Snackbar,
    Stack,
    Typography
} from '@mui/material';

import { useDataSync } from '@/admin/hooks/useDataSync';
import { DataSyncDebug } from '@/admin/utils/dataSyncDebug';

interface DataSyncPanelProps {
    onSyncComplete?: () => void;
}

export const DataSyncPanel: React.FC<DataSyncPanelProps> = ({ onSyncComplete }) => {
    const { syncStatus, isDataSynced, dataStats, syncAllData, refreshData, clearAllData } =
        useDataSync();

    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        onConfirm: () => {}
    });
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'info' as 'success' | 'error' | 'warning' | 'info'
    });

    const handleSyncData = async () => {
        try {
            await syncAllData({
                forceRefresh: false,
                downloadFiles: true
            });

            setSnackbar({
                open: true,
                message: 'Đồng bộ dữ liệu thành công!',
                severity: 'success'
            });

            onSyncComplete?.();
        } catch (error) {
            console.error('Error syncing data:', error);
            setSnackbar({
                open: true,
                message: `Lỗi đồng bộ dữ liệu: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`,
                severity: 'error'
            });
        }
    };

    const handleRefreshData = async () => {
        try {
            await refreshData({
                downloadFiles: true
            });

            setSnackbar({
                open: true,
                message: 'Làm mới dữ liệu thành công!',
                severity: 'success'
            });

            onSyncComplete?.();
        } catch (error) {
            console.error('Error refreshing data:', error);
            setSnackbar({
                open: true,
                message: `Lỗi làm mới dữ liệu: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`,
                severity: 'error'
            });
        }
    };

    const handleClearData = () => {
        setConfirmDialog({
            open: true,
            title: 'Xóa tất cả dữ liệu',
            message:
                'Bạn có chắc chắn muốn xóa tất cả dữ liệu đã đồng bộ? Hành động này không thể hoàn tác.',
            onConfirm: async () => {
                try {
                    await clearAllData();

                    setSnackbar({
                        open: true,
                        message: 'Đã xóa tất cả dữ liệu!',
                        severity: 'success'
                    });

                    setConfirmDialog(prev => ({ ...prev, open: false }));
                } catch (error) {
                    console.error('Error clearing data:', error);
                    setSnackbar({
                        open: true,
                        message: `Lỗi xóa dữ liệu: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`,
                        severity: 'error'
                    });
                }
            }
        });
    };

    const handleDebugData = async () => {
        try {
            console.log('🔍 Running data sync debug tests...');
            await DataSyncDebug.runAllTests();

            setSnackbar({
                open: true,
                message: 'Debug tests completed! Check console for details.',
                severity: 'info'
            });
        } catch (error) {
            console.error('Debug test failed:', error);
            setSnackbar({
                open: true,
                message: `Debug test failed: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`,
                severity: 'error'
            });
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getSyncProgress = () => {
        const { linhVuc, thuTucHanhChinh, thanhPhanHoSoTTHC, files } = syncStatus.syncProgress;
        const totalSteps = 4;
        const completedSteps = [linhVuc, thuTucHanhChinh, thanhPhanHoSoTTHC, files].filter(
            step => step.completed
        ).length;
        return (completedSteps / totalSteps) * 100;
    };

    const getOverallProgress = () => {
        const { linhVuc, thuTucHanhChinh, thanhPhanHoSoTTHC, files } = syncStatus.syncProgress;
        const totalItems =
            linhVuc.total + thuTucHanhChinh.total + thanhPhanHoSoTTHC.total + files.total;
        const currentItems =
            linhVuc.current + thuTucHanhChinh.current + thanhPhanHoSoTTHC.current + files.current;
        return totalItems > 0 ? (currentItems / totalItems) * 100 : 0;
    };

    return (
        <>
            <Card sx={{ mb: 2 }}>
                <CardHeader
                    title={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <StorageIcon color="primary" />
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                Quản lý dữ liệu offline
                            </Typography>
                        </Box>
                    }
                    subheader="Đồng bộ dữ liệu từ API vào IndexedDB để sử dụng offline"
                />
                <CardContent>
                    <Stack spacing={3}>
                        {/* Sync Status */}
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                Trạng thái đồng bộ
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                {isDataSynced ? (
                                    <Chip
                                        icon={<CloudDoneIcon />}
                                        label="Đã đồng bộ"
                                        color="success"
                                        variant="outlined"
                                    />
                                ) : (
                                    <Chip
                                        icon={<CloudOffIcon />}
                                        label="Chưa đồng bộ"
                                        color="warning"
                                        variant="outlined"
                                    />
                                )}
                                {syncStatus.lastSyncTime && (
                                    <Typography variant="caption" color="text.secondary">
                                        Lần cuối:{' '}
                                        {new Date(syncStatus.lastSyncTime).toLocaleString()}
                                    </Typography>
                                )}
                            </Box>

                            {syncStatus.isSyncing && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                        Đang đồng bộ dữ liệu... ({Math.round(getOverallProgress())}
                                        %)
                                    </Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={getOverallProgress()}
                                    />
                                </Box>
                            )}
                        </Box>

                        {/* Data Statistics */}
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                Thống kê dữ liệu
                            </Typography>
                            <List dense>
                                <ListItem>
                                    <ListItemIcon>
                                        <CloudSyncIcon color="primary" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Lĩnh vực"
                                        secondary={`${dataStats.linhVuc} mục`}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon>
                                        <CloudSyncIcon color="primary" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Thủ tục hành chính"
                                        secondary={`${dataStats.thuTucHanhChinh} mục`}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon>
                                        <CloudSyncIcon color="primary" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Thành phần hồ sơ"
                                        secondary={`${dataStats.thanhPhanHoSoTTHC} mục`}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon>
                                        <CloudDownloadIcon color="success" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Files offline"
                                        secondary={`${dataStats.localFiles} files (${formatFileSize(dataStats.totalFileSize)})`}
                                    />
                                </ListItem>
                            </List>
                        </Box>

                        {/* Sync Progress Details */}
                        {syncStatus.isSyncing && (
                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                    Chi tiết tiến trình
                                </Typography>
                                <Stack spacing={1}>
                                    {Object.entries(syncStatus.syncProgress).map(
                                        ([key, progress]) => (
                                            <Box key={key}>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        mb: 0.5
                                                    }}
                                                >
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ textTransform: 'capitalize' }}
                                                    >
                                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                    >
                                                        {progress.current}/{progress.total}
                                                    </Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={
                                                        progress.total > 0
                                                            ? (progress.current / progress.total) *
                                                              100
                                                            : 0
                                                    }
                                                    color={
                                                        progress.completed ? 'success' : 'primary'
                                                    }
                                                />
                                            </Box>
                                        )
                                    )}
                                </Stack>
                            </Box>
                        )}

                        {/* Error Messages */}
                        {syncStatus.errors.length > 0 && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    Lỗi trong quá trình đồng bộ:
                                </Typography>
                                <List dense>
                                    {syncStatus.errors.map((error, index) => (
                                        <ListItem key={index} sx={{ py: 0 }}>
                                            <ListItemText
                                                primary={error}
                                                primaryTypographyProps={{ variant: 'body2' }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Alert>
                        )}

                        <Divider />

                        {/* Action Buttons */}
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Button
                                variant="contained"
                                startIcon={isDataSynced ? <RefreshIcon /> : <CloudSyncIcon />}
                                onClick={isDataSynced ? handleRefreshData : handleSyncData}
                                disabled={syncStatus.isSyncing}
                                sx={{ minWidth: 140 }}
                            >
                                {syncStatus.isSyncing ? (
                                    <CircularProgress size={20} />
                                ) : isDataSynced ? (
                                    'Làm mới'
                                ) : (
                                    'Đồng bộ'
                                )}
                            </Button>

                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={handleClearData}
                                disabled={syncStatus.isSyncing || !isDataSynced}
                                sx={{ minWidth: 140 }}
                            >
                                Xóa dữ liệu
                            </Button>

                            <Button
                                variant="outlined"
                                color="info"
                                onClick={handleDebugData}
                                disabled={syncStatus.isSyncing}
                                sx={{ minWidth: 140 }}
                            >
                                🔍 Debug
                            </Button>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>

            {/* Confirmation Dialog */}
            <Dialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>{confirmDialog.title}</DialogTitle>
                <DialogContent>
                    <Typography>{confirmDialog.message}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>
                        Hủy
                    </Button>
                    <Button onClick={confirmDialog.onConfirm} color="error" variant="contained">
                        Xác nhận
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};
