import { ReactElement, useState } from 'react';

import {
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Email as EmailIcon,
    Lock as LockIcon,
    Person as PersonIcon
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
    TextField,
    Typography,
    Link as MuiLink
} from '@mui/material';
import { createFileRoute, Link } from '@tanstack/react-router';
import type { FileRouteTypes } from '../routeTree.gen';

import { useRedirectIfAuthenticated } from '../hooks/useAuth';

function SignUp(): ReactElement {
    const { isAuthenticated } = useRedirectIfAuthenticated();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Redirect if already authenticated
    if (isAuthenticated) {
        return <></>;
    }

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

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        
        // Clear previous errors
        setError(null);
        
        // Basic validation
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
            setError('Vui lòng điền đầy đủ thông tin');
            return;
        }
        
        if (formData.password !== formData.confirmPassword) {
            setError('Mật khẩu xác nhận không khớp!');
            return;
        }
        
        if (formData.password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự!');
            return;
        }

        setIsLoading(true);
        
        try {
            // For now, just simulate API call
            // In a real app, you would call a signup API here
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // After successful signup, redirect to signin
            // In a real app, you might want to auto-login or show success message
            window.location.href = `#${'/signin' as FileRouteTypes['to']}`;
        } catch (err) {
            setError('Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(prev => !prev);
    };

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(prev => !prev);
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
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                                Tạo tài khoản mới để bắt đầu sử dụng dịch vụ của chúng tôi.
                            </Typography>
                        </Box>

                        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
                            {error && (
                                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                                    {error}
                                </Alert>
                            )}
                            
                            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                <TextField
                                    required
                                    fullWidth
                                    id="firstName"
                                    label="Họ"
                                    name="firstName"
                                    autoComplete="given-name"
                                    value={formData.firstName}
                                    onChange={handleInputChange('firstName')}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <PersonIcon color="action" />
                                            </InputAdornment>
                                        )
                                    }}
                                />
                                <TextField
                                    required
                                    fullWidth
                                    id="lastName"
                                    label="Tên"
                                    name="lastName"
                                    autoComplete="family-name"
                                    value={formData.lastName}
                                    onChange={handleInputChange('lastName')}
                                />
                            </Box>
                            
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
                                                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                            
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="confirmPassword"
                                label="Xác nhận mật khẩu"
                                type={showConfirmPassword ? 'text' : 'password'}
                                id="confirmPassword"
                                autoComplete="new-password"
                                value={formData.confirmPassword}
                                onChange={handleInputChange('confirmPassword')}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LockIcon color="action" />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="toggle confirm password visibility"
                                                onClick={toggleConfirmPasswordVisibility}
                                                edge="end"
                                            >
                                                {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
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
                                {isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
                            </Button>
                            
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="body2">
                                    Đã có tài khoản?{' '}
                                    <MuiLink component={Link} to={'/signin' as FileRouteTypes['to']} variant="body2">
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
