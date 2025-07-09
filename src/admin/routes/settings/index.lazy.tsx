import { ReactElement, useState } from 'react';

import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Divider,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Select,
    Switch,
    TextField,
    Typography
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { createLazyFileRoute } from '@tanstack/react-router';

function Settings(): ReactElement {
    const [settings, setSettings] = useState({
        notifications: true,
        autoSync: false,
        darkMode: false,
        language: 'en',
        syncInterval: '5',
        maxRetries: '3'
    });

    const [saved, setSaved] = useState(false);

    const handleSettingChange = (key: string, value: unknown) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));
        setSaved(false);
    };

    const handleSave = () => {
        // Save settings logic here
        console.log('Saving settings:', settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
                Settings
            </Typography>

            {saved && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    Settings saved successfully!
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* General Settings */}
                <Grid>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                General Settings
                            </Typography>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={settings.notifications}
                                            onChange={e =>
                                                handleSettingChange(
                                                    'notifications',
                                                    e.target.checked
                                                )
                                            }
                                        />
                                    }
                                    label="Enable Notifications"
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={settings.autoSync}
                                            onChange={e =>
                                                handleSettingChange('autoSync', e.target.checked)
                                            }
                                        />
                                    }
                                    label="Auto Sync Data"
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={settings.darkMode}
                                            onChange={e =>
                                                handleSettingChange('darkMode', e.target.checked)
                                            }
                                        />
                                    }
                                    label="Dark Mode"
                                />

                                <FormControl fullWidth>
                                    <InputLabel>Language</InputLabel>
                                    <Select
                                        value={settings.language}
                                        label="Language"
                                        onChange={e =>
                                            handleSettingChange('language', e.target.value)
                                        }
                                    >
                                        <MenuItem value="en">English</MenuItem>
                                        <MenuItem value="vi">Tiếng Việt</MenuItem>
                                        <MenuItem value="fr">Français</MenuItem>
                                        <MenuItem value="de">Deutsch</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Advanced Settings */}
                <Grid>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                Advanced Settings
                            </Typography>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <TextField
                                    label="Sync Interval (minutes)"
                                    type="number"
                                    value={settings.syncInterval}
                                    onChange={e =>
                                        handleSettingChange('syncInterval', e.target.value)
                                    }
                                    fullWidth
                                    inputProps={{ min: 1, max: 60 }}
                                />

                                <TextField
                                    label="Max Retry Attempts"
                                    type="number"
                                    value={settings.maxRetries}
                                    onChange={e =>
                                        handleSettingChange('maxRetries', e.target.value)
                                    }
                                    fullWidth
                                    inputProps={{ min: 1, max: 10 }}
                                />

                                <TextField
                                    label="API Endpoint"
                                    placeholder="https://api.example.com"
                                    fullWidth
                                />

                                <TextField
                                    label="API Key"
                                    type="password"
                                    placeholder="Enter your API key"
                                    fullWidth
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Data Management */}
                <Grid>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                Data Management
                            </Typography>

                            <Grid container spacing={2}>
                                <Grid>
                                    <Button variant="outlined" fullWidth>
                                        Export Data
                                    </Button>
                                </Grid>
                                <Grid>
                                    <Button variant="outlined" fullWidth>
                                        Import Data
                                    </Button>
                                </Grid>
                                <Grid>
                                    <Button variant="outlined" fullWidth>
                                        Backup Settings
                                    </Button>
                                </Grid>
                                <Grid>
                                    <Button variant="outlined" color="error" fullWidth>
                                        Clear All Data
                                    </Button>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Save Button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    variant="contained"
                    size="large"
                    onClick={handleSave}
                    sx={{ minWidth: 120 }}
                >
                    Save Settings
                </Button>
            </Box>
        </Box>
    );
}

export const Route = createLazyFileRoute('/settings/')({
    component: Settings
});
