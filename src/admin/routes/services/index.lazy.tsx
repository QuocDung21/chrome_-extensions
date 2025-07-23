import { ReactElement } from 'react';

import {
    Assignment as AssignmentIcon,
    CheckCircle as CheckIcon,
    Description as DescriptionIcon,
    QrCode as QrCodeIcon,
    Scanner as ScannerIcon,
    Star as StarIcon,
    Token as TokenIcon
} from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Typography
} from '@mui/material';
import { createLazyFileRoute } from '@tanstack/react-router';

const servicePackages = [
    {
        id: 1,
        title: 'Gói Cơ Bản',
        subtitle: 'Starter Package',
        price: '299,000đ',
        period: '/tháng',
        popular: false,
        color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        features: [
            { icon: <QrCodeIcon />, text: 'Quét QR', included: true },
            { icon: <ScannerIcon />, text: 'OCR', included: true },
            { icon: <TokenIcon />, text: 'Số lượng Tokens: 1,000 tokens', included: true },
            { icon: <AssignmentIcon />, text: 'Số lượng TTHC: 50 thủ tục', included: true },
            {
                icon: <DescriptionIcon />,
                text: 'Số lượng form nhập liệu: 100 forms',
                included: true
            }
        ],
        documentTypes: ['QR CCCD', 'Mẫu đơn', 'Tờ khai', 'Hóa đơn VAT', 'Chứng từ KBNN']
    },
    {
        id: 2,
        title: 'Gói Chuyên Nghiệp',
        subtitle: 'Professional Package',
        price: '599,000đ',
        period: '/tháng',
        popular: true,
        color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        features: [
            { icon: <QrCodeIcon />, text: 'Quét QR', included: true },
            { icon: <ScannerIcon />, text: 'OCR', included: true },
            { icon: <TokenIcon />, text: 'Số lượng Tokens: 5,000 tokens', included: true },
            { icon: <AssignmentIcon />, text: 'Số lượng TTHC: 200 thủ tục', included: true },
            {
                icon: <DescriptionIcon />,
                text: 'Số lượng form nhập liệu: 500 forms',
                included: true
            }
        ],
        documentTypes: [
            'QR CCCD',
            'Mẫu đơn',
            'Tờ khai',
            'Hóa đơn VAT',
            'Chứng từ KBNN',
            'Phiếu nhập/xuất kho',
            'Hợp đồng kinh tế'
        ]
    },
    {
        id: 3,
        title: 'Gói Doanh Nghiệp',
        subtitle: 'Enterprise Package',
        price: '1,299,000đ',
        period: '/tháng',
        popular: false,
        color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        features: [
            { icon: <QrCodeIcon />, text: 'Quét QR', included: true },
            { icon: <ScannerIcon />, text: 'OCR', included: true },
            { icon: <TokenIcon />, text: 'Số lượng Tokens: Không giới hạn', included: true },
            { icon: <AssignmentIcon />, text: 'Số lượng TTHC: Không giới hạn', included: true },
            {
                icon: <DescriptionIcon />,
                text: 'Số lượng form nhập liệu: Không giới hạn',
                included: true
            }
        ],
        documentTypes: [
            'QR CCCD',
            'Mẫu đơn',
            'Tờ khai',
            'Hóa đơn VAT',
            'Chứng từ KBNN',
            'Phiếu nhập/xuất kho',
            'Hợp đồng kinh tế',
            'Tài liệu tùy chỉnh'
        ]
    }
];

