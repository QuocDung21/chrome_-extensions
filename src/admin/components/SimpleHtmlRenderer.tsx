import React from 'react';

import { Container, Paper } from '@mui/material';

interface SimpleHtmlRendererProps {
    htmlContent: string;
}

export const SimpleHtmlRenderer: React.FC<SimpleHtmlRendererProps> = ({ htmlContent }) => {
    return (
        <Container maxWidth="lg">
            <Paper elevation={3} sx={{ p: 0, mt: 2 }}>
                <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </Paper>
        </Container>
    );
};
