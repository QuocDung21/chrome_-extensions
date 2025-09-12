import { StrictMode } from 'react';

import { createRoot } from 'react-dom/client';

import { registerLicense } from '@syncfusion/ej2-base';

import App from './App';

// Syncfusion license key registration
registerLicense(process.env.REACT_SYNCFUSION_KEY || 'Ngo9BigBOggjHTQxAR8/V1JEaF1cWWhAYVJ0WmFZfVtgdVRMY1xbRnRPIiBoS35Rc0VrWHtecHVURGVZVkdxVEFd');

const root = createRoot(document.getElementById('admin-root') as HTMLElement);
root.render(
    <StrictMode>
        <App />
    </StrictMode>
);
