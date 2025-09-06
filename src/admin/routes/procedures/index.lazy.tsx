import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    FormControl,
    Grid,
    IconButton,
    Input,
    InputLabel,
    LinearProgress,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography
} from '@mui/material';
// --- SYNCFUSION WORD EDITOR ---
import '@syncfusion/ej2-base/styles/material.css';
import '@syncfusion/ej2-buttons/styles/material.css';
import '@syncfusion/ej2-dropdowns/styles/material.css';
import '@syncfusion/ej2-inputs/styles/material.css';
import '@syncfusion/ej2-lists/styles/material.css';
import '@syncfusion/ej2-navigations/styles/material.css';
import '@syncfusion/ej2-popups/styles/material.css';
import {
    DocumentEditorContainerComponent,
    Ribbon,
    Toolbar
} from '@syncfusion/ej2-react-documenteditor';
import '@syncfusion/ej2-react-documenteditor/styles/material.css';
import '@syncfusion/ej2-splitbuttons/styles/material.css';
import { createLazyFileRoute } from '@tanstack/react-router';

// --- COMPONENTS ---
import {
    type FilterOptions,
    type FilterState
} from '@/admin/components/procedures/TemplateSelectorModal';

// eslint-disable-next-line
import TemplateFillerComponent from '../../components/TemplateFillerWrapper';

DocumentEditorContainerComponent.Inject(Toolbar, Ribbon);

interface ProcessingData {
    [key: string]: any;
}

interface TTHCRecord {
    stt: string;
    maTTHC: string;
    tenTTHC: string;
    qdCongBo: string;
    doiTuong: string;
    linhVuc: string;
    coQuanCongKhai: string;
    capThucHien: string;
    tinhTrang: string;
    tenGiayTo: string;
    mauDon: string;
    tenFile: string;
}

interface LocalEnhancedTTHCRecord extends TTHCRecord {
    isTemplateAvailable: boolean;
}

const useDocumentProcessor = () => {
    const [processingStep, setProcessingStep] = useState<
        'idle' | 'loading_template' | 'processing_data' | 'generating_document' | 'complete'
    >('idle');
    const [progress, setProgress] = useState(0);

    const processDocument = useCallback(
        async (templatePath: string, data: ProcessingData): Promise<Blob> => {
            try {
                setProcessingStep('loading_template');
                setProgress(10);

                // Load template
                const response = await fetch(templatePath);
                if (!response.ok) {
                    throw new Error(`Không thể tải file mẫu: ${response.statusText}`);
                }
                const templateArrayBuffer = await response.arrayBuffer();
                setProgress(30);

                setProcessingStep('processing_data');
                setProgress(50);

                // Prepare data
                const augmentedData = { ...data };

                // Xử lý ngày sinh (hỗ trợ cả ngay_sinh và ngaySinh)
                const ngaySinh = data.ngay_sinh || data.ngaySinh;
                if (ngaySinh && typeof ngaySinh === 'string') {
                    augmentedData.ngay_sinh_full = ngaySinh;
                    augmentedData.ngaySinh_full = ngaySinh;
                    const dateParts = ngaySinh.split('/');
                    if (dateParts.length === 3) {
                        augmentedData.ngay = dateParts[0];
                        augmentedData.thang = dateParts[1];
                        augmentedData.nam = dateParts[2];
                    }
                }

                // Xử lý ngày cấp (hỗ trợ cả ngay_cap và ngayCap)
                const ngayCap = data.ngay_cap || data.ngayCap;
                if (ngayCap && typeof ngayCap === 'string') {
                    augmentedData.ngay_cap_full = ngayCap;
                    augmentedData.ngayCap_full = ngayCap;
                    const dateParts = ngayCap.split('/');
                    if (dateParts.length === 3) {
                        augmentedData.ngay_cap_ngay = dateParts[0];
                        augmentedData.ngay_cap_thang = dateParts[1];
                        augmentedData.ngay_cap_nam = dateParts[2];
                    }
                }
                // Đảm bảo tất cả các trường đều có giá trị
                const requiredFields = [
                    'cccd',
                    'cmnd',
                    'hoTen',
                    'ngaySinh',
                    'gioiTinh',
                    'diaChi',
                    'ngayCap',
                    'cccd',
                    'cmnd',
                    'ho_ten',
                    'ngay_sinh',
                    'gioi_tinh',
                    'dia_chi',
                    'ngay_cap',
                    'noi_cu_tru' // Thêm trường noi_cu_tru
                ];

                requiredFields.forEach(field => {
                    if (!augmentedData[field]) {
                        augmentedData[field] = '';
                    }
                });

                console.log('Dữ liệu đã được chuẩn bị cho template:', augmentedData);

                setProcessingStep('generating_document');
                setProgress(70);

                // Generate document
                const blob = await fillWordTemplate(templateArrayBuffer, augmentedData);
                setProgress(100);
                setProcessingStep('complete');

                return blob;
            } catch (error) {
                setProcessingStep('idle');
                setProgress(0);
                throw error;
            }
        },
        []
    );

    const resetProcessing = useCallback(() => {
        setProcessingStep('idle');
        setProgress(0);
    }, []);

    return {
        processingStep,
        progress,
        processDocument,
        resetProcessing
    };
};

