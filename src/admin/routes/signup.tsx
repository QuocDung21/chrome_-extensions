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

// ✅ import images from assets
import backgroundLogin from '../../../assets/images/backgroud-login.svg';
import logoNTSoft from '../../../assets/images/logoxoanen.png';
import logoGoogle from '../../../assets/images/logo-google.png';
import logoApple from '../../../assets/images/logo-apple.png';
import logoMicrosoft from '../../../assets/images/logo-microsoft.png';

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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box className="page page-center">
        {/* Title section */}
        <Box textAlign="center" mb={4} className="tieude-login">
          <Typography variant="h5" fontWeight={600}>
            HỆ THỐNG QUẢN TRỊ VÀ ĐIỀU HÀNH NTSOFT - NTIC
          </Typography>
          <Typography>Đăng ký & kích hoạt bản quyền tập trung</Typography>
        </Box>

        <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={2}>
          {/* Left panel */}
          <Box flex={1} p={3}>
            <Typography variant="h5" fontWeight={600}>
              HỆ THỐNG NTIC
            </Typography>
            <Typography className="subtitle" sx={{ mb: 2 }}>
              Nền tảng số tích hợp cho quản lý và điều hành
            </Typography>
            <Typography className="description" sx={{ mb: 2 }}>
              NTIC (NTSoft – NT Information Center) là một nền tảng phần mềm tích hợp được phát
              triển bởi Cty TNHH Phát triển phần mềm Nhật Tâm, cung cấp giải pháp quản lý – điều
              hành – phân tích dữ liệu toàn diện cho nhiều lĩnh vực và loại hình đơn vị, bao gồm cơ
              quan nhà nước, doanh nghiệp, tổ chức giáo dục và y tế.
            </Typography>
            <Box component="img" src={backgroundLogin} alt="NTSOFT Logo" sx={{ maxHeight: 150 }} />
            <Typography className="copy" sx={{ mt: 2 }}>
              © 2025 nthatamsoft.vn – NTSoft Identity Center
            </Typography>
          </Box>

          {/* Right panel */}
          <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Box textAlign="center" mb={2}>
              <Box component="img" src={logoNTSoft} alt="NTSOFT Logo" sx={{ maxHeight: 80 }} />
              <Typography variant="h6" mt={2}>
                ĐĂNG KÝ TÀI KHOẢN NTSOFT - NTIC
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Bạn đã sử dụng NTSOFT NTIC?{' '}
                <MuiLink component={Link} to={'/signin' as FileRouteTypes['to']}>
                  Đăng nhập
                </MuiLink>
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              {/* Fullname */}
              <TextField
                margin="normal"
                fullWidth
                required
                id="fullName"
                label="Họ và tên"
                value={formData.fullName}
                onChange={handleInputChange('fullName')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon />
                    </InputAdornment>
                  )
                }}
              />

              {/* Email */}
              <TextField
                margin="normal"
                fullWidth
                required
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
                        <Button onClick={handleVerifyEmailClick} size="small" sx={{ ml: 1 }}>
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
                  )
                }}
              />

              {/* Phone */}
              <TextField
                margin="normal"
                fullWidth
                required
                id="phone"
                label="Số điện thoại"
                value={formData.phone}
                onChange={handleInputChange('phone')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon />
                    </InputAdornment>
                  )
                }}
              />

              {/* Tax Code */}
              <TextField
                margin="normal"
                fullWidth
                required
                id="taxCode"
                label="Mã số thuế"
                value={formData.taxCode}
                onChange={handleInputChange('taxCode')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BusinessIcon />
                    </InputAdornment>
                  )
                }}
              />

              {/* Password */}
              <TextField
                margin="normal"
                fullWidth
                required
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
                      <IconButton onClick={togglePasswordVisibility} edge="end">
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              {/* Address */}
              <TextField
                margin="normal"
                fullWidth
                required
                id="address"
                label="Địa chỉ"
                value={formData.address}
                onChange={handleInputChange('address')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <HomeIcon />
                    </InputAdornment>
                  )
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
                sx={{ mt: 2 }}
              />

              {/* Submit */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 2 }}
                disabled={isLoading || isCheckingEmail || !!emailError}
              >
                {isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
              </Button>
            </Box>
          </Card>
        </Box>

        {/* Footer */}
        <Box textAlign="center" mt={4} py={2} className="tieude-login">
          <Typography>
            Trợ giúp |{' '}
            <MuiLink href="https://nhattamsoft.vn" target="_blank" underline="none">
              NTSOFT
            </MuiLink>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}

export const Route = createFileRoute('/signup')({
  component: SignUp
});
