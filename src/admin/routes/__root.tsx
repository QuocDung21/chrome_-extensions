/**
 * Root Route Component
 *
 * This component handles both admin routes (with layout) and standalone auth routes (without layout):
 * - Signin and signup routes render without AdminLayout
 * - All other routes render with AdminLayout
 * - Handles automatic redirects to /dashboard for 404s
 */
import { useEffect, useRef } from 'react';

import { Outlet, createRootRoute, useLocation, useNavigate } from '@tanstack/react-router';
import type { FileRouteTypes } from '../routeTree.gen';

import AdminLayout from '../components/layout/AdminLayout';
import { useAuth } from '../hooks/useAuth';

function NotFound() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        navigate({
            to: (isAuthenticated ? '/dashboard' : '/signin') as FileRouteTypes['to']
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
}

function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { isAuthenticated, isLoading } = useAuth();
    
    // Check if current route is a standalone auth route
    const isAuthRoute = location.pathname === '/signin' || location.pathname === '/signup';
    
    if (isAuthRoute) {
        // Render auth routes without admin layout
        return <Outlet />;
    }
    
    // While checking auth from storage
    if (isLoading) {
        return null;
    }

    // Guard: if not authenticated, redirect to signin
    if (!isAuthenticated) {
        navigate({ to: '/signin' as FileRouteTypes['to'] });
        return null;
    }
    
    // Render admin routes with layout
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
