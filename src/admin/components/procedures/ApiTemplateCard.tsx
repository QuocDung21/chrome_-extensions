import React, { useEffect, useState } from 'react';

import {
    CheckCircle as CheckCircleIcon,
    Close as CloseIcon,
    CloudDone as CloudDoneIcon,
    Description as DescriptionIcon,
    Edit as EditIcon,
    Star as StarIcon,
    Wifi as WifiIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Snackbar,
    Stack,
    Typography
} from '@mui/material';

import { db } from '@/admin/db/db';
import { thanhPhanHoSoTTHCRepository } from '@/admin/repository/ThanhPhanHoSoTTHCRepository';
import { dataSyncService } from '@/admin/services/dataSyncService';
import { LinhVuc } from '@/admin/services/linhVucService';
import { ThanhPhanHoSoTTHC } from '@/admin/services/thanhPhanHoSoService';
import { ThuTucHanhChinh } from '@/admin/services/thuTucHanhChinh';

interface ApiTemplateCardProps {
    record: ThuTucHanhChinh;
    linhVucList: LinhVuc[];
    onSelect: (record: ThuTucHanhChinh) => void;
    onTemplateSelect?: (templateData: {
        record: ThuTucHanhChinh;
        template: ThanhPhanHoSoTTHC;
    }) => void;
    hasWorkingDocuments?: boolean;
    workingDocumentsCount?: number;
}

