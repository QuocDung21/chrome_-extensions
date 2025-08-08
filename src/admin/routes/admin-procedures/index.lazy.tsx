import { ReactElement, useState } from 'react';

import {
    Assignment,
    Business,
    Description,
    DirectionsCar,
    ExpandMore,
    Home,
    LocalHospital,
    Search
} from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    Grid,
    InputAdornment,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    TextField,
    Typography
} from '@mui/material';
import { createLazyFileRoute } from '@tanstack/react-router';

export const Route = createLazyFileRoute('/admin-procedures/')({
    component: AdminProcedures
});

interface Procedure {
    id: string;
    name: string;
    category: string;
    description: string;
    requiredDocuments: string[];
    processingTime: string;
    fee: string;
    status: 'active' | 'inactive';
    icon: ReactElement;
}

const procedures: Procedure[] = [
    {
        id: '1',
        name: 'Cấp căn cước công dân',
        category: 'Công an',
        description: 'Thủ tục cấp căn cước công dân cho công dân Việt Nam',
        requiredDocuments: ['Giấy khai sinh', 'Hộ khẩu', 'Ảnh 3x4'],
        processingTime: '15 ngày',
        fee: '25.000 VNĐ',
        status: 'active',
        icon: <Assignment />
    },
    {
        id: '2',
        name: 'Đăng ký kinh doanh',
        category: 'Kế hoạch và Đầu tư',
        description: 'Thủ tục đăng ký thành lập doanh nghiệp',
        requiredDocuments: ['Đơn đăng ký', 'Điều lệ công ty', 'CMND/CCCD'],
        processingTime: '15 ngày',
        fee: '500.000 VNĐ',
        status: 'active',
        icon: <Business />
    },
    {
        id: '3',
        name: 'Cấp giấy phép xây dựng',
        category: 'Xây dựng',
        description: 'Thủ tục cấp phép xây dựng nhà ở',
        requiredDocuments: ['Đơn xin phép', 'Bản vẽ thiết kế', 'Giấy chứng nhận quyền sử dụng đất'],
        processingTime: '30 ngày',
        fee: '1.000.000 VNĐ',
        status: 'active',
        icon: <Home />
    },
    {
        id: '4',
        name: 'Đăng ký xe máy',
        category: 'Giao thông vận tải',
        description: 'Thủ tục đăng ký biển số xe máy',
        requiredDocuments: ['Hóa đơn mua xe', 'CMND/CCCD', 'Giấy chứng nhận chất lượng'],
        processingTime: '1 ngày',
        fee: '1.560.000 VNĐ',
        status: 'active',
        icon: <DirectionsCar />
    },
    {
        id: '5',
        name: 'Cấp thẻ bảo hiểm y tế',
        category: 'Y tế',
        description: 'Thủ tục cấp thẻ bảo hiểm y tế',
        requiredDocuments: ['CMND/CCCD', 'Ảnh 3x4', 'Giấy xác nhận thu nhập'],
        processingTime: '7 ngày',
        fee: 'Miễn phí',
        status: 'active',
        icon: <LocalHospital />
    }
];

const categories = Array.from(new Set(procedures.map(p => p.category)));

function AdminProcedures(): ReactElement {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const filteredProcedures = procedures.filter(procedure => {
        const matchesSearch =
            procedure.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            procedure.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory =
            selectedCategory === 'all' || procedure.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

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
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    Thủ tục hành chính
                </Typography>
                <Button variant="contained">Thêm thủ tục mới</Button>
            </Box>

            {/* Stats */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Tổng số thủ tục
                            </Typography>
                            <Typography variant="h4" component="div">
                                {procedures.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Đang hoạt động
                            </Typography>
                            <Typography variant="h4" component="div" color="success.main">
                                {procedures.filter(p => p.status === 'active').length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Lĩnh vực
                            </Typography>
                            <Typography variant="h4" component="div" color="primary.main">
                                {categories.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Thời gian TB
                            </Typography>
                            <Typography variant="h4" component="div" color="warning.main">
                                15 ngày
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Filters */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 8 }}>
                    <TextField
                        fullWidth
                        placeholder="Tìm kiếm thủ tục..."
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
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                            label="Tất cả"
                            onClick={() => setSelectedCategory('all')}
                            color={selectedCategory === 'all' ? 'primary' : 'default'}
                            variant={selectedCategory === 'all' ? 'filled' : 'outlined'}
                        />
                        {categories.map(category => (
                            <Chip
                                key={category}
                                label={category}
                                onClick={() => setSelectedCategory(category)}
                                color={selectedCategory === category ? 'primary' : 'default'}
                                variant={selectedCategory === category ? 'filled' : 'outlined'}
                            />
                        ))}
                    </Box>
                </Grid>
            </Grid>

            {/* Procedures List */}
            <Box>
                {filteredProcedures.map(procedure => (
                    <Accordion key={procedure.id} sx={{ mb: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    width: '100%'
                                }}
                            >
                                {procedure.icon}
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="h6">{procedure.name}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {procedure.category} • {procedure.processingTime} •{' '}
                                        {procedure.fee}
                                    </Typography>
                                </Box>
                                <Chip
                                    label={procedure.status === 'active' ? 'Hoạt động' : 'Tạm dừng'}
                                    color={procedure.status === 'active' ? 'success' : 'default'}
                                    size="small"
                                />
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="body1" sx={{ mb: 2 }}>
                                {procedure.description}
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6" sx={{ mb: 1 }}>
                                Hồ sơ yêu cầu:
                            </Typography>
                            <List dense>
                                {procedure.requiredDocuments.map((doc, index) => (
                                    <ListItem key={index}>
                                        <ListItemIcon>
                                            <Description fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText primary={doc} />
                                    </ListItem>
                                ))}
                            </List>
                            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                <Button variant="outlined" size="small">
                                    Chỉnh sửa
                                </Button>
                                <Button variant="outlined" size="small" color="error">
                                    Xóa
                                </Button>
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Box>

            {filteredProcedures.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Assignment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        Không tìm thấy thủ tục nào
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Thử điều chỉnh từ khóa tìm kiếm hoặc bộ lọc
                    </Typography>
                </Box>
            )}
        </Box>
    );
}
