import { StrictMode } from 'react';

import { createRoot } from 'react-dom/client';

import { registerLicense } from '@syncfusion/ej2-base';

import App from './App';
import { ConfigConstant } from './constant/config.constant';

registerLicense(ConfigConstant.SYNCFUSION_SERVICE_KEY);

const root = createRoot(document.getElementById('admin-root') as HTMLElement);
root.render(
    <StrictMode>
        <App />
    </StrictMode>
);
