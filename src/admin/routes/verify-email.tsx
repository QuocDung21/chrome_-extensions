import { ReactElement, useEffect } from 'react';

import { Button, Card, CardContent, Container, Typography } from '@mui/material';
import { createFileRoute, useSearch } from '@tanstack/react-router';

import signupService from '../services/signupService';

function VerifyEmail(): ReactElement {
    const { email, auto } = Route.useSearch();

    useEffect(() => {
        const run = async () => {
            if (auto === 'true' && email) {
                try {
                    const res = await signupService.resendVerification(email);
                    if (res?.Succeeded && res?.Result?.Verification) {
                        window.location.href = `/hethong/xacthuctaikhoan?verification=${res.Result.Verification}&email=${encodeURIComponent(
                            email
                        )}`;
                    }
                } catch (e) {
                    // no-op; remain on page
                }
            }
        };
        run();
    }, [auto, email]);

    const handleOpenGmail = () => {
        window.open('https://mail.google.com/', '_blank');
    };

    const handleResend = async () => {
        if (!email) return;
        try {
            const res = await signupService.resendVerification(email);
            if (res?.Succeeded && res?.Result?.Verification) {
                window.location.href = `/hethong/xacthuctaikhoan?verification=${res.Result.Verification}&email=${encodeURIComponent(
                    email
                )}`;
            }
        } catch (e) {
            // no-op, keep user on page
        }
    };

    return (
        <Container component="main" maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
            <Card sx={{ width: '100%' }}>
                <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        Xác thực tài khoản của bạn
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Chỉ còn một bước nữa thôi. Kiểm tra email {email || ''} để xác thực và bắt đầu sử dụng ngay
                        lập tức.
                    </Typography>
                    {/* <Button variant="contained" onClick={handleResend} sx={{ mt: 1 }}>
                        Xác thực email
                    </Button> */}
                    <Button variant="outlined" onClick={handleOpenGmail}>
                        Mở Gmail
                    </Button>
                </CardContent>
            </Card>
        </Container>
    );
}

export const Route = createFileRoute('/verify-email')({
    validateSearch: (search: Record<string, unknown>) => search as { email?: string; auto?: string },
    component: VerifyEmail
});


