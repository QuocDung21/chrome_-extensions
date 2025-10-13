import { useCallback, useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { FileRouteTypes } from '../routeTree.gen';
import authService, { AuthError, LoginRequest, LoginResponse } from '../services/authService';

interface User {
    id: string;
    email: string;
    name?: string;
}

interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: User | null;
    error: string | null;
}

interface AuthActions {
    login: (credentials: LoginRequest) => Promise<void>;
    logout: () => void;
    clearError: () => void;
}

export function useAuth(): AuthState & AuthActions {
    const navigate = useNavigate();

    // ✅ Khởi tạo đồng bộ, không cần useEffect để “điền” lần đầu
    const [state, setState] = useState<AuthState>(() => {
        const isAuthenticated = authService.isAuthenticated();
        const userData = authService.getUserData();
        return {
            isAuthenticated,
            isLoading: false,
            user: userData
                ? {
                    id: userData.id ?? '',
                    email: userData.email ?? '',
                    name: userData.name ?? undefined,
                }
                : null,
            error: null,
        };
    });

    const login = useCallback(
        async (credentials: LoginRequest) => {
            setState(prev => ({ ...prev, isLoading: true, error: null }));

            try {
                const response: LoginResponse = await authService.login(credentials);

                // Lưu token & user
                authService.setAuthData(response);

                if (!response?.token?.trim()) {
                    throw { message: 'Đăng nhập thất bại: vui lòng thử lại.' } as AuthError;
                }

                setState({
                    isAuthenticated: true,
                    isLoading: false,
                    user: {
                        id: response.user?.id || '',
                        email: credentials.TenDangNhap,
                        name: response.user?.name || undefined,
                    },
                    error: null,
                });

                // ✅ Điều hướng thay trang hiện tại
                navigate({ to: '/template-filler' as FileRouteTypes['to'], replace: true });
            } catch (error: any) {
                const authError = error as AuthError;
                setState({
                    isAuthenticated: false,
                    isLoading: false,
                    user: null,
                    error: authError.message,
                });
            }
        },
        [navigate]
    );

    const logout = useCallback(() => {
        authService.logout();
        setState({ isAuthenticated: false, isLoading: false, user: null, error: null });
        // ⚠️ Nhớ đồng bộ đúng path đăng nhập thực tế của app (ở đây là /signin)
        navigate({ to: '/signin' as FileRouteTypes['to'], replace: true });
    }, [navigate]);

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    return { ...state, login, logout, clearError };
}

// Guard: chỉ redirect khi đã xác định xong isLoading
export function useRequireAuth() {
    const { isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate({ to: '/signin', replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);

    return { isAuthenticated, isLoading };
}

// Nếu đã đăng nhập thì tránh ở lại trang signin
export function useRedirectIfAuthenticated() {
    const { isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            navigate({ to: '/template-filler', replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);

    return { isAuthenticated, isLoading };
}