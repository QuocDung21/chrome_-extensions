import { ReactElement, useState } from 'react';

import {
    Email as EmailIcon,
    Lock as LockIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Container,
    IconButton,
    InputAdornment,
    Link as MuiLink,
    TextField,
    Typography
} from '@mui/material';
import { Link, createFileRoute } from '@tanstack/react-router';

import backgroundLogin from '../../../assets/images/backgroud-login.svg';
import backgrondImage from '../../../assets/images/background-full-login.jpg';
import logoApple from '../../../assets/images/logo-apple.png';
import logoGoogle from '../../../assets/images/logo-google.png';
import logoMicrosoft from '../../../assets/images/logo-microsoft.png';
import logoNTSoft from '../../../assets/images/logoxoanen.png';
import { useAuth, useRedirectIfAuthenticated } from '../hooks/useAuth';
import type { FileRouteTypes } from '../routeTree.gen';

function SignIn(): ReactElement {
    const { login, isLoading, error, clearError } = useAuth();
    const { isAuthenticated } = useRedirectIfAuthenticated();

    const [formData, setFormData] = useState({
        TenDangNhap: '',
        MatKhau: ''
    });
    const [showPassword, setShowPassword] = useState(false);

    if (isAuthenticated) {
        return <></>;
    }

    const handleInputChange =
        (field: keyof typeof formData) => (event: React.ChangeEvent<HTMLInputElement>) => {
            setFormData(prev => ({
                ...prev,
                [field]: event.target.value
            }));

            if (error) clearError();
        };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!formData.TenDangNhap || !formData.MatKhau) {
            return;
        }

        await login(formData);
    };

    const togglePasswordVisibility = () => {
        setShowPassword(prev => !prev);
    };

    return (
        <Box
            sx={{
                minHeight: '100dvh',
                backgroundImage: `linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.25)), url(${backgrondImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: '#0b1120'
            }}
        >
            <Container component="main" maxWidth="md">
                <Box sx={{ textAlign: 'center', marginTop: 4 }}>
                    <Typography
                        variant="h6"
                        sx={{ color: '#fff', fontWeight: 600, fontSize: '0.8rem' }}
                    >
                        HỆ THỐNG QUẢN TRỊ VÀ ĐIỀU HÀNH NTSOFT - NTIC
                    </Typography>
                    <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.7rem' }}>
                        Đăng ký & kích hoạt bản quyền tập trung
                    </Typography>
                </Box>
                <Box
                    sx={{
                        marginTop: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <Card
                        sx={{
                            width: '100%',
                            maxWidth: 920,
                            maxHeight: 'calc(100dvh - 140px)',
                            display: 'flex',
                            flexDirection: { xs: 'column', md: 'row' }
                        }}
                    >
                        {/* Left panel */}
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

                        {/* Right panel */}
                        <CardContent
                            sx={{
                                flex: 1,
                                p: 4,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center'
                            }}
                        >
                            <Box sx={{ textAlign: 'center', mb: 3 }}>
                                <img src={logoNTSoft} alt="NTSOFT Logo" style={{ maxHeight: 64 }} />
                                <Typography
                                    component="h2"
                                    variant="h5"
                                    sx={{ mt: 2, fontWeight: 600 }}
                                >
                                    ĐĂNG NHẬP
                                </Typography>
                            </Box>

                            <Box component="form" onSubmit={handleSubmit}>
                                {error && (
                                    <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
                                        {error}
                                    </Alert>
                                )}

                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    id="TenDangNhap"
                                    label="ID NTIC / Số điện thoại / Email"
                                    name="TenDangNhap"
                                    autoComplete="username"
                                    autoFocus
                                    value={formData.TenDangNhap}
                                    onChange={handleInputChange('TenDangNhap')}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <EmailIcon color="action" />
                                            </InputAdornment>
                                        )
                                    }}
                                />

                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="MatKhau"
                                    label="Mật khẩu"
                                    type={showPassword ? 'text' : 'password'}
                                    id="MatKhau"
                                    autoComplete="current-password"
                                    value={formData.MatKhau}
                                    onChange={handleInputChange('MatKhau')}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockIcon color="action" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    aria-label="toggle password visibility"
                                                    onClick={togglePasswordVisibility}
                                                    edge="end"
                                                >
                                                    {showPassword ? (
                                                        <VisibilityOffIcon />
                                                    ) : (
                                                        <VisibilityIcon />
                                                    )}
                                                </IconButton>
                                            </InputAdornment>
                                        )
                                    }}
                                />

                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    sx={{ mt: 3, mb: 2, py: 1.5 }}
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                                </Button>

                                <Box
                                    sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}
                                >
                                    <MuiLink href="/hethong/quenmatkhau" variant="body2">
                                        Quên mật khẩu?
                                    </MuiLink>
                                    <MuiLink
                                        component={Link}
                                        to={'/signup' as FileRouteTypes['to']}
                                        variant="body2"
                                    >
                                        Đăng ký
                                    </MuiLink>
                                </Box>

                                {/* <Typography variant="body2" align="center" sx={{ mb: 2 }}>
                                    Hoặc đăng nhập với
                                </Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                                    <Button
                                        variant="outlined"
                                        sx={{
                                            minWidth: 0,
                                            width: 56,
                                            height: 56,
                                            borderRadius: '50%'
                                        }}
                                    >
                                        <img src={logoGoogle} width="30" alt="Google" />
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        sx={{
                                            minWidth: 0,
                                            width: 56,
                                            height: 56,
                                            borderRadius: '50%'
                                        }}
                                    >
                                        <img src={logoApple} width="30" alt="Apple" />
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        sx={{
                                            minWidth: 0,
                                            width: 56,
                                            height: 56,
                                            borderRadius: '50%'
                                        }}
                                    >
                                        <img src={logoMicrosoft} width="30" alt="Microsoft" />
                                    </Button>
                                </Box> */}
                            </Box>
                        </CardContent>
                    </Card>

                    <Box textAlign="center" py={2} className="tieude-login">
                        <Typography sx={{ color: '#fff', marginTop: 1, fontSize: '0.7rem' }}>
                            Trợ giúp |{' '}
                            <MuiLink
                                href="https://nhattamsoft.vn"
                                target="_blank"
                                underline="none"
                                sx={{ color: '#fff' }}
                            >
                                NTSOFT
                            </MuiLink>
                        </Typography>
                    </Box>
                </Box>
            </Container>
        </Box>
    );
}

export const Route = createFileRoute('/signin')({
    component: SignIn
});
