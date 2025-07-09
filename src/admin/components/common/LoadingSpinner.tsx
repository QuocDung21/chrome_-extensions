import { ReactElement } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingSpinnerProps {
    message?: string;
    size?: number;
    fullScreen?: boolean;
}

export default function LoadingSpinner({ 
    message = 'Loading...', 
    size = 40,
    fullScreen = true 
}: LoadingSpinnerProps): ReactElement {
    const content = (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                ...(fullScreen && {
                    height: '100vh',
                    width: '100vw',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    zIndex: 9999,
                }),
            }}
        >
            <CircularProgress size={size} thickness={4} />
            {message && (
                <Typography variant="body2" color="text.secondary">
                    {message}
                </Typography>
            )}
        </Box>
    );

    return content;
}