// --- UTILITY FUNCTIONS ---
// Helper function to decode URL-encoded filenames
const decodeFileName = (fileName: string): string => {
    try {
        // Decode URL-encoded characters
        return decodeURIComponent(fileName);
    } catch {
        // If decoding fails, return the original filename
        return fileName;
    }
};

const fillWordTemplate = async (
    templateArrayBuffer: ArrayBuffer,
    jsonData: ProcessingData
): Promise<Blob> => {
    try {
        const zip = new PizZip(templateArrayBuffer);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: () => '',
            delimiters: {
                start: '{',
                end: '}'
            }
        });

        doc.setData(jsonData);
        doc.render();

        return doc.getZip().generate({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
    } catch (error: any) {
        console.error('Docxtemplater error:', error);
        if (error.properties?.id === 'template_error') {
            throw new Error(
                'Lỗi cú pháp trong file mẫu Word. Vui lòng kiểm tra lại các thẻ {placeholder}.'
            );
        }
        throw new Error(`Lỗi xử lý file mẫu: ${error.message}`);
    }
};

const extractTemplateName = (fullPath: string): string => {
    if (!fullPath || !fullPath.includes('/')) return '';
    const parts = fullPath.split('/');
    return parts[parts.length - 1]; // Get the last part (filename)
};

const sanitizeCodeForPath = (code: string): string => (code || '').replace(/[\\/]/g, '_').trim();

const buildDocxUrlForRecord = (record: TTHCRecord | LocalEnhancedTTHCRecord): string => {
    const code = sanitizeCodeForPath(record.maTTHC);
    const templateName = record.tenFile || extractTemplateName(record.mauDon);
    const encodedCode = encodeURIComponent(code);
    const encodedName = encodeURIComponent(templateName);
    // Ensure no double slashes and proper URL format
    const path = `templates_by_code/${encodedCode}/docx/${encodedName}`.replace(/\/+/g, '/');
    return `/${path}`;
};

const buildHtmlUrlForRecord = (record: TTHCRecord | LocalEnhancedTTHCRecord): string => {
    const code = sanitizeCodeForPath(record.maTTHC);
    const templateName = record.tenFile || extractTemplateName(record.mauDon);
    const base = templateName.replace(/\.(docx?|DOCX?)$/, '');
    const encodedCode = encodeURIComponent(code);
    const encodedHtml = encodeURIComponent(`${base}.html`);
    // Ensure no double slashes and proper URL format
    const path = `templates_by_code/${encodedCode}/html/${encodedHtml}`.replace(/\/+/g, '/');
    return `/${path}`;
};

const checkTemplateExists = async (
    record: TTHCRecord | LocalEnhancedTTHCRecord
): Promise<boolean> => {
    try {
        const url = buildDocxUrlForRecord(record);
        const res = await fetch(url, { method: 'HEAD' });
        return res.ok;
    } catch {
        return false;
    }
};

const enhanceRecordsWithAvailability = async (
    records: TTHCRecord[]
): Promise<LocalEnhancedTTHCRecord[]> => {
    const checks = await Promise.all(records.map(r => checkTemplateExists(r)));
    return records.map((record, idx) => ({ ...record, isTemplateAvailable: checks[idx] }));
};

const filterRecords = (
    records: LocalEnhancedTTHCRecord[],
    filters: FilterState
): LocalEnhancedTTHCRecord[] => {
    return records.filter(record => {
        // Filter by linhVuc
        if (filters.linhVuc && !record.linhVuc.includes(filters.linhVuc)) {
            return false;
        }

        // Filter by thuTuc (tenTTHC)
        if (filters.thuTuc && !record.tenTTHC.includes(filters.thuTuc)) {
            return false;
        }

        // Filter by availability
        if (filters.availability === 'available' && !record.isTemplateAvailable) {
            return false;
        }
        if (filters.availability === 'unavailable' && record.isTemplateAvailable) {
            return false;
        }

        return true;
    });
};

//

// --- COMPONENT CHÍNH ---
function ProceduresComponent() {
    // Custom hooks
    const { processingStep, progress, processDocument, resetProcessing } = useDocumentProcessor();
    const sfContainerRef = useRef<DocumentEditorContainerComponent | null>(null);

    // Event handlers

    return (
        <Box sx={{ width: '100%' }}>
            {/* Quick picker from template-filler above the selection card */}
            <Box sx={{ mb: 2 }}>
                <TemplateFillerComponent
                    onSetupTemplate={({ docUrl, code, htmlUrl }) => {
                        try {
                            // Handle template setup
                        } catch {}
                    }}
                />
            </Box>
        </Box>
    );
}

export const Route = createLazyFileRoute('/procedures/')({
    component: ProceduresComponent
});
