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
                        vs last month
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
            action: 'Extension Updated',
            description: 'Version 2.1.0 deployed successfully',
            time: '2 hours ago',
            status: 'success'
        },
        {
            id: 2,
            action: 'Data Sync',
            description: 'User preferences synchronized',
            time: '4 hours ago',
            status: 'info'
        },
        {
            id: 3,
            action: 'Security Alert',
            description: 'Unusual login activity detected',
            time: '6 hours ago',
            status: 'warning'
        },
        {
            id: 4,
            action: 'Backup Complete',
            description: 'Daily backup completed successfully',
            time: '1 day ago',
            status: 'success'
        }
    ];

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Recent Activity
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
            title: 'Total Users',
            value: '2,847',
            change: 12.5,
            icon: <PeopleIcon />,
            color: 'primary' as const
        },
        {
            title: 'Active Extensions',
            value: '1,234',
            change: 8.2,
            icon: <ExtensionIcon />,
            color: 'success' as const
        },
        {
            title: 'Security Events',
            value: '23',
            change: -5.1,
            icon: <SecurityIcon />,
            color: 'warning' as const
        },
        {
            title: 'Performance Score',
            value: '98.5%',
            change: 2.1,
            icon: <TrendingUpIcon />,
            color: 'secondary' as const
        }
    ];

    return (
        <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
                Dashboard Overview
            </Typography>

            {/* Stats Cards */}
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

            {/* Charts and Activity */}
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
                            Usage Analytics
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
                                Chart component will be implemented here
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
