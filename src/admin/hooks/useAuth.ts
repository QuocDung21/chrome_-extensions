import { useCallback, useEffect, useState } from 'react';

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
    const [state, setState] = useState<AuthState>({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        error: null
    });

    // Initialize auth state on mount
    useEffect(() => {
        const initializeAuth = () => {
            try {
                const isAuthenticated = authService.isAuthenticated();
                const user = authService.getUserData();

                setState(prev => ({
                    ...prev,
                    isAuthenticated,
                    user,
                    isLoading: false
                }));
            } catch (error) {
                console.error('Error initializing auth:', error);
                setState(prev => ({
                    ...prev,
                    isAuthenticated: false,
                    user: null,
                    isLoading: false,
                    error: 'Lỗi khởi tạo xác thực'
                }));
            }
        };

        initializeAuth();
    }, []);

    const login = useCallback(async (credentials: LoginRequest) => {
        setState(prev => ({
            ...prev,
            isLoading: true,
            error: null
        }));

        try {
            const response: LoginResponse = await authService.login(credentials);
            
            // Store auth data
            authService.setAuthData(response);

            // Ensure a valid token is returned before proceeding
            if (!response?.token || response.token.trim().length === 0) {
                throw { message: 'Đăng nhập thất bại: không nhận được token hợp lệ.' } as AuthError;
            }

            setState(prev => ({
                ...prev,
                isAuthenticated: true,
                user: {
                    id: response.user?.id || '',
                    email: credentials.TenDangNhap,
                    name: response.user?.name || undefined
                },
                isLoading: false,
                error: null
            }));

            // Navigate to dashboard after successful login
            navigate({ to: '/dashboard' as FileRouteTypes['to'] });
        } catch (error: any) {
            const authError = error as AuthError;
            
            setState(prev => ({
                ...prev,
                isAuthenticated: false,
                user: null,
                isLoading: false,
                error: authError.message
            }));
        }
    }, [navigate]);

    const logout = useCallback(() => {
        authService.logout();
        
        setState(prev => ({
            ...prev,
            isAuthenticated: false,
            user: null,
            error: null
        }));

        // Navigate to signin page
        navigate({ to: '/signin' as FileRouteTypes['to'] });
    }, [navigate]);

    const clearError = useCallback(() => {
        setState(prev => ({
            ...prev,
            error: null
        }));
    }, []);

    return {
        ...state,
        login,
        logout,
        clearError
    };
}

// Hook for checking if user is authenticated (useful for route guards)
export function useRequireAuth() {
    const { isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate({ to: '/signin' });
        }
    }, [isAuthenticated, isLoading, navigate]);

    return { isAuthenticated, isLoading };
}

// Hook for redirecting authenticated users away from auth pages
export function useRedirectIfAuthenticated() {
    const { isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            navigate({ to: '/dashboard' });
        }
    }, [isAuthenticated, isLoading, navigate]);

    return { isAuthenticated, isLoading };
}
