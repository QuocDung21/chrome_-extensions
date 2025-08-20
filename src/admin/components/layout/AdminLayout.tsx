import { ReactElement, ReactNode, useState } from 'react';

import { ChevronLeft as ChevronLeftIcon } from '@mui/icons-material';
import {
    AppBar,
    Box,
    Divider,
    Drawer,
    IconButton,
    Toolbar,
    Typography,
    useMediaQuery,
    useTheme
} from '@mui/material';

import Header from './Header';
import Sidebar from './Sidebar';

const DRAWER_WIDTH = 280;

interface AdminLayoutProps {
    children: ReactNode;
    title?: string;
}

export default function AdminLayout({ children, title = '' }: AdminLayoutProps): ReactElement {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const [desktopOpen, setDesktopOpen] = useState(true);

    const handleDrawerToggle = () => {
        if (isMobile) {
            setMobileOpen(!mobileOpen);
        } else {
            setDesktopOpen(!desktopOpen);
        }
    };

    const drawer = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Toolbar
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2,
                    minHeight: '64px !important'
                }}
            >
                <Typography
                    variant="h6"
                    noWrap
                    component="div"
                    sx={{ fontWeight: 600, color: 'primary.main' }}
                >
                    NTSOFT Document AI
                </Typography>
                {!isMobile && (
                    <IconButton onClick={handleDrawerToggle} size="small">
                        <ChevronLeftIcon />
                    </IconButton>
                )}
            </Toolbar>
            <Divider />
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <Sidebar />
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
            {/* App Bar */}
            <AppBar
                position="fixed"
                sx={{
                    width: {
                        md: desktopOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%'
                    },
                    ml: {
                        md: desktopOpen ? `${DRAWER_WIDTH}px` : 0
                    },
                    transition: theme.transitions.create(['width', 'margin'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen
                    })
                }}
            >
                <Header
                    onMenuClick={handleDrawerToggle}
                    title={title}
                    showMenuButton={isMobile || !desktopOpen}
                />
            </AppBar>

            {/* Navigation Drawer */}
            <Box
                component="nav"
                sx={{
                    width: { md: desktopOpen ? DRAWER_WIDTH : 0 },
                    flexShrink: { md: 0 }
                }}
            >
                {/* Mobile drawer */}
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true
                    }}
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: DRAWER_WIDTH
                        }
                    }}
                >
                    {drawer}
                </Drawer>

                {/* Desktop drawer */}
                <Drawer
                    variant="persistent"
                    open={desktopOpen}
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: DRAWER_WIDTH,
                            transition: theme.transitions.create('width', {
                                easing: theme.transitions.easing.sharp,
                                duration: theme.transitions.duration.enteringScreen
                            })
                        }
                    }}
                >
                    {drawer}
                </Drawer>
            </Box>

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 0,
                    width: {
                        md: desktopOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%'
                    },
                    mt: '64px',
                    transition: theme.transitions.create(['width', 'margin'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen
                    }),
                    backgroundColor: 'background.default',
                    minHeight: 'calc(100vh - 64px)'
                }}
            >
                {children}
            </Box>
        </Box>
    );
}
