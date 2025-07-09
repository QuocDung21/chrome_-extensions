import { ReactElement } from 'react';

import {
    Box,
    Card,
    CardContent,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography
} from '@mui/material';
import { createLazyFileRoute } from '@tanstack/react-router';

function ProductPackage(): ReactElement {
    const topPages = [
        { page: '/dashboard', views: 4521, percentage: 35.2 },
        { page: '/analytics', views: 2847, percentage: 22.1 },
        { page: '/settings', views: 1923, percentage: 14.9 },
        { page: '/users', views: 1456, percentage: 11.3 },
        { page: '/logs', views: 1100, percentage: 8.5 }
    ];

    return (
        <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
                Analytics & Reports
            </Typography>

            {/* Key Metrics */}

            {/* Top Pages Table */}
            <Card>
                <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                        Top Pages
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Page</TableCell>
                                    <TableCell align="right">Views</TableCell>
                                    <TableCell align="right">Percentage</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {topPages.map((row, index) => (
                                    <TableRow key={index}>
                                        <TableCell component="th" scope="row">
                                            {row.page}
                                        </TableCell>
                                        <TableCell align="right">
                                            {row.views.toLocaleString()}
                                        </TableCell>
                                        <TableCell align="right">{row.percentage}%</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </Box>
    );
}

export const Route = createLazyFileRoute('/product-package/')({
    component: ProductPackage
});
