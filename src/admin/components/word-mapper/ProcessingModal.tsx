import React, { useState } from 'react';

import {
    Close as CloseIcon,
    Download as DownloadIcon,
    QrCodeScanner as QrCodeScannerIcon,
    SmartToy as SmartToyIcon
} from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    TextField,
    Typography
} from '@mui/material';

interface ProcessingModalProps {
    open: boolean;
    onClose: () => void;
    templateName: string;
    templateCode: string;
}

export const ProcessingModal: React.FC<ProcessingModalProps> = ({
    open,
    onClose,
    templateName,
    templateCode
}) => {
    const [extractedData, setExtractedData] = useState({
        soCccd: '',
        hoTen: '',
        ngaySinh: '',
        gioiTinh: '',
        diaChi: '',
        ngayCap: ''
    });

    const [qrData, setQrData] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleQrDataChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setQrData(event.target.value);
    };

    const handleProcessQrData = async () => {
        if (!qrData.trim()) return;

        setIsProcessing(true);
        try {
            // Simulate QR processing
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock extracted data (replace with actual API call)
            setExtractedData({
                soCccd: '012345678901',
                hoTen: 'NGUYEN VAN A',
                ngaySinh: '01/01/1990',
                gioiTinh: 'Nam',
                diaChi: 'Hà Nội',
                ngayCap: '01/01/2022'
            });
        } catch (error) {
            console.error('Error processing QR data:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownloadOriginal = () => {
        // Handle download original template
        console.log('Download original template');
    };

    const handleExtractedDataChange = (field: string, value: string) => {
        setExtractedData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { height: '90vh', maxHeight: '800px' }
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
                <Typography variant="h6">Tạo trực tuyến - NTSoft DVC</Typography>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 0 }}>
                <Box sx={{ p: 3 }}>
                    <Grid container spacing={3}>
                        {/* Left Column - Template Info & QR Scanner */}
                        <Grid>
                            {/* Template Info */}
                            <Card sx={{ mb: 3 }}>
                                <CardContent>
                                    <Typography variant="h6" sx={{ mb: 2 }}>
                                        Mẫu đơn/tờ khai
                                    </Typography>
                                    <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                                        {templateName}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Mã số: {templateCode}
                                    </Typography>
                                </CardContent>
                            </Card>

                            {/* QR Scanner */}
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <QrCodeScannerIcon sx={{ mr: 1, color: 'primary.main' }} />
                                        <Typography variant="h6">Quét & điền tự động</Typography>
                                    </Box>

                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mb: 2 }}
                                    >
                                        Mở ứng dụng di động <strong>NTSoft Document AI</strong> để
                                        quét QR CCCD/giấy tờ. Sau khi quét, app sẽ trả chuỗi hoặc
                                        JSON về máy tính để điền vào biểu mẫu.
                                    </Typography>

                                    <Button
                                        variant="contained"
                                        startIcon={<SmartToyIcon />}
                                        sx={{ mb: 2, width: '100%' }}
                                        disabled
                                    >
                                        Mở Document AI
                                        <Typography variant="caption" sx={{ ml: 1 }}>
                                            (cần cấu hình deep-link nội bộ)
                                        </Typography>
                                    </Button>

                                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                        Dán chuỗi/JSON trả về:
                                    </Typography>

                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={4}
                                        placeholder='VD: 012345678901|NGUYEN VAN A|01/01/1990|Nam|Hà Nội|01/01/2022 hoặc {"cccd":"012345678901",...}'
                                        value={qrData}
                                        onChange={handleQrDataChange}
                                        sx={{ mb: 2 }}
                                    />

                                    <Button
                                        variant="outlined"
                                        onClick={handleProcessQrData}
                                        disabled={!qrData.trim() || isProcessing}
                                        fullWidth
                                    >
                                        {isProcessing ? 'Đang xử lý...' : 'Phân tích & điền'}
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Right Column - Extracted Results */}
                        <Grid>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" sx={{ mb: 2 }}>
                                        Kết quả trích xuất
                                    </Typography>

                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mb: 3 }}
                                    >
                                        (Tự động map vào các trường tương ứng & file Word)
                                    </Typography>

                                    <Grid container spacing={2}>
                                        <Grid>
                                            <TextField
                                                fullWidth
                                                label="Số CCCD"
                                                value={extractedData.soCccd}
                                                onChange={e =>
                                                    handleExtractedDataChange(
                                                        'soCccd',
                                                        e.target.value
                                                    )
                                                }
                                                size="small"
                                            />
                                        </Grid>
                                        <Grid>
                                            <TextField
                                                fullWidth
                                                label="Họ tên"
                                                value={extractedData.hoTen}
                                                onChange={e =>
                                                    handleExtractedDataChange(
                                                        'hoTen',
                                                        e.target.value
                                                    )
                                                }
                                                size="small"
                                            />
                                        </Grid>
                                        <Grid>
                                            <TextField
                                                fullWidth
                                                label="Ngày sinh"
                                                value={extractedData.ngaySinh}
                                                onChange={e =>
                                                    handleExtractedDataChange(
                                                        'ngaySinh',
                                                        e.target.value
                                                    )
                                                }
                                                size="small"
                                            />
                                        </Grid>
                                        <Grid>
                                            <TextField
                                                fullWidth
                                                label="Giới tính"
                                                value={extractedData.gioiTinh}
                                                onChange={e =>
                                                    handleExtractedDataChange(
                                                        'gioiTinh',
                                                        e.target.value
                                                    )
                                                }
                                                size="small"
                                            />
                                        </Grid>
                                        <Grid>
                                            <TextField
                                                fullWidth
                                                label="Địa chỉ"
                                                value={extractedData.diaChi}
                                                onChange={e =>
                                                    handleExtractedDataChange(
                                                        'diaChi',
                                                        e.target.value
                                                    )
                                                }
                                                size="small"
                                            />
                                        </Grid>
                                        <Grid>
                                            <TextField
                                                fullWidth
                                                label="Ngày cấp"
                                                value={extractedData.ngayCap}
                                                onChange={e =>
                                                    handleExtractedDataChange(
                                                        'ngayCap',
                                                        e.target.value
                                                    )
                                                }
                                                size="small"
                                            />
                                        </Grid>
                                    </Grid>

                                    <Divider sx={{ my: 3 }} />

                                    <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            fullWidth
                                            disabled={
                                                !Object.values(extractedData).some(v => v.trim())
                                            }
                                        >
                                            Phân tích & điền
                                        </Button>

                                        <Button
                                            variant="outlined"
                                            startIcon={<DownloadIcon />}
                                            onClick={handleDownloadOriginal}
                                            fullWidth
                                        >
                                            Tải file gốc
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Box>
            </DialogContent>
        </Dialog>
    );
};
