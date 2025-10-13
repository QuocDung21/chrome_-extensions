import { ReactElement } from 'react';

import {
    ArrowDownward as ArrowDownwardIcon,
    ArrowUpward as ArrowUpwardIcon,
    Extension as ExtensionIcon,
    MoreVert as MoreVertIcon,
    People as PeopleIcon,
    Security as SecurityIcon,
    TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { Avatar, Box, Card, CardContent, Chip, IconButton, Typography } from '@mui/material';
import { createLazyFileRoute } from '@tanstack/react-router';

interface StatCardProps {
    title: string;
    value: string | number;
    change: number;
    icon: ReactElement;
    color: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

function StatCard({ title, value, change, icon, color }: StatCardProps): ReactElement {
    const isPositive = change >= 0;

    return (
        <Card className="dashboard-card" sx={{ height: '100%' }}>
            <CardContent>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 2
                    }}
                >
                    <Avatar sx={{ bgcolor: `${color}.main`, width: 56, height: 56 }}>{icon}</Avatar>
                    <IconButton size="small">
                        <MoreVertIcon />
                    </IconButton>
                </Box>

                <Typography variant="h4" component="div" sx={{ fontWeight: 600, mb: 1 }}>
                    {value}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {title}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {isPositive ? (
                        <ArrowUpwardIcon sx={{ color: 'success.main', fontSize: 16 }} />
                    ) : (
                        <ArrowDownwardIcon sx={{ color: 'error.main', fontSize: 16 }} />
                    )}
                    <Typography
                        variant="caption"
                        sx={{
                            color: isPositive ? 'success.main' : 'error.main',
                            fontWeight: 600
                        }}
                    >
                        {Math.abs(change)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        so với tháng trước
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
}

function RecentActivity(): ReactElement {
    const activities = [
        {
            id: 1,
            action: 'Tiện ích mở rộng đã cập nhật',
            description: 'Phiên bản 2.1.0 đã triển khai thành công',
            time: '2 giờ trước',
            status: 'thành công'
        },
        {
            id: 2,
            action: 'Đồng bộ dữ liệu',
            description: 'Đã đồng bộ hóa tuỳ chọn người dùng',
            time: '4 giờ trước',
            status: 'thông tin'
        },
        {
            id: 3,
            action: 'Cảnh báo bảo mật',
            description: 'Phát hiện hoạt động đăng nhập bất thường',
            time: '6 giờ trước',
            status: 'cảnh báo'
        },
        {
            id: 4,
            action: 'Sao lưu hoàn tất',
            description: 'Sao lưu hàng ngày đã được thực hiện thành công',
            time: '1 ngày trước',
            status: 'thành công'
        }
    ];

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Hoạt động gần đây
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {activities.map(activity => (
                        <Box
                            key={activity.id}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                p: 2,
                                bgcolor: 'grey.50',
                                borderRadius: 1
                            }}
                        >
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {activity.action}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {activity.description}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip label={activity.status} size="small" variant="outlined" />
                                <Typography variant="caption" color="text.secondary">
                                    {activity.time}
                                </Typography>
                            </Box>
                        </Box>
                    ))}
                </Box>
            </CardContent>
        </Card>
    );
}

function Dashboard(): ReactElement {
    const stats = [
        {
            title: 'Tổng số người dùng',
            value: '2,847',
            change: 12.5,
            icon: <PeopleIcon />,
            color: 'primary' as const
        },
        {
            title: 'Tiện ích đang hoạt động',
            value: '1,234',
            change: 8.2,
            icon: <ExtensionIcon />,
            color: 'success' as const
        },
        {
            title: 'Sự kiện bảo mật',
            value: '23',
            change: -5.1,
            icon: <SecurityIcon />,
            color: 'warning' as const
        },
        {
            title: 'Điểm hiệu suất',
            value: '98.5%',
            change: 2.1,
            icon: <TrendingUpIcon />,
            color: 'secondary' as const
        }
    ];

    return (
        <Box>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, 1fr)',
                        md: 'repeat(4, 1fr)'
                    },
                    gap: 3,
                    mb: 4
                }}
            >
                {stats.map((stat, index) => (
                    <StatCard key={index} {...stat} />
                ))}
            </Box>

            {/* Biểu đồ và Hoạt động */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        md: '2fr 1fr'
                    },
                    gap: 3
                }}
            >
                <Card>
                    <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                            Phân tích sử dụng
                        </Typography>
                        <Box
                            sx={{
                                height: 300,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'grey.50',
                                borderRadius: 1
                            }}
                        >
                            <Typography color="text.secondary">
                                Biểu đồ sẽ được hiển thị tại đây
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
                <RecentActivity />
            </Box>
        </Box>
    );
}

export const Route = createLazyFileRoute('/dashboard/')({
    component: Dashboard
});