export const ApiTemplateCard = React.memo<ApiTemplateCardProps>(
    ({
        record,
        linhVucList,
        onSelect,
        onTemplateSelect,
        hasWorkingDocuments = false,
        workingDocumentsCount = 0
    }) => {
        // Find linhVuc name from maLinhVuc for performance
        const linhVucName = React.useMemo(() => {
            const linhVuc = linhVucList.find(lv => lv.maLinhVuc === record.maLinhVuc);
            return linhVuc ? linhVuc.tenLinhVuc : record.maLinhVuc;
        }, [linhVucList, record.maLinhVuc]);

        const [modalState, setModalState] = useState({
            open: false,
            loading: false,
            templates: [] as ThanhPhanHoSoTTHC[]
        });
        const [snackbar, setSnackbar] = useState({
            open: false,
            message: '',
            severity: 'info' as 'success' | 'error' | 'warning' | 'info'
        });
        const [offlineStatus, setOfflineStatus] = useState<{ [key: string]: boolean }>({});

        const handleOpenModal = async () => {
            console.log('🔍 Opening template selection for TTHC:', record.maThuTucHanhChinh);

            // If onTemplateSelect is provided, use parent logic instead of internal modal
            if (onTemplateSelect) {
                console.log('📋 Using parent template selection logic (avoiding double modal)');

                try {
                    let templates: ThanhPhanHoSoTTHC[] = [];

                    // Kiểm tra xem dữ liệu đã được đồng bộ chưa
                    const isDataSynced = await dataSyncService.isDataSynced();

                    if (isDataSynced) {
                        // Sử dụng dữ liệu từ IndexedDB - tìm theo thuTucHanhChinhID
                        console.log('✅ Using offline data from IndexedDB');
                        templates = await db.thanhPhanHoSoTTHC
                            .where('thuTucHanhChinhID')
                            .equals(record.thuTucHanhChinhID)
                            .toArray();

                        console.log(
                            `✅ Found ${templates.length} templates in IndexedDB for TTHC ${record.maThuTucHanhChinh}`
                        );
                    } else {
                        // Fallback: sử dụng repository (có thể gọi API)
                        console.log('📡 Data not synced, using repository (may call API)');
                        templates = await thanhPhanHoSoTTHCRepository.getThanhPhanHoSoByMaTTHC(
                            record.maThuTucHanhChinh
                        );
                    }

                    console.log('✅ Loaded templates:', templates.length, 'items');

                    if (templates.length >= 1) {
                        // Always use the first template and let parent handle the selection modal
                        console.log(
                            '🎯 Templates found, letting parent handle selection modal with working documents'
                        );
                        onTemplateSelect({ record, template: templates[0] });
                    } else {
                        setSnackbar({
                            open: true,
                            message: isDataSynced
                                ? 'Không tìm thấy mẫu đơn nào cho thủ tục này trong dữ liệu offline'
                                : 'Không tìm thấy mẫu đơn nào cho thủ tục này',
                            severity: 'warning'
                        });
                    }
                    return; // Exit early - don't open internal modal
                } catch (error) {
                    console.error('❌ Error loading templates for parent:', error);
                    setSnackbar({
                        open: true,
                        message: 'Lỗi khi tải danh sách mẫu đơn',
                        severity: 'error'
                    });
                    return;
                }
            }

            // Original internal modal logic (when onTemplateSelect is not provided)
            console.log('📋 Using internal modal logic');
            setModalState(prev => ({ ...prev, open: true, loading: true }));

            try {
                let templates: ThanhPhanHoSoTTHC[] = [];

                // Kiểm tra xem dữ liệu đã được đồng bộ chưa
                const isDataSynced = await dataSyncService.isDataSynced();

                if (isDataSynced) {
                    // Sử dụng dữ liệu từ IndexedDB - tìm theo thuTucHanhChinhID
                    console.log('✅ Using offline data from IndexedDB');
                    templates = await db.thanhPhanHoSoTTHC
                        .where('thuTucHanhChinhID')
                        .equals(record.thuTucHanhChinhID)
                        .toArray();

                    console.log(
                        `✅ Found ${templates.length} templates in IndexedDB for TTHC ${record.maThuTucHanhChinh}`
                    );
                } else {
                    // Fallback: sử dụng repository (có thể gọi API)
                    console.log('📡 Data not synced, using repository (may call API)');
                    templates = await thanhPhanHoSoTTHCRepository.getThanhPhanHoSoByMaTTHC(
                        record.maThuTucHanhChinh
                    );
                }

                console.log('✅ Loaded templates:', templates.length, 'items');

                // Check offline status for each template
                const offlineStatusMap: { [key: string]: boolean } = {};
                for (const template of templates) {
                    const hasOffline = await thanhPhanHoSoTTHCRepository.hasLocalFile(
                        template.thanhPhanHoSoTTHCID
                    );
                    offlineStatusMap[template.thanhPhanHoSoTTHCID] = hasOffline;
                    console.log(
                        `📁 Template ${template.tenTepDinhKem} offline status:`,
                        hasOffline
                    );
                }
                setOfflineStatus(offlineStatusMap);

                setModalState({
                    open: true,
                    loading: false,
                    templates
                });

                if (templates.length === 0) {
                    setSnackbar({
                        open: true,
                        message: isDataSynced
                            ? 'Không tìm thấy mẫu đơn nào cho thủ tục này trong dữ liệu offline'
                            : 'Không tìm thấy mẫu đơn nào cho thủ tục này',
                        severity: 'warning'
                    });
                }
            } catch (error) {
                console.error('❌ Error loading templates:', error);
                setModalState(prev => ({ ...prev, loading: false }));
                setSnackbar({
                    open: true,
                    message: 'Lỗi khi tải danh sách mẫu đơn',
                    severity: 'error'
                });
            }
        };

        const handleCloseModal = () => {
            setModalState({ open: false, loading: false, templates: [] });
        };

        const handleTemplateSelect = (template: ThanhPhanHoSoTTHC) => {
            console.log('🎯 Template selected from API modal:', template);

            if (onTemplateSelect) {
                onTemplateSelect({ record, template });
            }

            handleCloseModal();

            setSnackbar({
                open: true,
                message: `Đã chọn mẫu: ${template.tenThanhPhanHoSoTTHC}`,
                severity: 'success'
            });
        };

        return (
            <>
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
                <Card
                    variant="outlined"
                    sx={{
                        mb: 2,
                        borderRadius: 2,
                        borderColor: 'grey.300',
                        transition: 'box-shadow 0.3s, border-color 0.3s',
                        '&:hover': {
                            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                            borderColor: 'primary.main'
                        }
                    }}
                >
                    <CardContent>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                mb: 1.5,
                                gap: 1
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <StarIcon sx={{ color: 'text.secondary', fontSize: '1.25rem' }} />
                                <Typography variant="body2" color="text.secondary">
                                    <Typography component="span" fontWeight="500">
                                        Mã TTHC:
                                    </Typography>{' '}
                                    {record.maThuTucHanhChinh}
                                </Typography>
                            </Box>
                            <Button
                                variant="contained"
                                size="small"
                                onClick={handleOpenModal}
                                startIcon={<EditIcon />}
                                sx={{
                                    borderRadius: 1,
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
                                Chọn mẫu
                            </Button>
                        </Box>
                        <Divider sx={{ my: 1.5 }} />
                        <Stack spacing={1.5} sx={{ my: 2 }}>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Typography
                                    variant="body2"
                                    sx={{ width: 150, color: 'text.secondary', flexShrink: 0 }}
                                >
                                    Tên thủ tục:
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 'bold', color: 'primary.main' }}
                                >
                                    {record.tenThuTucHanhChinh}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Typography
                                    variant="body2"
                                    sx={{ width: 150, color: 'text.secondary', flexShrink: 0 }}
                                >
                                    Lĩnh vực:
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: '500' }}>
                                    {linhVucName}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Typography
                                    variant="body2"
                                    sx={{ width: 150, color: 'text.secondary', flexShrink: 0 }}
                                >
                                    Đối tượng:
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: '500' }}>
                                    {record.doiTuongThucHien || 'Công dân Việt Nam'}
                                </Typography>
                            </Box>
                            {hasWorkingDocuments && (
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <Typography
                                        variant="body2"
                                        sx={{ width: 150, color: 'text.secondary', flexShrink: 0 }}
                                    >
                                        Mẫu đã thiết lập:
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Chip
                                            label={`${workingDocumentsCount} bản sao`}
                                            color="success"
                                            size="small"
                                            sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                                        />
                                        <Typography
                                            variant="caption"
                                            color="success.main"
                                            sx={{ fontStyle: 'italic' }}
                                        >
                                            💾 Đã lưu IndexedDB
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                        </Stack>
                    </CardContent>
                </Card>

                {/* Template Selection Modal */}
                <Dialog
                    open={modalState.open}
                    onClose={handleCloseModal}
                    maxWidth="md"
                    fullWidth
                    sx={{
                        '& .MuiDialog-paper': {
                            borderRadius: 1,
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                            boxShadow: '0 24px 48px rgba(0,0,0,0.2)'
                        }
                    }}
                >
                    <Box
                        sx={{
                            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                            color: 'white',
                            p: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}
                    >
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            Chọn mẫu đơn - {record.tenThuTucHanhChinh}
                        </Typography>
                        <IconButton onClick={handleCloseModal} sx={{ color: 'white' }}>
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    <DialogContent sx={{ p: 3 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Vui lòng chọn một mẫu đơn từ danh sách bên dưới để tiếp tục:
                        </Typography>

                        {modalState.loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : modalState.templates.length > 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {modalState.templates.map(template => (
                                    <Box key={template.thanhPhanHoSoTTHCID}>
                                        <Card
                                            variant="outlined"
                                            sx={{
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                                    borderColor: 'primary.main'
                                                }
                                            }}
                                        >
                                            <CardContent>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'flex-start',
                                                        gap: 2
                                                    }}
                                                >
                                                    <DescriptionIcon
                                                        sx={{ color: 'primary.main', mt: 0.5 }}
                                                    />
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{ fontWeight: 600, mb: 1 }}
                                                        >
                                                            {template.tenThanhPhanHoSoTTHC}
                                                        </Typography>

                                                        <Stack spacing={1} sx={{ mb: 2 }}>
                                                            <Box sx={{ display: 'flex', gap: 2 }}>
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{
                                                                        width: 120,
                                                                        color: 'text.secondary',
                                                                        flexShrink: 0
                                                                    }}
                                                                >
                                                                    Tên tệp:
                                                                </Typography>
                                                                <Typography variant="body2">
                                                                    {template.tenTepDinhKem ||
                                                                        'Chưa có tên tệp'}
                                                                </Typography>
                                                            </Box>

                                                            <Box sx={{ display: 'flex', gap: 2 }}>
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{
                                                                        width: 120,
                                                                        color: 'text.secondary',
                                                                        flexShrink: 0
                                                                    }}
                                                                >
                                                                    Số bản chính:
                                                                </Typography>
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{ fontWeight: 500 }}
                                                                >
                                                                    {template.soBanChinh || '0'}
                                                                </Typography>
                                                            </Box>

                                                            <Box sx={{ display: 'flex', gap: 2 }}>
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{
                                                                        width: 120,
                                                                        color: 'text.secondary',
                                                                        flexShrink: 0
                                                                    }}
                                                                >
                                                                    Số bản sao:
                                                                </Typography>
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{ fontWeight: 500 }}
                                                                >
                                                                    {template.soBanSao || '0'}
                                                                </Typography>
                                                            </Box>
                                                            {template.ghiChu && (
                                                                <Box
                                                                    sx={{ display: 'flex', gap: 2 }}
                                                                >
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{
                                                                            width: 120,
                                                                            color: 'text.secondary',
                                                                            flexShrink: 0
                                                                        }}
                                                                    >
                                                                        Ghi chú:
                                                                    </Typography>
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{ fontStyle: 'italic' }}
                                                                    >
                                                                        {template.ghiChu}
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                        </Stack>

                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                gap: 1,
                                                                alignItems: 'center'
                                                            }}
                                                        >
                                                            {offlineStatus[
                                                                template.thanhPhanHoSoTTHCID
                                                            ] ? (
                                                                <Chip
                                                                    label="Offline"
                                                                    color="success"
                                                                    size="small"
                                                                    icon={<CloudDoneIcon />}
                                                                    sx={{
                                                                        background:
                                                                            'linear-gradient(45deg, #4caf50, #66bb6a)',
                                                                        color: 'white',
                                                                        fontWeight: 600
                                                                    }}
                                                                />
                                                            ) : (
                                                                <Chip
                                                                    label="Online"
                                                                    color="primary"
                                                                    size="small"
                                                                    icon={<WifiIcon />}
                                                                    sx={{
                                                                        background:
                                                                            'linear-gradient(45deg, #2196f3, #42a5f5)',
                                                                        color: 'white',
                                                                        fontWeight: 600
                                                                    }}
                                                                />
                                                            )}
                                                            <Button
                                                                variant="contained"
                                                                color="primary"
                                                                size="small"
                                                                onClick={() =>
                                                                    handleTemplateSelect(template)
                                                                }
                                                                sx={{
                                                                    ml: 'auto',
                                                                    background: offlineStatus[
                                                                        template.thanhPhanHoSoTTHCID
                                                                    ]
                                                                        ? 'linear-gradient(45deg, #4caf50, #66bb6a)'
                                                                        : 'linear-gradient(45deg, #1976d2, #42a5f5)',
                                                                    '&:hover': {
                                                                        background: offlineStatus[
                                                                            template
                                                                                .thanhPhanHoSoTTHCID
                                                                        ]
                                                                            ? 'linear-gradient(45deg, #388e3c, #4caf50)'
                                                                            : 'linear-gradient(45deg, #1565c0, #1976d2)'
                                                                    }
                                                                }}
                                                            >
                                                                Chọn mẫu này
                                                            </Button>
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <DescriptionIcon
                                    sx={{
                                        fontSize: 48,
                                        color: 'text.secondary',
                                        mb: 2,
                                        opacity: 0.5
                                    }}
                                />
                                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                                    Không có mẫu đơn
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Thủ tục này chưa có mẫu đơn nào trong hệ thống
                                </Typography>
                            </Box>
                        )}
                    </DialogContent>
                </Dialog>
            </>
        );
    }
);

ApiTemplateCard.displayName = 'ApiTemplateCard';
