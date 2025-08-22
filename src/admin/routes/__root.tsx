/**
 * Root Route Component
 *
 * This component handles automatic redirects to /template-filler when:
 * 1. User visits the root path (/) or /dashboard
 * 2. User refreshes the page (F5) from any route other than /template-filler
 *
 * The redirect behavior ensures users always land on the template-filler page
 * after page refreshes, providing a consistent user experience.
 */
import { useEffect, useRef } from 'react';

import { Outlet, createRootRoute, useLocation, useNavigate } from '@tanstack/react-router';

import AdminLayout from '../components/layout/AdminLayout';

function NotFound() {
    const navigate = useNavigate();

    useEffect(() => {
        navigate({
            to: '/dashboard'
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
}

function Layout() {
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
