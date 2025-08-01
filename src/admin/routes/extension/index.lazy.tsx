import { ReactElement, useState } from 'react';

import {
    PlayArrow as PlayIcon,
    Refresh as RefreshIcon,
    Settings as SettingsIcon,
    Stop as StopIcon
} from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Grid,
    List,
    ListItem,
    ListItemText,
    Switch,
    TextField,
    Typography
} from '@mui/material';
import { createLazyFileRoute } from '@tanstack/react-router';

function Extension(): ReactElement {
    const [extensionEnabled, setExtensionEnabled] = useState(true);
    const [autoStart, setAutoStart] = useState(true);
    const [debugMode, setDebugMode] = useState(false);
    const [configDialog, setConfigDialog] = useState(false);

    const extensionInfo = {
        name: 'Chrome Extension with React & Vite',
        version: '1.0.0',
        status: extensionEnabled ? 'Running' : 'Stopped',
        lastUpdate: '2024-01-15 10:30:00',
        permissions: ['storage', 'tabs', 'activeTab', 'notifications']
    };

    const recentActions = [
        { action: 'Page scraped', timestamp: '2024-01-15 14:30:00', status: 'success' },
        { action: 'Settings updated', timestamp: '2024-01-15 14:25:00', status: 'info' },
        { action: 'Extension started', timestamp: '2024-01-15 14:20:00', status: 'success' },
        { action: 'Data synchronized', timestamp: '2024-01-15 14:15:00', status: 'success' }
    ];

    const handleToggleExtension = () => {
        setExtensionEnabled(!extensionEnabled);
    };

    const handleRefresh = () => {
        // Refresh extension logic
        console.log('Refreshing extension...');
    };

    const handleOpenConfig = () => {
        setConfigDialog(true);
    };

    return (
        <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
                Extension Management
            </Typography>
            <Grid container spacing={3}>
                {/* Extension Status */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                Extension Status
                            </Typography>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <Typography variant="body1">Name:</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {extensionInfo.name}
                                    </Typography>
                                </Box>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <Typography variant="body1">Version:</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {extensionInfo.version}
                                    </Typography>
                                </Box>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <Typography variant="body1">Status:</Typography>
                                    <Chip
                                        label={extensionInfo.status}
                                        color={extensionEnabled ? 'success' : 'error'}
                                        size="small"
                                    />
                                </Box>

                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <Typography variant="body1">Last Update:</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {extensionInfo.lastUpdate}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Extension Controls */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                Controls
                            </Typography>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={extensionEnabled}
                                            onChange={handleToggleExtension}
                                        />
                                    }
                                    label="Enable Extension"
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={autoStart}
                                            onChange={e => setAutoStart(e.target.checked)}
                                        />
                                    }
                                    label="Auto Start on Browser Launch"
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={debugMode}
                                            onChange={e => setDebugMode(e.target.checked)}
                                        />
                                    }
                                    label="Debug Mode"
                                />

                                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                    <Button
                                        variant="contained"
                                        startIcon={extensionEnabled ? <StopIcon /> : <PlayIcon />}
                                        onClick={handleToggleExtension}
                                        size="small"
                                    >
                                        {extensionEnabled ? 'Stop' : 'Start'}
                                    </Button>

                                    <Button
                                        variant="outlined"
                                        startIcon={<RefreshIcon />}
                                        onClick={handleRefresh}
                                        size="small"
                                    >
                                        Refresh
                                    </Button>

                                    <Button
                                        variant="outlined"
                                        startIcon={<SettingsIcon />}
                                        onClick={handleOpenConfig}
                                        size="small"
                                    >
                                        Configure
                                    </Button>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Permissions */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                Permissions
                            </Typography>

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {extensionInfo.permissions.map((permission, index) => (
                                    <Chip
                                        key={index}
                                        label={permission}
                                        variant="outlined"
                                        size="small"
                                    />
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Recent Actions */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                Recent Actions
                            </Typography>

                            <List dense>
                                {recentActions.map((action, index) => (
                                    <ListItem
                                        key={index}
                                        secondaryAction={
                                            <Chip
                                                label={action.status}
                                                size="small"
                                                color={
                                                    action.status === 'success' ? 'success' : 'info'
                                                }
                                                variant="outlined"
                                            />
                                        }
                                    >
                                        <ListItemText
                                            primary={action.action}
                                            secondary={action.timestamp}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Configuration Dialog */}
            <Dialog
                open={configDialog}
                onClose={() => setConfigDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Extension Configuration</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label="Scraper Timeout (ms)"
                            type="number"
                            defaultValue="5000"
                            fullWidth
                        />
                        <TextField
                            label="Max Concurrent Requests"
                            type="number"
                            defaultValue="3"
                            fullWidth
                        />
                        <TextField
                            label="User Agent"
                            defaultValue="Chrome Extension Bot"
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfigDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={() => setConfigDialog(false)}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export const Route = createLazyFileRoute('/extension/')({
    component: Extension
});
