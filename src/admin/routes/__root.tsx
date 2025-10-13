/**
 * Root Route Component
 */
import { useEffect } from 'react';

import { Outlet, createRootRoute, useLocation, useNavigate } from '@tanstack/react-router';

import AdminLayout from '../components/layout/AdminLayout';
import { useAuth } from '../hooks/useAuth';
import type { FileRouteTypes } from '../routeTree.gen';

function NotFound() {
    const navigate = useNavigate();
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        if (isLoading) return;
        navigate({
            to: (isAuthenticated ? '/template-filler' : '/signin') as FileRouteTypes['to'],
            replace: true
        });
    }, [isAuthenticated, isLoading, navigate]);

    // Có thể hiển thị loader nhỏ
    return null;
}

function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { isAuthenticated, isLoading } = useAuth();

    // Các route auth không cần AdminLayout
    const isAuthRoute =
        location.pathname === '/signin' ||
        location.pathname === '/signup' ||
        location.pathname === '/verify-email';

    if (isAuthRoute) {
        return <Outlet />;
    }

    // Chờ đọc trạng thái đăng nhập từ storage
    if (isLoading) {
        return null; // hoặc spinner
    }

    // Không điều hướng trực tiếp trong render!
    useEffect(() => {
        if (!isAuthenticated) {
            navigate({ to: '/signin' as FileRouteTypes['to'], replace: true });
        }
    }, [isAuthenticated, navigate]);

    if (!isAuthenticated) {
        return null; // chờ effect redirect
    }

    return (
        <AdminLayout>
            <Outlet />
        </AdminLayout>
    );
}

export const Route = createRootRoute({
    component: Layout,
    notFoundComponent: NotFound
});
