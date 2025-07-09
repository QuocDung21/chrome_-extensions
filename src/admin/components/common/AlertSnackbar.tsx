import { forwardRef, ReactElement } from 'react';
import { Alert, AlertProps } from '@mui/material';
import { SnackbarContent, CustomContentProps } from 'notistack';

interface AlertSnackbarProps extends CustomContentProps {
    severity?: AlertProps['severity'];
}

const AlertSnackbar = forwardRef<HTMLDivElement, AlertSnackbarProps>(
    ({ id, message, severity = 'info', ...other }, ref) => {
        return (
            <SnackbarContent ref={ref} {...other}>
                <Alert
                    severity={severity}
                    variant="filled"
                    sx={{
                        width: '100%',
                        '& .MuiAlert-message': {
                            fontSize: '0.875rem',
                        },
                    }}
                >
                    {message}
                </Alert>
            </SnackbarContent>
        );
    }
);

AlertSnackbar.displayName = 'AlertSnackbar';

export default AlertSnackbar;
