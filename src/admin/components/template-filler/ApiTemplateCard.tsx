import React, { useState } from 'react';

import {
    CheckCircle as CheckCircleIcon,
    Close as CloseIcon,
    Description as DescriptionIcon,
    Edit as EditIcon,
    Star as StarIcon
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

import { thanhPhanHoSoTTHCRepository } from '@/admin/repository/ThanhPhanHoSoTTHCRepository';
import { ThanhPhanHoSoTTHC } from '@/admin/services/thanhPhanHoSoService';
import { ThuTucHanhChinh } from '@/admin/services/thuTucHanhChinh';

interface ApiTemplateCardProps {
    record: ThuTucHanhChinh;
    onSelect: (record: ThuTucHanhChinh) => void;
    onTemplateSelect?: (templateData: {
        record: ThuTucHanhChinh;
        template: ThanhPhanHoSoTTHC;
    }) => void;
}

export const ApiTemplateCard = React.memo<ApiTemplateCardProps>(
    ({ record, onSelect, onTemplateSelect }) => {
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

        const handleOpenModal = async () => {
            console.log('🔍 Opening template modal for TTHC:', record.maThuTucHanhChinh);
            setModalState(prev => ({ ...prev, open: true, loading: true }));

            try {
                const templates = await thanhPhanHoSoTTHCRepository.getThanhPhanHoSoByMaTTHC(
                    record.maThuTucHanhChinh
                );

                console.log('✅ Loaded templates:', templates.length, 'items');

                setModalState({
                    open: true,
                    loading: false,
                    templates
                });

                if (templates.length === 0) {
                    setSnackbar({
                        open: true,
                        message: 'Không tìm thấy mẫu đơn nào cho thủ tục này',
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
                                    Mã lĩnh vực:
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: '500' }}>
                                    {record.maLinhVuc}
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
                                                                    handleTemplateSelect(template)
                                                                }
                                                                sx={{ ml: 'auto' }}
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
