import React from 'react';

import { Alert, Box, FormControlLabel, Paper, Switch, Typography } from '@mui/material';
// Styles for Syncfusion (material theme). Base dependencies are required for proper Ribbon/Toolbar UI.
import '@syncfusion/ej2-base/styles/material.css';
import '@syncfusion/ej2-buttons/styles/material.css';
import '@syncfusion/ej2-dropdowns/styles/material.css';
import '@syncfusion/ej2-inputs/styles/material.css';
import '@syncfusion/ej2-lists/styles/material.css';
import '@syncfusion/ej2-navigations/styles/material.css';
import '@syncfusion/ej2-popups/styles/material.css';
import {
    DocumentEditorComponent,
    DocumentEditorContainerComponent,
    Print,
    Ribbon,
    Toolbar
} from '@syncfusion/ej2-react-documenteditor';
import '@syncfusion/ej2-react-documenteditor/styles/material.css';
import '@syncfusion/ej2-splitbuttons/styles/material.css';
import { createLazyFileRoute } from '@tanstack/react-router';

// Inject the toolbar and ribbon modules into the container
DocumentEditorContainerComponent.Inject(Toolbar, Ribbon);

const SERVICE_URL = 'https://services.syncfusion.com/react/production/api/documenteditor/';

function SyncfusionWordViewer(): React.ReactElement {
    const [error, setError] = React.useState<string | null>(null);
    const [status, setStatus] = React.useState<string>('');
    const [useRibbon, setUseRibbon] = React.useState<boolean>(false);
    const containerRef = React.useRef<DocumentEditorContainerComponent | null>(null);

    const importDocx = React.useCallback(async (docxUrl: string) => {
        try {
            setStatus('Đang tải tài liệu...');
            setError(null);
            const res = await fetch(docxUrl);
            if (!res.ok) throw new Error('Không thể tải file DOCX');
            const blob = await res.blob();
            const form = new FormData();
            form.append('files', blob, 'file.docx');
            setStatus('Đang nhập vào Syncfusion...');
            const importRes = await fetch(`${SERVICE_URL}Import`, {
                method: 'POST',
                body: form
            });
            if (!importRes.ok) throw new Error('Import thất bại');
            let bodyStr = await importRes.text();
            let sfdtText = bodyStr;
            try {
                const parsed = JSON.parse(bodyStr);
                sfdtText =
                    typeof parsed === 'string' ? parsed : parsed?.result || parsed?.sfdt || bodyStr;
            } catch {}
            if (!sfdtText) throw new Error('Dữ liệu trả về không hợp lệ');
            containerRef.current?.documentEditor?.open(sfdtText);
            setStatus('');
        } catch (e: any) {
            setStatus('');
            setError(e?.message || 'Không thể mở tài liệu');
        }
    }, []);

    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const docxUrl = params.get('docx') || '';
        if (docxUrl) {
            void importDocx(docxUrl);
        }
    }, [importDocx]);

    const handleToggle = (_: unknown, checked: boolean) => {
        setUseRibbon(checked);
        const container = containerRef.current;
        if (container) container.toolbarMode = checked ? 'Ribbon' : 'Toolbar';
    };

    return (
        <Box sx={{ p: 2 }}>
            {/* <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <FormControlLabel
                    control={<Switch checked={useRibbon} onChange={handleToggle} />}
                    label="Ribbon UI"
                />
            </Box> */}
            {error && (
                <Alert severity="error" sx={{ mb: 1 }}>
                    {error}
                </Alert>
            )}
            {status && (
                <Alert severity="info" sx={{ mb: 1 }}>
                    {status}
                </Alert>
            )}
            <Paper variant="outlined" sx={{ p: 1 }}>
                <div style={{ height: '74vh' }}>
                    <DocumentEditorContainerComponent
                        id="sf-docx-editor"
                        ref={containerRef}
                        serviceUrl={SERVICE_URL}
                        enableToolbar={true}
                        height={'100%'}
                        style={{ display: 'block' }}
                        toolbarMode={useRibbon ? 'Ribbon' : 'Toolbar'}
                        created={() => setError(null)}
                    />
                </div>
            </Paper>
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                Thêm tham số ?docx=URL để tự động mở file. Ví dụ:
                /admin/word-viewer/syncfusion?docx=/templates_by_code/1.001776.000.00.00.H12/docx/Mus1d.docx
            </Typography>
        </Box>
    );
}

export const Route = createLazyFileRoute('/word-viewer/syncfusion')({
    component: SyncfusionWordViewer
});
