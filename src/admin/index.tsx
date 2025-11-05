import { StrictMode } from 'react';

import { createRoot } from 'react-dom/client';


import App from './App';
// (Syncfusion license registration removed)

const root = createRoot(document.getElementById('admin-root') as HTMLElement);
root.render(
    <StrictMode>
        <App />
    </StrictMode>
);
