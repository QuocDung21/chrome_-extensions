import { ReactElement, useState } from 'react';

import {
    AccountCircle as AccountCircleIcon,
    Brightness4 as DarkModeIcon,
    Brightness7 as LightModeIcon,
    ExitToApp as LogoutIcon,
    Menu as MenuIcon,
    Notifications as NotificationsIcon,
    Settings as SettingsIcon
} from '@mui/icons-material';
import {
    Avatar,
    Badge,
    Box,
    Divider,
    IconButton,
    Menu,
    MenuItem,
    Toolbar,
    Tooltip,
    Typography
} from '@mui/material';
import { useNavigate } from '@tanstack/react-router';

interface HeaderProps {
    onMenuClick: () => void;
    title: string;
    showMenuButton?: boolean;
}

export default function Header({
    onMenuClick,
    title,
    showMenuButton = true
}: HeaderProps): ReactElement {
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);

    const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleProfileMenuClose = () => {
        setAnchorEl(null);
    };

    const handleNotificationOpen = (event: React.MouseEvent<HTMLElement>) => {
        setNotificationAnchor(event.currentTarget);
    };

    const handleNotificationClose = () => {
        setNotificationAnchor(null);
    };

    const isMenuOpen = Boolean(anchorEl);
    const isNotificationOpen = Boolean(notificationAnchor);

    const handleGoToInfo = () => {
        handleProfileMenuClose();
        navigate({ to: '/info' });
    };

    return (
        <Toolbar sx={{ justifyContent: 'space-between' }}>
            {/* Left side - Menu button and title */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {showMenuButton && (
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={onMenuClick}
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                )}
                <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
                    {title}
                </Typography>
            </Box>

            {/* Right side - Actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {/* Theme Toggle */}
                {/* <Tooltip title="Toggle theme">
                    <IconButton color="inherit" size="large">
                        <LightModeIcon />
                    </IconButton>
                </Tooltip> */}

                {/* Notifications */}
                {/* <Tooltip title="Notifications">
                    <IconButton color="inherit" size="large" onClick={handleNotificationOpen}>
                        <Badge badgeContent={3} color="error">
                            <NotificationsIcon />
                        </Badge>
                    </IconButton>
                </Tooltip> */}

                {/* Settings */}
                {/* <Tooltip title="Settings">
                    <IconButton color="inherit" size="large">
                        <SettingsIcon />
                    </IconButton>
                </Tooltip> */}

                {/* Profile Menu */}
                <Tooltip title="Account">
                    <IconButton
                        size="large"
                        edge="end"
                        aria-label="account of current user"
                        aria-controls="primary-search-account-menu"
                        aria-haspopup="true"
                        onClick={handleProfileMenuOpen}
                        color="inherit"
                    >
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                            NTSOFT
                        </Avatar>
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Profile Menu */}
            <Menu
                anchorEl={anchorEl}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right'
                }}
                id="primary-search-account-menu"
                keepMounted
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right'
                }}
                open={isMenuOpen}
                onClose={handleProfileMenuClose}
                PaperProps={{
                    sx: { width: 220, mt: 1 }
                }}
            >
                <MenuItem onClick={handleProfileMenuClose}>
                    <AccountCircleIcon sx={{ mr: 2 }} />
                    Cá nhân
                </MenuItem>
                <MenuItem onClick={handleGoToInfo}>
                    <SettingsIcon sx={{ mr: 2 }} />
                    Cài đặt
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleProfileMenuClose}>
                    <LogoutIcon sx={{ mr: 2 }} />
                    Đăng xuất
                </MenuItem>
            </Menu>

            {/* Notification Menu */}
            <Menu
                anchorEl={notificationAnchor}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right'
                }}
                keepMounted
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right'
                }}
                open={isNotificationOpen}
                onClose={handleNotificationClose}
                PaperProps={{
                    sx: { width: 320, mt: 1, maxHeight: 400 }
                }}
            >
                <Box sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Notifications
                    </Typography>
                </Box>
                <Divider />
                <MenuItem onClick={handleNotificationClose}>
                    <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Extension Updated
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            New features available in version 2.1.0
                        </Typography>
                    </Box>
                </MenuItem>
                <MenuItem onClick={handleNotificationClose}>
                    <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Data Sync Complete
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            All settings synchronized successfully
                        </Typography>
                    </Box>
                </MenuItem>
                <MenuItem onClick={handleNotificationClose}>
                    <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Security Alert
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            New login detected from unknown device
                        </Typography>
                    </Box>
                </MenuItem>
            </Menu>
        </Toolbar>
    );
}
