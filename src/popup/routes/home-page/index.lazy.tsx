import { ReactElement } from 'react';

import { Box, Card, CardContent, Typography } from '@mui/material';
import { createLazyFileRoute } from '@tanstack/react-router';

import PopupContent from '@/popup/modules/core/components/PopupContent/PopupContent';
import PopupHeader from '@/popup/modules/core/components/PopupHeader/PopupHeader';

import backgroundLogin from '../../../../assets/images/backgroud-login.svg';

function HomePage(): ReactElement {
    return (
        <>
            <PopupHeader />
            <PopupContent>
                <Box sx={{ width: '100%', height: '100%', display: 'flex' }}>
                    <Card
                        sx={{
                            width: '100%',
                            maxWidth: 920,
                            height: '100%',
                            display: 'flex',
                            flexDirection: { xs: 'column', md: 'row' },
                            flex: 1
                        }}
                    >
                        <CardContent
                            sx={{
                                flex: 1,
                                bgcolor: 'grey.100',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                p: 4,
                                background: 'linear-gradient(180deg, #2f6df5 0%, #6b2ce8 100%)'
                            }}
                        >
                            <Typography
                                variant="h5"
                                sx={{ fontWeight: 600, mb: 1, color: '#fff', textAlign: 'center' }}
                            >
                                HỆ THỐNG NTIC
                            </Typography>
                            <Typography
                                variant="subtitle1"
                                sx={{ mb: 2, color: '#fff', textAlign: 'center' }}
                            >
                                Nền tảng số tích hợp cho quản lý và điều hành
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mb: 3, color: '#fff', textAlign: 'center' }}
                            >
                                NTIC (NTSoft – NT Information Center) là một nền tảng phần mềm tích
                                hợp được phát triển bởi Cty TNHH Phát triển phần mềm Nhật Tâm, cung
                                cấp giải pháp quản lý – điều hành – phân tích dữ liệu toàn diện cho
                                nhiều lĩnh vực và loại hình đơn vị, bao gồm cơ quan nhà nước, doanh
                                nghiệp, tổ chức giáo dục và y tế.
                            </Typography>
                            <Box sx={{ textAlign: 'center', mb: 2 }}>
                                <img
                                    src={backgroundLogin}
                                    alt="NTSOFT Logo"
                                    style={{ maxHeight: 150 }}
                                />
                            </Box>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ mb: 3, color: '#fff', textAlign: 'center' }}
                            >
                                © 2025 nthatamsoft.vn – NTSoft Identity Center
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>
            </PopupContent>
        </>
    );
}

export const Route = createLazyFileRoute('/home-page/')({
    component: HomePage
});
