import { Suspense } from 'react';

import { SnackbarProvider } from 'notistack';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { RouterProvider, createHashHistory, createRouter } from '@tanstack/react-router';

import AlertSnackbar from './components/common/AlertSnackbar';
import LoadingSpinner from './components/common/LoadingSpinner';
import AdminLayout from './components/layout/AdminLayout';
import { routeTree } from './routeTree.gen';

// Create hash history for Chrome extension compatibility
const hashHistory = createHashHistory();

// Create router instance
const router = createRouter({
    routeTree: routeTree,
    history: hashHistory
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}

// Create Material-UI theme
const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#1976d2',
            light: '#42a5f5',
            dark: '#1565c0'
        },
        secondary: {
            main: '#dc004e',
            light: '#ff5983',
            dark: '#9a0036'
        },
        background: {
            default: '#f5f5f5',
            paper: '#ffffff'
        }
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h4: {
            fontWeight: 600
        },
        h5: {
            fontWeight: 600
        },
        h6: {
            fontWeight: 600
        }
    },
    components: {
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#ffffff',
                    borderRight: '1px solid rgba(0, 0, 0, 0.12)'
                }
            }
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: '#ffffff',
                    color: '#1976d2',
                    boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2)'
                }
            }
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow:
                        '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)',
                    borderRadius: 8
                }
            }
        }
    }
});

export default function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <SnackbarProvider
                maxSnack={3}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right'
                }}
                Components={{
                    error: AlertSnackbar,
                    success: AlertSnackbar,
                    warning: AlertSnackbar,
                    info: AlertSnackbar
                }}
            >
                <Suspense fallback={<LoadingSpinner />}>
                    <RouterProvider router={router} />
                </Suspense>
            </SnackbarProvider>
        </ThemeProvider>
    );
}
