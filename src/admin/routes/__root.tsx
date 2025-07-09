import { useEffect } from 'react';

import { Outlet, createRootRoute, useNavigate } from '@tanstack/react-router';

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
