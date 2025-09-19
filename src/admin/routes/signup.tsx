import { ReactElement, useEffect, useState } from 'react';

import {
    Business as BusinessIcon,
    Email as EmailIcon,
    Home as HomeIcon,
    Lock as LockIcon,
    Person as PersonIcon,
    Phone as PhoneIcon,
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
    Checkbox,
    Container,
    FormControlLabel,
    IconButton,
    InputAdornment,
    Link as MuiLink,
    TextField,
    Typography
} from '@mui/material';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';

// ✅ import images from assets
import backgroundLogin from '../../../assets/images/backgroud-login.svg';
import backgrondImage from '../../../assets/images/background-full-login.jpg';
import logoApple from '../../../assets/images/logo-apple.png';
import logoGoogle from '../../../assets/images/logo-google.png';
import logoMicrosoft from '../../../assets/images/logo-microsoft.png';
import logoNTSoft from '../../../assets/images/logoxoanen.png';
import { useRedirectIfAuthenticated } from '../hooks/useAuth';
import type { FileRouteTypes } from '../routeTree.gen';
import signupService, { SignupRequest } from '../services/signupService';

function SignUp(): ReactElement {
    const { isAuthenticated } = useRedirectIfAuthenticated();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        address: '',
        taxCode: '',
        password: '',
        privacyPolicy: false
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<{ code?: number; message: string } | null>(null);

    if (isAuthenticated) {
        return <></>;
    }

    // --- Email validation with debouncing ---
    useEffect(() => {
        const checkEmail = async () => {
            if (!formData.email || formData.email.length < 5) {
                setEmailError(null);
                setIsCheckingEmail(false);
                return;
            }
            setIsCheckingEmail(true);
            setEmailError(null);
            try {
                const response = await signupService.checkEmail(formData.email);
                if (!response.Succeeded) {
                    const msg = response.Errors.join(', ');
                    const match = msg.match(/^(\d+)_+(.*)$/);
                    if (match) {
                        setEmailError({ code: parseInt(match[1], 10), message: match[2].trim() });
                    } else {
                        setEmailError({ message: msg });
                    }
                } else {
                    setEmailError(null);
                }
            } catch (err: any) {
                setEmailError({
                    code: err.code ? parseInt(err.code, 10) : undefined,
                    message: err.message
                });
            } finally {
                setIsCheckingEmail(false);
            }
        };
        const timeoutId = setTimeout(checkEmail, 800);
        return () => clearTimeout(timeoutId);
    }, [formData.email]);

    const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [field]: event.target.value }));
        if (error) setError(null);
    };

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, privacyPolicy: event.target.checked }));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);

        if (
            !formData.fullName ||
            !formData.email ||
            !formData.phone ||
            !formData.address ||
            !formData.taxCode ||
            !formData.password
        ) {
            setError('Vui lòng điền đầy đủ thông tin');
            return;
        }
        if (formData.password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự!');
            return;
        }
        if (!formData.privacyPolicy) {
            setError('Vui lòng đồng ý với điều khoản và chính sách quyền riêng tư');
            return;
        }
        if (emailError) {
            setError('Email không hợp lệ. Vui lòng kiểm tra lại.');
            return;
        }

        setIsLoading(true);
        try {
            const signupData: SignupRequest = {
                HoVaTen: formData.fullName,
                Email: formData.email,
                SoDienThoai: formData.phone,
                DiaChi: formData.address,
                MaSoThue: formData.taxCode,
                MatMa: formData.password,
                BaseUrl: window.location.origin,
                ChinhSachQuyenRiengTu: formData.privacyPolicy
            };
            const response = await signupService.signup(signupData);
            if (!response.Succeeded) {
                const msg = response.Errors.join(', ');
                const clean = msg.replace(/^\d+_+/, '');
                setError(clean);
                return;
            }
            window.location.href = `#${'/signin' as FileRouteTypes['to']}`;
        } catch (err: any) {
            setError(err.message || 'Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = () => setShowPassword(prev => !prev);

    const handleVerifyEmailClick = async () => {
        if (!formData.email) return;
        try {
            const response = await signupService.resendVerification(formData.email);
            if (response.Succeeded === true) {
                navigate({
                    to: '/verify-email' as FileRouteTypes['to'],
                    search: { email: formData.email }
                });
            } else {
                setError('Không thể gửi email xác thực. Vui lòng thử lại.');
            }
        } catch {
            setError('Đã xảy ra lỗi khi gửi email xác thực. Vui lòng thử lại.');
        }
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
            <Container component="main" maxWidth="md" sx={{ py: 2 }}>
                {/* Top headings outside the card */}
                <Box sx={{ textAlign: 'center', marginTop: 4, marginBottom: 1 }}>
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
                                p: 3,
                                background: 'linear-gradient(180deg, #2f6df5 0%, #6b2ce8 100%)'
                            }}
                        >
                            <Typography
                                variant="subtitle1"
                                sx={{ fontWeight: 700, mb: 1, color: '#fff', textAlign: 'center' }}
                            >
                                HỆ THỐNG NTIC
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{ mb: 1, color: '#fff', textAlign: 'center' }}
                            >
                                Nền tảng số tích hợp cho quản lý và điều hành
                            </Typography>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ mb: 2, color: '#fff', textAlign: 'center' }}
                            >
                                NTIC (NTSoft – NT Information Center) là một nền tảng phần mềm tích
                                hợp được phát triển bởi Cty TNHH Phát triển phần mềm Nhật Tâm, cung
                                cấp giải pháp quản lý – điều hành – phân tích dữ liệu toàn diện cho
                                nhiều lĩnh vực và loại hình đơn vị, bao gồm cơ quan nhà nước, doanh
                                nghiệp, tổ chức giáo dục và y tế.
                            </Typography>
                            <Box sx={{ textAlign: 'center', mb: 1 }}>
                                <img
                                    src={backgroundLogin}
                                    alt="NTSOFT Logo"
                                    style={{ maxHeight: 120 }}
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
                                p: 3,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                maxHeight: 'calc(100dvh - 160px)',
                                overflowY: 'auto'
                            }}
                        >
                            <Box sx={{ textAlign: 'center', mb: 2 }}>
                                <img src={logoNTSoft} alt="NTSOFT Logo" style={{ maxHeight: 64 }} />
                                <Typography
                                    component="h2"
                                    variant="subtitle1"
                                    sx={{ mt: 0.5, fontWeight: 400, fontSize: '0.8rem' }}
                                >
                                    ĐĂNG KÝ TÀI KHOẢN NTSOFT - NTIC
                                </Typography>
                                <Typography color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                                    Bạn đã sử dụng NTSOFT NTIC?{' '}
                                    <MuiLink
                                        component={Link}
                                        to={'/signin' as FileRouteTypes['to']}
                                    >
                                        Đăng nhập
                                    </MuiLink>
                                </Typography>
                            </Box>

                            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 0 }}>
                                {error && (
                                    <Alert
                                        severity="error"
                                        sx={{ mb: 2 }}
                                        onClose={() => setError(null)}
                                    >
                                        {error}
                                    </Alert>
                                )}

                                {/* Fullname */}
                                <TextField
                                    margin="dense"
                                    size="small"
                                    fullWidth
                                    id="fullName"
                                    label="Họ và tên"
                                    value={formData.fullName}
                                    onChange={handleInputChange('fullName')}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <PersonIcon />
                                            </InputAdornment>
                                        ),
                                        sx: { fontSize: '0.85rem', py: 0.5 }
                                    }}
                                    InputLabelProps={{
                                        sx: { fontSize: '0.75rem' }
                                    }}
                                />

                                {/* Email */}
                                <TextField
                                    margin="dense"
                                    size="small"
                                    fullWidth
                                    id="email"
                                    label="Email"
                                    value={formData.email}
                                    onChange={handleInputChange('email')}
                                    error={!!emailError}
                                    helperText={
                                        emailError ? (
                                            <>
                                                <span>{emailError.message}</span>
                                                {emailError.code === 1 && (
                                                    <Button
                                                        component={Link}
                                                        to={'/signin' as FileRouteTypes['to']}
                                                        size="small"
                                                        sx={{ ml: 1 }}
                                                    >
                                                        Đăng nhập ngay
                                                    </Button>
                                                )}
                                                {emailError.code === 2 && (
                                                    <Button
                                                        onClick={handleVerifyEmailClick}
                                                        size="small"
                                                        sx={{ ml: 1 }}
                                                    >
                                                        Xác thực email
                                                    </Button>
                                                )}
                                            </>
                                        ) : isCheckingEmail ? (
                                            'Đang kiểm tra email...'
                                        ) : (
                                            ''
                                        )
                                    }
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <EmailIcon />
                                            </InputAdornment>
                                        ),
                                        sx: { fontSize: '0.85rem', py: 0.5 }
                                    }}
                                    InputLabelProps={{
                                        sx: { fontSize: '0.75rem' }
                                    }}
                                />

                                {/* Phone */}
                                <TextField
                                    margin="dense"
                                    size="small"
                                    fullWidth
                                    id="phone"
                                    label="Số điện thoại"
                                    value={formData.phone}
                                    onChange={handleInputChange('phone')}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <PhoneIcon />
                                            </InputAdornment>
                                        ),
                                        sx: { fontSize: '0.85rem', py: 0.5 }
                                    }}
                                    InputLabelProps={{
                                        sx: { fontSize: '0.75rem' }
                                    }}
                                />

                                {/* Tax Code */}
                                <TextField
                                    margin="dense"
                                    size="small"
                                    fullWidth
                                    id="taxCode"
                                    label="Mã số thuế"
                                    value={formData.taxCode}
                                    onChange={handleInputChange('taxCode')}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <BusinessIcon />
                                            </InputAdornment>
                                        ),
                                        sx: { fontSize: '0.85rem', py: 0.5 }
                                    }}
                                    InputLabelProps={{
                                        sx: { fontSize: '0.75rem' }
                                    }}
                                />

                                {/* Password */}
                                <TextField
                                    margin="dense"
                                    size="small"
                                    fullWidth
                                    id="password"
                                    label="Mật khẩu"
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={handleInputChange('password')}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockIcon />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    onClick={togglePasswordVisibility}
                                                    edge="end"
                                                    size="small"
                                                >
                                                    {showPassword ? (
                                                        <VisibilityOffIcon />
                                                    ) : (
                                                        <VisibilityIcon />
                                                    )}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                        sx: { fontSize: '0.85rem', py: 0.5 }
                                    }}
                                    InputLabelProps={{
                                        sx: { fontSize: '0.75rem' }
                                    }}
                                />

                                {/* Address */}
                                <TextField
                                    margin="dense"
                                    size="small"
                                    fullWidth
                                    id="address"
                                    label="Địa chỉ"
                                    value={formData.address}
                                    onChange={handleInputChange('address')}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <HomeIcon />
                                            </InputAdornment>
                                        ),
                                        sx: { fontSize: '0.85rem', py: 0.5 }
                                    }}
                                    InputLabelProps={{
                                        sx: { fontSize: '0.75rem' }
                                    }}
                                />

                                {/* Terms */}
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={formData.privacyPolicy}
                                            onChange={handleCheckboxChange}
                                            color="primary"
                                        />
                                    }
                                    label="Tôi đồng ý với Điều khoản dịch vụ và Chính sách quyền riêng tư"
                                    sx={{
                                        mt: 1,
                                        '& .MuiFormControlLabel-label': {
                                            fontSize: '0.75rem'
                                        }
                                    }}
                                />

                                {/* Submit */}
                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    size="small"
                                    sx={{ mt: 1, py: 1, fontSize: '0.6rem' }}
                                    disabled={isLoading || isCheckingEmail || !!emailError}
                                >
                                    {isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
                                </Button>
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

export const Route = createFileRoute('/signup')({
    component: SignUp
});
