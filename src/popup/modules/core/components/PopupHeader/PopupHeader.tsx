import { ReactElement, ReactNode } from 'react';

import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { Box, Button, Toolbar } from '@mui/material';

import classes from './PopupHeader.module.css';

export default function PopupHeader(props: { children?: ReactNode }): ReactElement {
    const openAdmin = () => {
        const url = chrome.runtime.getURL('src/admin/index.html#/template-filler');
        chrome.tabs.create({ url });
        window.close();
    };

    return (
        <Toolbar
            className={classes.PopupHeader}
            sx={{
                boxShadow: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <h1 style={{ margin: 0, fontSize: '1rem' }}>NTS Document AI</h1>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<OpenInNewRoundedIcon fontSize="small" />}
                    onClick={openAdmin}
                >
                    Mở Admin
                </Button>
                {props.children}
            </Box>
        </Toolbar>
    );
}
