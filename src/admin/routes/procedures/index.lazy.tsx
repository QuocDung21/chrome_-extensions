import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

import { Box } from '@mui/material';
import { registerLicense } from '@syncfusion/ej2-base';
// --- SYNCFUSION WORD EDITOR ---
import '@syncfusion/ej2-base/styles/material.css';
import '@syncfusion/ej2-buttons/styles/material.css';
import '@syncfusion/ej2-dropdowns/styles/material.css';
import '@syncfusion/ej2-inputs/styles/material.css';
import '@syncfusion/ej2-lists/styles/material.css';
import '@syncfusion/ej2-navigations/styles/material.css';
import '@syncfusion/ej2-popups/styles/material.css';
import '@syncfusion/ej2-react-documenteditor/styles/material.css';
import '@syncfusion/ej2-splitbuttons/styles/material.css';
import { createLazyFileRoute } from '@tanstack/react-router';

import TemplateFillerComponent from '../../components/procedures/TemplateProcedures';

function ProceduresComponent() {
    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ mb: 2 }}>
                <TemplateFillerComponent />
            </Box>
        </Box>
    );
}

export const Route = createLazyFileRoute('/procedures/')({
    component: ProceduresComponent
});
