import React from 'react';

import { Box } from '@mui/system';
import { createLazyFileRoute } from '@tanstack/react-router';

export default function Detail() {
    return <Box>

    </Box>;
}


export const Route = createLazyFileRoute('/word-mapper/detail')({
    component: Detail
});
