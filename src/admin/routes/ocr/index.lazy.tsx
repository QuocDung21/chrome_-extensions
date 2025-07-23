import { ReactElement, useState } from 'react';

import { Delete, Download, FilterList, Search, Visibility } from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Grid,
    IconButton,
    InputAdornment,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography
} from '@mui/material';
import { createLazyFileRoute } from '@tanstack/react-router';

export const Route = createLazyFileRoute('/ocr/')({
    component: OCRHistory
});

interface OCRRecord {
    id: string;
    fileName: string;
    uploadDate: string;
    status: 'completed' | 'processing' | 'failed';
    documentType: string;
    extractedText: string;
    confidence: number;
}

const mockData: OCRRecord[] = [
    {
        id: '1',
        fileName: 'CCCD_001.jpg',
        uploadDate: '2024-01-15 10:30:00',
        status: 'completed',
        documentType: 'CCCD',
        extractedText: 'Căn cước công dân - Số: 001234567890',
        confidence: 95.5
    },
    {
        id: '2',
        fileName: 'passport_002.pdf',
        uploadDate: '2024-01-15 09:15:00',
        status: 'completed',
        documentType: 'Hộ chiếu',
        extractedText: 'Passport - Number: A12345678',
        confidence: 98.2
    },
    {
        id: '3',
        fileName: 'invoice_003.jpg',
        uploadDate: '2024-01-15 08:45:00',
        status: 'processing',
        documentType: 'Hóa đơn',
        extractedText: '',
        confidence: 0
    }
];

function OCRHistory(): ReactElement {
    const [searchTerm, setSearchTerm] = useState('');
    const [records] = useState<OCRRecord[]>(mockData);

    const filteredRecords = records.filter(
        record =>
            record.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.documentType.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
        switch (status) {
            case 'completed':
                return 'success';
            case 'processing':
                return 'warning';
            case 'failed':
                return 'error';
            default:
                return 'default';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed':
                return 'Hoàn thành';
            case 'processing':
                return 'Đang xử lý';
            case 'failed':
                return 'Thất bại';
            default:
                return status;
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3
                }}
            >
                <Typography variant="h4" sx={{ fontWeight: 600 }}></Typography>
                <Button variant="contained" startIcon={<FilterList />}>
                    Bộ lọc
                </Button>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Tổng số tài liệu
                            </Typography>
                            <Typography variant="h4" component="div">
                                {records.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Hoàn thành
                            </Typography>
                            <Typography variant="h4" component="div" color="success.main">
                                {records.filter(r => r.status === 'completed').length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Đang xử lý
                            </Typography>
                            <Typography variant="h4" component="div" color="warning.main">
                                {records.filter(r => r.status === 'processing').length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Độ chính xác TB
                            </Typography>
                            <Typography variant="h4" component="div" color="primary.main">
                                {(
                                    records.reduce((acc, r) => acc + r.confidence, 0) /
                                    records.length
                                ).toFixed(1)}
                                %
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Search */}
            <Box sx={{ mb: 3 }}>
                <TextField
                    fullWidth
                    placeholder="Tìm kiếm theo tên file hoặc loại tài liệu..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search />
                            </InputAdornment>
                        )
                    }}
                />
            </Box>

            {/* Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Tên file</TableCell>
                            <TableCell>Loại tài liệu</TableCell>
                            <TableCell>Ngày tải lên</TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell>Độ chính xác</TableCell>
                            <TableCell>Nội dung trích xuất</TableCell>
                            <TableCell align="center">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredRecords.map(record => (
                            <TableRow key={record.id} hover>
                                <TableCell>{record.fileName}</TableCell>
                                <TableCell>{record.documentType}</TableCell>
                                <TableCell>{record.uploadDate}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={getStatusText(record.status)}
                                        color={getStatusColor(record.status)}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    {record.confidence > 0 ? `${record.confidence}%` : '-'}
                                </TableCell>
                                <TableCell>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            maxWidth: 200,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {record.extractedText || 'Đang xử lý...'}
                                    </Typography>
                                </TableCell>
                                <TableCell align="center">
                                    <IconButton size="small" color="primary">
                                        <Visibility />
                                    </IconButton>
                                    <IconButton size="small" color="success">
                                        <Download />
                                    </IconButton>
                                    <IconButton size="small" color="error">
                                        <Delete />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
