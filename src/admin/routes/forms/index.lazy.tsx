import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { createLazyFileRoute } from '@tanstack/react-router';

function FormsPlaceholder() {
    return (
        <Box sx={{ width: '100%', p: 2 }}>
            <Card>
                <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        Trình soạn thảo biểu mẫu đã được gỡ bỏ
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Chức năng này trước đây sử dụng Syncfusion Document Editor và hiện đã bị loại bỏ khỏi dự án.
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
}

export const Route = createLazyFileRoute('/forms/')({
    component: FormsPlaceholder
});

