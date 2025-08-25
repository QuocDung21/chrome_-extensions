import { ReactElement } from 'react';

import {
    AdminPanelSettings as AdminIcon,
    Description as DocumentIcon,
    TrendingUp as EconomicIcon,
    Assignment as FormIcon,
    Info as InfoIcon,
    Gavel as LegalIcon,
    CreditCard as NonStructuredIcon,
    Scanner as OCRIcon,
    QrCode as QRIcon,
    AppRegistration as RegisterIcon,
    RoomService as ServiceIcon,
    DriveFileRenameOutline as TemplateFillerIcon,
    CloudUpload as UploadIcon,
    EditNote as WordMapperIcon,
    Description as WordViewerIcon,
    ArticleOutlined as ArticleIcon
} from '@mui/icons-material';
import {
    Box,
    Chip,
    Divider,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography
} from '@mui/material';
import { Link, useLocation } from '@tanstack/react-router';

interface NavigationItem {
    id: string;
    label: string;
    icon: ReactElement;
    path: string;
    badge?: string | number;
    disabled?: boolean;
}

const mainItems: NavigationItem[] = [
    {
        id: 'ocr',
        label: 'OCR Lịch sử',
        icon: <OCRIcon />,
        path: '/ocr'
    },
    {
        id: 'admin-procedures',
        label: 'Thủ tục hành chính',
        icon: <AdminIcon />,
        path: '/admin-procedures'
    }
];

const scanningItems: NavigationItem[] = [
    {
        id: 'qr-cccd',
        label: 'Quét QR CCCD',
        icon: <QRIcon />,
        path: '/qr-cccd'
    },
    // {
    //     id: 'word-mapper',
    //     label: 'Mẫu đơn, tờ khai',
    //     icon: <WordMapperIcon />,
    //     path: '/forms'
    //     // badge: 'NEW'
    // },
    // {
    //     id: 'word-mapper',
    //     label: 'Mẫu đơn, tờ khai',
    //     icon: <WordMapperIcon />,
    //     path: '/word-mapper',
    //     badge: 'NEW'
    // },
    {
        id: 'template-filler',
        label: 'Soạn thảo mẫu',
        icon: <TemplateFillerIcon />,
        path: '/template-filler'
    }
    // {
    //     id: 'word-viewer',
    //     label: 'Xem Word',
    //     icon: <WordViewerIcon />,
    //     path: '/word-viewer'
    // }
    // {
    //     id: 'procedures',
    //     label: 'Thủ tục hành chính',
    //     icon: <ArticleIcon />,
    //     path: '/procedures'
    // }
];

const documentsItems: NavigationItem[] = [
    {
        id: 'upload',
        label: 'Tài liệu',
        icon: <UploadIcon />,
        path: '/upload'
    },
    {
        id: 'admin-documents',
        label: 'Văn bản hành chính',
        icon: <DocumentIcon />,
        path: '/admin-documents'
    },
    {
        id: 'legal-docs',
        label: 'Hóa đơn, chứng từ có cấu trúc',
        icon: <LegalIcon />,
        path: '/legal-docs'
    },
    {
        id: 'non-structured',
        label: 'Chứng từ phi cấu trúc',
        icon: <NonStructuredIcon />,
        path: '/non-structured'
    },
    {
        id: 'economic',
        label: 'Hợp đồng kinh tế',
        icon: <EconomicIcon />,
        path: '/economic'
    }
];

const systemItems: NavigationItem[] = [
    {
        id: 'register',
        label: 'Đăng ký sử dụng',
        icon: <RegisterIcon />,
        path: '/register'
    },
    {
        id: 'services',
        label: 'Gói dịch vụ',
        icon: <ServiceIcon />,
        path: '/services'
    },
    {
        id: 'info',
        label: 'Thông tin ứng dụng',
        icon: <InfoIcon />,
        path: '/info'
    }
];

interface NavigationSectionProps {
    title: string;
    items: NavigationItem[];
}

function NavigationSection({ title, items }: NavigationSectionProps): ReactElement {
    const location = useLocation();

    return (
        <Box sx={{ mb: 2 }}>
            <Typography
                variant="overline"
                sx={{
                    px: 2,
                    py: 1,
                    display: 'block',
                    color: 'text.secondary',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    letterSpacing: '0.08333em'
                }}
            >
                {title}
            </Typography>
            <List sx={{ py: 0 }}>
                {items.map(item => {
                    const isActive = location.pathname === item.path;
                    return (
                        <ListItem key={item.id} disablePadding>
                            <ListItemButton
                                component={Link}
                                to={item.path}
                                disabled={item.disabled}
                                sx={{
                                    mx: 1,
                                    borderRadius: 1,
                                    '&.active': {
                                        backgroundColor: 'primary.main',
                                        color: 'primary.contrastText',
                                        '& .MuiListItemIcon-root': {
                                            color: 'primary.contrastText'
                                        },
                                        '&:hover': {
                                            backgroundColor: 'primary.dark'
                                        }
                                    },
                                    ...(isActive && {
                                        backgroundColor: 'primary.main',
                                        color: 'primary.contrastText',
                                        '& .MuiListItemIcon-root': {
                                            color: 'primary.contrastText'
                                        },
                                        '&:hover': {
                                            backgroundColor: 'primary.dark'
                                        }
                                    })
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                                <ListItemText
                                    primary={item.label}
                                    primaryTypographyProps={{
                                        fontSize: '0.875rem',
                                        fontWeight: isActive ? 600 : 400
                                    }}
                                />
                                {item.badge && (
                                    <Chip
                                        label={item.badge}
                                        size="small"
                                        color={
                                            typeof item.badge === 'number' ? 'error' : 'secondary'
                                        }
                                        sx={{
                                            height: 20,
                                            fontSize: '0.75rem',
                                            fontWeight: 600
                                        }}
                                    />
                                )}
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
        </Box>
    );
}

export default function Sidebar(): ReactElement {
    return (
        <Box sx={{ py: 1 }}>
            <NavigationSection title="Chính" items={mainItems} />
            <Divider sx={{ mx: 2, my: 1 }} />
            <NavigationSection title="Quét & Nhận dạng" items={scanningItems} />
            <Divider sx={{ mx: 2, my: 1 }} />
            <NavigationSection title="Quản lý tài liệu" items={documentsItems} />
            <Divider sx={{ mx: 2, my: 1 }} />
            <NavigationSection title="Hệ thống" items={systemItems} />
        </Box>
    );
}
