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
    // Instead of a string
    const [emailError, setEmailError] = useState<{ code?: number; message: string } | null>(null);

    // Redirect if already authenticated
    if (isAuthenticated) {
        return <></>;
    }

    // Email validation with debouncing
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
        setFormData(prev => ({
            ...prev,
            [field]: event.target.value
        }));

        // Clear error when user starts typing
        if (error) {
            setError(null);
        }
    };

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            privacyPolicy: event.target.checked
        }));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        // Clear previous errors
        setError(null);

        // Basic validation
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

            // After successful signup, redirect to signin
            window.location.href = `#${'/signin' as FileRouteTypes['to']}`;
        } catch (err: any) {
            setError(err.message || 'Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(prev => !prev);
    };

    const handleVerifyEmailClick = async () => {
        console.log("handleVerifyEmailClick");
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
        } catch (error: any) {
            setError('Đã xảy ra lỗi khi gửi email xác thực. Vui lòng thử lại.');
        }
    };

    return (
        <Container component="main" maxWidth="sm">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minHeight: '100vh',
                    justifyContent: 'center'
                }}
            >
                <Card sx={{ width: '100%', maxWidth: 500 }}>
                    <CardContent sx={{ p: 4 }}>
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}
                        >
                            <Avatar sx={{ m: 1, bgcolor: 'primary.main', width: 56, height: 56 }}>
                                <PersonIcon />
                            </Avatar>
                            <Typography component="h1" variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
                                Đăng ký
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mb: 3, textAlign: 'center' }}
                            >
                                Tạo tài khoản mới để bắt đầu sử dụng dịch vụ của chúng tôi.
                            </Typography>
                        </Box>

                        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
                            {error && (
                                <Alert
                                    severity="error"
                                    sx={{ mb: 2 }}
                                    onClose={() => setError(null)}
                                >
                                    {error}
                                </Alert>
                            )}

                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="fullName"
                                label="Họ và tên"
                                name="fullName"
                                autoComplete="name"
                                value={formData.fullName}
                                onChange={handleInputChange('fullName')}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <PersonIcon color="action" />
                                        </InputAdornment>
                                    )
                                }}
                            />

                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="email"
                                label="Email"
                                name="email"
                                autoComplete="email"
                                value={formData.email}
                                onChange={handleInputChange('email')}
                                error={!!emailError} // stays boolean
                                helperText={
                                    emailError ? (
                                        <>
                                            <span>{emailError.message}</span>
                                            {emailError.code === 1 && (
                                                <Button
                                                    component={Link}
                                                    to={'/signin' as FileRouteTypes['to']}
                                                    size="small"
                                                    sx={{ ml: 1, textTransform: 'none' }}
                                                >
                                                    Đăng nhập ngay
                                                </Button>
                                            )}
                                            {emailError.code === 2 && (
                                                <Button
                                                    onClick={handleVerifyEmailClick}
                                                    size="small"
                                                    sx={{ ml: 1, textTransform: 'none' }}
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
                                            <EmailIcon color="action" />
                                        </InputAdornment>
                                    )
                                }}
                            />

                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="phone"
                                label="Số điện thoại"
                                name="phone"
                                autoComplete="tel"
                                value={formData.phone}
                                onChange={handleInputChange('phone')}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <PhoneIcon color="action" />
                                        </InputAdornment>
                                    )
                                }}
                            />

                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="address"
                                label="Địa chỉ"
                                name="address"
                                autoComplete="address-line1"
                                value={formData.address}
                                onChange={handleInputChange('address')}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <HomeIcon color="action" />
                                        </InputAdornment>
                                    )
                                }}
                            />

                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="taxCode"
                                label="Mã số thuế"
                                name="taxCode"
                                value={formData.taxCode}
                                onChange={handleInputChange('taxCode')}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <BusinessIcon color="action" />
                                        </InputAdornment>
                                    )
                                }}
                            />

                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="password"
                                label="Mật khẩu"
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                autoComplete="new-password"
                                value={formData.password}
                                onChange={handleInputChange('password')}
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

                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={formData.privacyPolicy}
                                        onChange={handleCheckboxChange}
                                        color="primary"
                                    />
                                }
                                label="Tôi đồng ý với điều khoản và dịch vụ, chính sách quyền riêng tư"
                                sx={{ mt: 2, mb: 1 }}
                            />

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                sx={{ mt: 2, mb: 2, py: 1.5 }}
                                disabled={isLoading || isCheckingEmail || !!emailError}
                            >
                                {isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
                            </Button>

                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="body2">
                                    Đã có tài khoản?{' '}
                                    <MuiLink
                                        component={Link}
                                        to={'/signin' as FileRouteTypes['to']}
                                        variant="body2"
                                    >
                                        Đăng nhập ngay
                                    </MuiLink>
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </Container>
    );
}

export const Route = createFileRoute('/signup')({
    component: SignUp
});