function ServicePackageCard({ servicePackage }: { servicePackage: any }): ReactElement {
    return (
        <Card
            sx={{
                height: 480,
                maxWidth: 320,
                mx: 'auto',
                background: servicePackage.color,
                borderRadius: '16px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                border: 'none',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.25)'
                }
            }}
        >
            {/* Popular Badge */}
            {servicePackage.popular && (
                <Chip
                    icon={<StarIcon />}
                    label="PHỔ BIẾN"
                    sx={{
                        position: 'absolute',
                        top: 5,
                        right: 5,
                        backgroundColor: '#FFD700',
                        color: '#333',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        zIndex: 1,
                        height: 24
                    }}
                />
            )}

            <CardContent
                sx={{
                    p: 3,
                    color: 'white',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Header */}
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 800,
                            mb: 0.5,
                            fontSize: '1.4rem'
                        }}
                    >
                        {servicePackage.title}
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            opacity: 0.9,
                            mb: 1.5,
                            fontStyle: 'italic',
                            fontSize: '0.85rem'
                        }}
                    >
                        {servicePackage.subtitle}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 900,
                                fontSize: '1.6rem'
                            }}
                        >
                            {servicePackage.price}
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                opacity: 0.8,
                                ml: 0.5,
                                fontSize: '0.8rem'
                            }}
                        >
                            {servicePackage.period}
                        </Typography>
                    </Box>
                </Box>

                <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.3)', mb: 2 }} />

                {/* Features */}
                <Box sx={{ flex: 1 }}>
                    <Typography
                        variant="body1"
                        sx={{
                            fontWeight: 700,
                            mb: 1.5,
                            fontSize: '0.95rem'
                        }}
                    >
                        Tính năng:
                    </Typography>
                    <List sx={{ p: 0 }}>
                        {servicePackage.features.slice(0, 3).map((feature: any, index: number) => (
                            <ListItem key={index} sx={{ p: 0, mb: 0.5 }}>
                                <ListItemIcon sx={{ minWidth: 24 }}>
                                    <CheckIcon sx={{ color: '#4CAF50', fontSize: 16 }} />
                                </ListItemIcon>
                                <ListItemText
                                    primary={feature.text}
                                    primaryTypographyProps={{
                                        fontSize: '0.8rem',
                                        fontWeight: 500
                                    }}
                                />
                            </ListItem>
                        ))}
                    </List>

                    <Typography
                        variant="body1"
                        sx={{
                            fontWeight: 700,
                            mb: 1,
                            mt: 2,
                            fontSize: '0.95rem'
                        }}
                    >
                        Tài liệu:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {servicePackage.documentTypes
                            .slice(0, 4)
                            .map((type: string, index: number) => (
                                <Chip
                                    key={index}
                                    label={type}
                                    size="small"
                                    sx={{
                                        backgroundColor: 'rgba(255,255,255,0.2)',
                                        color: 'white',
                                        fontSize: '0.65rem',
                                        fontWeight: 500,
                                        height: 20
                                    }}
                                />
                            ))}
                        {servicePackage.documentTypes.length > 4 && (
                            <Chip
                                label={`+${servicePackage.documentTypes.length - 4}`}
                                size="small"
                                sx={{
                                    backgroundColor: 'rgba(255,255,255,0.3)',
                                    color: 'white',
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    height: 20
                                }}
                            />
                        )}
                    </Box>
                </Box>

                {/* CTA Button */}
                <Button
                    variant="contained"
                    fullWidth
                    sx={{
                        mt: 2,
                        py: 1,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        borderRadius: '8px',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        '&:hover': {
                            backgroundColor: 'rgba(255,255,255,0.3)',
                            transform: 'translateY(-1px)'
                        }
                    }}
                >
                    CHỌN GÓI
                </Button>
            </CardContent>
        </Card>
    );
}

function ServicesPage(): ReactElement {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                // background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Background Elements */}
            <Box
                sx={{
                    position: 'absolute',
                    top: -50,
                    right: -50,
                    width: 200,
                    height: 200,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    zIndex: 0
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    bottom: -100,
                    left: -100,
                    width: 300,
                    height: 300,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                    zIndex: 0
                }}
            />

            <Box sx={{ position: 'relative', zIndex: 1, p: 2 }}>
                {/* Header */}
                {/* <Box sx={{ textAlign: 'center', mb: 6 }}>
                    <Typography
                        variant="h2"
                        sx={{
                            fontWeight: 900,
                            mb: 2,
                            color: 'white',
                            fontSize: { xs: '2.5rem', md: '3.5rem' },
                            textShadow: '0 4px 8px rgba(0,0,0,0.3)'
                        }}
                    >
                        Gói Dịch Vụ
                    </Typography>
                    <Typography
                        variant="h5"
                        sx={{
                            color: 'rgba(255,255,255,0.9)',
                            fontWeight: 400,
                            maxWidth: 600,
                            mx: 'auto',
                            lineHeight: 1.6
                        }}
                    >
                        Chọn gói dịch vụ phù hợp với nhu cầu của bạn
                    </Typography>
                </Box> */}

                {/* Service Packages Grid */}
                <Box
                    sx={{
                        display: 'flex',
                        gap: 3,
                        justifyContent: 'center',
                        maxWidth: 1200,
                        mx: 'auto',
                        mb: 6,
                        flexWrap: 'wrap'
                    }}
                >
                    {servicePackages.map(servicePackage => (
                        <Box key={servicePackage.id} sx={{ flex: '1 1 300px', maxWidth: 350 }}>
                            <ServicePackageCard servicePackage={servicePackage} />
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );
}

export const Route = createLazyFileRoute('/services/')({
    component: ServicesPage
});
