import { ReactElement, useState } from 'react';

import {
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Email as EmailIcon,
    Lock as LockIcon
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

import { useAuth, useRedirectIfAuthenticated } from '../hooks/useAuth';

function SignIn(): ReactElement {
    const { login, isLoading, error, clearError } = useAuth();
    const { isAuthenticated } = useRedirectIfAuthenticated();
    
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);

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
            clearError();
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        
        // Basic validation
        if (!formData.email || !formData.password) {
            return;
        }

        await login({
            TenDangNhap: formData.email,
            MatKhau: formData.password
        });
    };

    const togglePasswordVisibility = () => {
        setShowPassword(prev => !prev);
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
                <Card sx={{ width: '100%', maxWidth: 400 }}>
                    <CardContent sx={{ p: 4 }}>
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}
                        >
                            <Avatar sx={{ m: 1, bgcolor: 'primary.main', width: 56, height: 56 }}>
                                <LockIcon />
                            </Avatar>
                            <Typography component="h1" variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
                                Đăng nhập
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                                Chào mừng bạn quay trở lại! Vui lòng đăng nhập để tiếp tục.
                            </Typography>
                        </Box>

                        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
                            {error && (
                                <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
                                    {error}
                                </Alert>
                            )}
                            
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="email"
                                label="Email"
                                name="email"
                                autoComplete="email"
                                autoFocus
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
                                autoComplete="current-password"
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
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                sx={{ mt: 3, mb: 2, py: 1.5 }}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                            </Button>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="body2">
                                    Chưa có tài khoản?{' '}
                                    <MuiLink component={Link} to={'/signup' as FileRouteTypes['to']} variant="body2">
                                        Đăng ký ngay
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

export const Route = createFileRoute('/signin')({
    component: SignIn
});
