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

import { Outlet, createRootRoute, useNavigate, useLocation } from '@tanstack/react-router';

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
    const navigate = useNavigate();
    const location = useLocation();
    const hasRedirected = useRef(false);

    useEffect(() => {
        // Check if this is a page refresh using multiple methods
        const isPageRefresh = (() => {
            // Method 1: Check session storage (primary method)
            if (sessionStorage.getItem('page_refreshing') === 'true') {
                return true;
            }
            
            // Method 2: Check performance navigation type (fallback for older browsers)
            if (performance.navigation && performance.navigation.type === 1) {
                return true;
            }
            
            // Method 3: Check performance entries (modern browsers)
            if (window.performance && (window.performance as any).getEntriesByType) {
                const entries = (window.performance as any).getEntriesByType('navigation');
                if (entries.length > 0 && entries[0].type === 'reload') {
                    return true;
                }
            }
            
            return false;
        })();
        
        // Clear the refresh flag
        sessionStorage.removeItem('page_refreshing');
        
        // Check if we're at the root path, dashboard, or if it's a page refresh
        if ((location.pathname === '/' || location.pathname === '/dashboard') && !hasRedirected.current) {
            hasRedirected.current = true;
            navigate({
                to: '/dashboard',
                replace: true
            });
        }
        
        // Handle page refresh redirects to any route other than template-filler
        // This includes /procedures, /word-mapper, /ocr, /forms, etc.
        // When user presses F5 or refreshes the page, they will be redirected to /template-filler
        if (isPageRefresh && !hasRedirected.current && location.pathname !== '/dashboard') {
            hasRedirected.current = true;
            navigate({
                to: '/dashboard',
                replace: true
            });
        }
    }, [location.pathname, navigate]);

    // Add beforeunload event listener to mark page refresh
    useEffect(() => {
        const handleBeforeUnload = () => {
            sessionStorage.setItem('page_refreshing', 'true');
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

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
