import { ReactElement, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import { Link, createLazyFileRoute } from '@tanstack/react-router';

import PopupContent from '@/popup/modules/core/components/PopupContent/PopupContent';
import PopupHeader from '@/popup/modules/core/components/PopupHeader/PopupHeader';

function HomePage(): ReactElement {
    return (
        <>
            <PopupHeader />
            <PopupContent></PopupContent>
        </>
    );
}

export const Route = createLazyFileRoute('/home-page/')({
    component: HomePage
});
