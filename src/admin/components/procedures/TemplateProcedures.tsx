import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { renderAsync } from 'docx-preview';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import PizZip from 'pizzip';
// --- THƯ VIỆN ---
import { Socket, io } from 'socket.io-client';

// --- ICON ---

import {
    AddCircleOutline as AddCircleOutlineIcon,
    Badge as BadgeIcon,
    CalendarToday as CalendarTodayIcon,
    CheckCircle as CheckCircleIcon,
    Close,
    Close as CloseIcon,
    ContentCopy as ContentCopyIcon,
    Delete as DeleteIcon,
    Download,
    Download as DownloadIcon,
    Edit as EditIcon,
    EventAvailable as EventAvailableIcon,
    Event as EventIcon,
    ExpandMore as ExpandMoreIcon,
    Home as HomeIcon,
    Info as InfoIcon,
    Person as PersonIcon,
    Print as PrintIcon,
    RestartAlt as RestartAltIcon,
    Star,
    Upload as UploadIcon,
    Wc as WcIcon,
    Wifi as WifiIcon
} from '@mui/icons-material';
import AdfScannerIcon from '@mui/icons-material/AdfScanner';
import SaveIcon from '@mui/icons-material/Save';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Autocomplete,
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    CardHeader,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Tooltip as MuiTooltip,
    Paper,
    Select,
    SelectChangeEvent,
    Snackbar,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import Divider from '@mui/material/Divider';
// --- SYNCFUSION WORD EDITOR ---
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
    SfdtExport,
    Toolbar
} from '@syncfusion/ej2-react-documenteditor';
import '@syncfusion/ej2-react-documenteditor/styles/material.css';
import '@syncfusion/ej2-splitbuttons/styles/material.css';
import { createLazyFileRoute, useNavigate, useRouter } from '@tanstack/react-router';

import { ConfigConstant } from '@/admin/constant/config.constant';
import { WorkingDocument, db } from '@/admin/db/db';
import { linhVucRepository } from '@/admin/repository/LinhVucRepository';
import { thanhPhanHoSoTTHCRepository } from '@/admin/repository/ThanhPhanHoSoTTHCRepository';
import { dataSyncService } from '@/admin/services/dataSyncService';
import { LinhVuc, linhVucApiService } from '@/admin/services/linhVucService';
import { ThuTucHanhChinh, thuTucHanhChinhApiService } from '@/admin/services/thuTucHanhChinh';

import { ApiTemplateCard } from './ApiTemplateCard';

DocumentEditorContainerComponent.Inject(Toolbar, Ribbon, Print);
// --- CẤU HÌNH ---
const SYNCFUSION_SERVICE_URL = ConfigConstant.SYNCFUSION_SERVICE_URL;

// --- TYPE DEFINITIONS ---
interface ProcessingData {
    [key: string]: any;
}
interface LocalEnhancedTTHCRecord extends TTHCRecord {
    isTemplateAvailable: boolean;
}
interface MauDon {
    tenGiayTo: string | null;
    tenFile: string;
    duongDan: string;
    // Optional properties for IndexedDB support
    isFromIndexedDB?: boolean;
    workingDocument?: WorkingDocument;
    // Optional properties for API templates
    isApiTemplate?: boolean;
    isFromOffline?: boolean;
    thanhPhanHoSoTTHCID?: string;
    duongDanTepDinhKem?: string;
    tenThanhPhan?: string;
    soBanChinh?: number;
    soBanSao?: number;
    ghiChu?: string;
}
interface TTHCRecord {
    stt: number;
    maTTHC: string;
    tenTTHC: string;
    qdCongBo: string;
    doiTuong: string;
    linhVuc: string;
    coQuanCongKhai: string;
    capThucHien: string;
    tinhTrang: string;
    danhSachMauDon: MauDon[];
}
interface EnhancedTTHCRecord extends TTHCRecord {
    selectedMauDon?: MauDon;
}
interface FilterOptions {
    linhVuc: string[];
    doiTuong: string[];
    capThucHien: string[];
    thuTucByLinhVuc: { [linhVuc: string]: string[] };
}
interface FilterState {
    searchText: string;
    linhVuc: string;
    doiTuong: string;
    capThucHien: string;
    availability: 'all' | 'available' | 'unavailable';
}
interface TemplateEditorState {
    selectedRecord: EnhancedTTHCRecord | null;
    showEditorModal: boolean;
    syncfusionLoading: boolean;
    syncfusionDocumentReady: boolean;
    socketStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
}

// --- UTILITY FUNCTIONS ---
const parseJSONData = (jsonArray: any[]): TTHCRecord[] => {
    if (!Array.isArray(jsonArray)) return [];
    const records: TTHCRecord[] = jsonArray
        .map(item => {
            const record: TTHCRecord = {
                stt: item['stt'] || 0,
                maTTHC: item['maTTHC'] ?? '',
                tenTTHC: item['tenTTHC'] ?? '',
                qdCongBo: item['qdCongBo'] ?? '',
                doiTuong: item['doiTuong'] ?? '',
                linhVuc: item['linhVuc'] ?? '',
                coQuanCongKhai: item['coQuanCongKhai'] ?? '',
                capThucHien: item['capThucHien'] ?? '',
                tinhTrang: item['tinhTrang'] ?? '',
                danhSachMauDon: item['danhSachMauDon'] || []
            };
            return record;
        })
        .filter(r => r.danhSachMauDon.length > 0);
    return records;
};
const createFilterOptions = (records: TTHCRecord[]): FilterOptions => {
    const linhVucSet = new Set<string>();
    const doiTuongSet = new Set<string>();
    const capThucHienSet = new Set<string>();
    const thuTucByLinhVuc: { [linhVuc: string]: string[] } = {};
    records.forEach(record => {
        if (record.linhVuc && record.tenTTHC) {
            const linhVuc = record.linhVuc.trim();
            const thuTuc = record.tenTTHC.trim();
            linhVucSet.add(linhVuc);
            if (!thuTucByLinhVuc[linhVuc]) {
                thuTucByLinhVuc[linhVuc] = [];
            }
            if (!thuTucByLinhVuc[linhVuc].includes(thuTuc)) {
                thuTucByLinhVuc[linhVuc].push(thuTuc);
            }
        }
        // Extract doiTuong options
        if (record.doiTuong) {
            const doiTuongList = record.doiTuong
                .split(';')
                .map(dt => dt.trim())
                .filter(dt => dt);
            doiTuongList.forEach(dt => doiTuongSet.add(dt));
        }
        // Extract capThucHien options
        if (record.capThucHien) {
            const capThucHienList = record.capThucHien
                .split(';')
                .map(cth => cth.trim())
                .filter(cth => cth);
            capThucHienList.forEach(cth => capThucHienSet.add(cth));
        }
    });
    Object.keys(thuTucByLinhVuc).forEach(linhVuc => {
        thuTucByLinhVuc[linhVuc].sort();
    });
    return {
        linhVuc: Array.from(linhVucSet).sort(),
        doiTuong: Array.from(doiTuongSet).sort(),
        capThucHien: Array.from(capThucHienSet).sort(),
        thuTucByLinhVuc
    };
};
const sanitizeCodeForPath = (code: string): string => (code || '').replace(/[\\/]/g, '_').trim();
const buildDocxUrlForRecord = (record: TTHCRecord, mauDon: MauDon): string => {
    const code = sanitizeCodeForPath(record.maTTHC);
    const templateName = mauDon.tenFile;
    const encodedCode = encodeURIComponent(code);
    const encodedName = encodeURIComponent(templateName);
    const path = `templates_by_code/${encodedCode}/docx/${encodedName}`.replace(/\/+/g, '/');
    return `/${path}`;
};
const enhanceRecordsWithAvailability = async (
    records: TTHCRecord[]
): Promise<EnhancedTTHCRecord[]> => {
    const enhancedRecords: EnhancedTTHCRecord[] = [];
    for (const record of records) {
        // Nếu có danhSachMauDon thì coi như có sẵn template
        const selectedMauDon =
            record.danhSachMauDon && record.danhSachMauDon.length > 0
                ? record.danhSachMauDon[0]
                : undefined;

        enhancedRecords.push({
            ...record,
            selectedMauDon
        });
    }
    return enhancedRecords;
};
const filterRecords = (
    records: EnhancedTTHCRecord[],
    filters: FilterState,
    linhVucList: LinhVuc[]
): EnhancedTTHCRecord[] => {
    return records.filter(record => {
        // Search text filter
        if (filters.searchText) {
            const searchLower = filters.searchText.toLowerCase();
            const searchableText = [
                record.tenTTHC,
                record.maTTHC,
                record.linhVuc,
                record.doiTuong,
                record.qdCongBo
            ]
                .join(' ')
                .toLowerCase();
            if (!searchableText.includes(searchLower)) {
                return false;
            }
        }

        // Lĩnh vực filter - sử dụng maLinhVuc để tìm tenLinhVuc tương ứng
        if (filters.linhVuc) {
            const selectedLinhVuc = linhVucList.find(lv => lv.maLinhVuc === filters.linhVuc);
            if (selectedLinhVuc) {
                // Nếu có maLinhVuc, kiểm tra xem record.linhVuc có chứa tenLinhVuc không
                if (!record.linhVuc.includes(selectedLinhVuc.tenLinhVuc)) {
                    return false;
                }
            } else {
                // Fallback: nếu không tìm thấy, kiểm tra trực tiếp
                if (!record.linhVuc.includes(filters.linhVuc)) {
                    return false;
                }
            }
        }

        if (filters.doiTuong && !record.doiTuong.includes(filters.doiTuong)) {
            return false;
        }
        if (filters.capThucHien && !record.capThucHien.includes(filters.capThucHien)) {
            return false;
        }
        if (
            filters.availability === 'available' &&
            (!record.danhSachMauDon || record.danhSachMauDon.length === 0)
        ) {
            return false;
        }
        if (
            filters.availability === 'unavailable' &&
            record.danhSachMauDon &&
            record.danhSachMauDon.length > 0
        ) {
            return false;
        }
        return true;
    });
};

// Fill placeholders in Syncfusion editor: replaces {key} in body text
const applyDataToSyncfusionFactory =
    (getEditor: () => DocumentEditorContainerComponent | null) =>
    async (data: ProcessingData): Promise<boolean> => {
        try {
            console.log('🔄 Starting Syncfusion data insertion...', data);
            console.log('🔍 Data fields available:', Object.keys(data || {}));
            console.log('🎯 hoTen value:', data?.hoTen);
            console.log('🎯 ho_ten value:', data?.ho_ten);

            const container = getEditor();
            if (!container) {
                console.error('❌ Container is null');
                return false;
            }

            const editor = container?.documentEditor;
            if (!editor) {
                console.error('❌ DocumentEditor is null');
                return false;
            }

            console.log('✅ Editor found, serializing document...');
            const sfdt = editor.serialize();
            if (!sfdt) {
                console.error('❌ Failed to serialize document');
                return false;
            }

            console.log('✅ Document serialized, parsing JSON...');
            const json = typeof sfdt === 'string' ? JSON.parse(sfdt) : sfdt;
            if (!json) {
                console.error('❌ Failed to parse SFDT JSON');
                return false;
            }

            console.log('📄 SFDT Structure:', {
                hasKeyFields: Object.keys(json).slice(0, 10),
                sectionsType: typeof json.sections,
                secType: typeof json.sec,
                sectionsLength: Array.isArray(json.sections) ? json.sections.length : 'not array',
                secLength: Array.isArray(json.sec) ? json.sec.length : 'not array',
                actualSections: json.sections || json.sec,
                fullStructure: json
            });

            // More flexible structure checking - Syncfusion uses 'sec' not 'sections'
            const sectionsProperty = json.sections || json.sec;
            if (!sectionsProperty) {
                console.error('❌ Document has no sections/sec property');
                console.log('Available properties:', Object.keys(json));
                return false;
            }

            if (!Array.isArray(sectionsProperty)) {
                console.error('❌ Sections is not an array, type:', typeof sectionsProperty);
                return false;
            }

            if (sectionsProperty.length === 0) {
                console.warn('⚠️ Document has empty sections array');
                return true; // Not an error, just empty document
            }

            console.log('✅ Editor found, using Syncfusion Find & Replace API...');

            // Create replace map for exact placeholder matching
            const replaceMap: Record<string, string> = {
                '{ho_ten}': data.hoTen || data.ho_ten || '',
                '{cccd}': data.cccd || data.so_cccd || '',
                '{cmnd}': data.cmnd || data.so_cmnd || '',
                '{so_cccd}': data.so_cccd || data.cccd || '',
                '{so_cmnd}': data.so_cmnd || data.cmnd || '',
                '{ngay_sinh}': data.ngaySinh || data.ngay_sinh || '',
                '{gioi_tinh}': data.gioiTinh || data.gioi_tinh || '',
                '{noi_cu_tru}': data.noiCuTru || data.noi_cu_tru || '',
                '{dan_toc}': data.danToc || data.dan_toc || '',
                '{noi_cap}': data.noiCap || data.noi_cap || '',
                '{ngay_cap}': data.ngayCap || data.ngay_cap || '',
                // Thêm các field mới từ mobile
                '{ns_ngay}': data.ns_ngay || '',
                '{ns_thang}': data.ns_thang || '',
                '{ns_nam}': data.ns_nam || '',
                '{nc_ngay}': data.nc_ngay || '',
                '{nc_thang}': data.nc_thang || '',
                '{nc_nam}': data.nc_nam || ''
            };

            console.log('📝 Replace map:', replaceMap);

            let totalReplacements = 0;

            // Use Syncfusion's simple approach - modify SFDT and reload
            console.log('🔄 Using SFDT modification approach...');

            // Get current document as SFDT
            const currentSfdt = editor.serialize();
            if (!currentSfdt) {
                console.error('❌ Failed to serialize document');
                return false;
            }

            // Replace placeholders in the SFDT string directly
            let modifiedSfdt = currentSfdt;
            for (const [placeholder, value] of Object.entries(replaceMap)) {
                if (value) {
                    const regex = new RegExp(
                        placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                        'g'
                    );
                    const beforeLength = modifiedSfdt.length;
                    modifiedSfdt = modifiedSfdt.replace(regex, value);
                    const afterLength = modifiedSfdt.length;

                    if (beforeLength !== afterLength) {
                        totalReplacements++;
                        console.log(`✅ Replaced "${placeholder}" with "${value}" in SFDT`);
                    } else {
                        console.log(`⚠️ No instances of "${placeholder}" found in SFDT`);
                    }
                }
            }

            // Reload the modified document
            if (totalReplacements > 0) {
                console.log('🔄 Loading modified document...');
                editor.open(modifiedSfdt);
                console.log('✅ Document reloaded with replacements');
            }

            console.log(`🎯 Total replacements made: ${totalReplacements}`);

            console.log('✅ Syncfusion data insertion completed successfully');
            return true;
        } catch (error: any) {
            console.error('❌ Error in applyDataToSyncfusionFactory:', error);
            console.error('Stack trace:', error.stack);
            return false;
        }
    };

const TemplateCard = React.memo<{
    record: EnhancedTTHCRecord;
    index: number;
    onSelect: (record: EnhancedTTHCRecord) => void;
    onSelectTemplate: (record: EnhancedTTHCRecord) => void;
    onSetupTemplate?: (payload: { docUrl: string; code: string; htmlUrl?: string | null }) => void;
    onNavigateProcedures?: () => void;
    hasWorkingDocuments?: boolean;
    workingDocumentsCount?: number;
}>(
    ({
        record,
        index,
        onSelect,
        onSelectTemplate,
        onSetupTemplate,
        onNavigateProcedures,
        hasWorkingDocuments = false,
        workingDocumentsCount = 0
    }) => {
        const hasTemplates = record.danhSachMauDon && record.danhSachMauDon.length > 0;
        return (
            <Card
                variant="outlined"
                sx={{
                    mb: 2,
                    borderRadius: 2,
                    borderColor: 'grey.300',
                    transition: 'box-shadow 0.3s, border-color 0.3s',
                    '&:hover': {
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        borderColor: 'primary.main'
                    }
                }}
            >
                <CardContent>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 1.5,
                            gap: 1
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}
                        >
                            <Star sx={{ color: 'text.secondary', fontSize: '1.25rem' }} />
                            <Typography variant="body2" color="text.secondary">
                                <Typography
                                    sx={{
                                        fontSize: 14
                                    }}
                                    component="span"
                                    fontWeight="500"
                                >
                                    Mã thủ tục:
                                </Typography>{' '}
                                {record.maTTHC}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                <Typography component="span" fontWeight="500" fontSize={14}>
                                    Cấp thực hiện:
                                </Typography>
                                {record.capThucHien}
                            </Typography>
                        </Box>

                        <Box>
                            {!hasTemplates ? (
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    fontStyle="italic"
                                >
                                    (Chưa có mẫu đơn/tờ khai trong dữ liệu)
                                </Typography>
                            ) : (
                                <>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={() => onSelect(record)}
                                        startIcon={<EditIcon />}
                                        sx={{
                                            borderRadius: 1,
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                                            '&:hover': {
                                                background:
                                                    'linear-gradient(45deg, #1565c0, #1976d2)',
                                                transform: 'translateY(-2px)',
                                                boxShadow: '0 4px 12px rgba(25,118,210,0.3)'
                                            },
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        {record.danhSachMauDon.length === 1
                                            ? 'Chọn mẫu'
                                            : 'Chọn mẫu'}
                                    </Button>
                                </>
                            )}
                        </Box>
                    </Box>
                    <Divider sx={{ my: 1.5 }} />
                    {/* Phần Body: Thông tin chi tiết */}
                    <Stack spacing={1.5} sx={{ my: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Typography
                                variant="body2"
                                sx={{ width: 150, color: 'text.secondary', flexShrink: 0 }}
                            >
                                Lĩnh vực:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: '500' }}>
                                {record.linhVuc}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Typography
                                variant="body2"
                                sx={{ width: 150, color: 'text.secondary', flexShrink: 0 }}
                            >
                                Tên thủ tục:
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 'bold', color: 'primary.main' }}
                            >
                                {record.tenTTHC}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Typography
                                variant="body2"
                                sx={{ width: 150, color: 'text.secondary', flexShrink: 0 }}
                            >
                                Đối tượng thực hiện:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: '500' }}>
                                {record.doiTuong || 'Công dân Việt Nam'}
                            </Typography>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>
        );
    }
);

TemplateCard.displayName = 'TemplateCard';
// Apply data to Syncfusion editor

// Function to scan document for available suffixes
const scanDocumentForSuffixes = (editor: DocumentEditorContainerComponent | null): string[] => {
    try {
        if (!editor?.documentEditor) {
            console.log('❌ DocumentEditor is null, cannot scan');
            return [];
        }

        const currentSfdt = editor.documentEditor.serialize();
        if (!currentSfdt) {
            console.log('❌ Failed to serialize document for scanning');
            return [];
        }

        // Regex to find patterns like {ho_ten_1}, {so_cccd_2}, etc.
        const suffixPattern = /\{[^}]+_(\d+)\}/g;
        const suffixes = new Set<string>();

        let match;
        while ((match = suffixPattern.exec(currentSfdt)) !== null) {
            suffixes.add(match[1]); // Extract the number part
        }

        const sortedSuffixes = Array.from(suffixes).sort((a, b) => parseInt(a) - parseInt(b));
        console.log('🔍 Found suffixes in document:', sortedSuffixes);

        return sortedSuffixes;
    } catch (error) {
        console.error('❌ Error scanning document for suffixes:', error);
        return [];
    }
};

interface DocumentState {
    selectedTemplatePath: string;
    selectedHtmlUrl?: string | null;
    isLoading: boolean;
    error: string | null;
    socketStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
    generatedBlob: Blob | null;
    processingStep:
        | 'idle'
        | 'loading_template'
        | 'processing_data'
        | 'generating_document'
        | 'complete';
    progress: number;
    dataSource: 'socket' | 'scanner'; // Thêm nguồn dữ liệu
    uploadedTemplateUrl?: string | null;
    uploadedTemplateName?: string | null;
}
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

// --- COMPONENT CHÍNH ---
function TemplateProceduresComponent({
    onSetupTemplate
}: {
    onSetupTemplate?: (payload: { docUrl: string; code: string; htmlUrl?: string | null }) => void;
}) {
    const [state, setState] = useState<DocumentState>({
        selectedTemplatePath: '',
        selectedHtmlUrl: null,
        isLoading: false,
        error: null,
        socketStatus: 'disconnected',
        generatedBlob: null,
        processingStep: 'idle',
        progress: 0,
        dataSource: 'scanner', // Mặc định là scanner
        uploadedTemplateUrl: null,
        uploadedTemplateName: null
    });
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        id?: number;
        fileName?: string;
    }>({ open: false });

    const [csvRecords, setCsvRecords] = useState<EnhancedTTHCRecord[]>([]);
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        linhVuc: [],
        doiTuong: [],
        capThucHien: [],
        thuTucByLinhVuc: {}
    });
    const [linhVucList, setLinhVucList] = useState<LinhVuc[]>([]);
    const [linhVucLoading, setLinhVucLoading] = useState(false);

    const navigate = useNavigate();
    const templatePathRef = useRef<string>('');
    const { history } = useRouter();
    const currentWorkingDocIdRef = useRef<number | null | undefined>(null);
    const [selectedRecord, setSelectedRecord] = useState<LocalEnhancedTTHCRecord | null>(null);
    const [showTemplateModal, setShowTemplateModal] = useState(false);

    const handlePrintClick = async () => {
        if (sfContainerRef.current && sfContainerRef.current.documentEditor) {
            await sfContainerRef.current.documentEditor.print();
            await window.print();
            await history.back();
            await navigate({
                to: '/template-filler'
            });
            window.location.reload();
        } else {
            console.error('Document editor not ready to print.');
        }
    };

    const [filters, setFilters] = useState<FilterState>({
        searchText: '',
        linhVuc: '', // Sẽ lưu maLinhVuc thay vì tenLinhVuc
        doiTuong: '',
        capThucHien: '',
        availability: 'all'
    });
    const [filteredRecords, setFilteredRecords] = useState<EnhancedTTHCRecord[]>([]);
    const [csvLoading, setCsvLoading] = useState(false);
    const [insertFieldKey, setInsertFieldKey] = useState<string>('');
    // State cho template editor
    const [editorState, setEditorState] = useState<TemplateEditorState>({
        selectedRecord: null,
        showEditorModal: false,
        syncfusionLoading: false,
        syncfusionDocumentReady: false,
        socketStatus: 'disconnected'
    });
    // State cho modal chọn mẫu đơn
    const [templateSelectionModal, setTemplateSelectionModal] = useState({
        open: false,
        record: null as EnhancedTTHCRecord | null
    });
    // State cho scan & fill panel
    const [scanState, setScanState] = useState({
        inputMode: 'ntsoft' as 'ntsoft' | 'scanner',
        inputText: '',
        extractedData: null as ProcessingData | null,
        isProcessing: false
    });

    // State cho multiple target management
    const [targetState, setTargetState] = useState({
        availableTargets: [] as string[], // Danh sách targets có thể sử dụng (dynamic từ document)
        selectedTarget: '', // Target được chọn hiện tại
        usedTargets: [] as string[], // Danh sách targets đã sử dụng
        originalSfdt: null as string | null // Lưu trữ document gốc để reset
    });

    // State cho working documents từ IndexedDB
    const [workingDocsState, setWorkingDocsState] = useState({
        workingDocsByCode: {} as { [maTTHC: string]: WorkingDocument },
        workingDocsListByCode: {} as { [maTTHC: string]: WorkingDocument[] },
        isLoading: false
    });

    // Snackbar state
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'info' | 'warning';
    }>({
        open: false,
        message: '',
        severity: 'info'
    });
    interface QuickInputField {
        label: string;
        key: string;
        placeholder?: string;
    }
    // Available field keys for insertion (union of common sets used in guide)
    const availableFieldKeys = useMemo(
        () => [
            'so_cccd',
            'so_cmnd',
            'ho_ten',
            'ngay_sinh',
            'ns_ngay',
            'ns_thang',
            'ns_nam',
            'gioi_tinh',
            'noi_cu_tru',
            'ngay_cap',
            'nc_ngay',
            'nc_thang',
            'nc_nam'
        ],
        []
    );
    const quickInputFields: QuickInputField[] = [
        { label: 'Họ tên', key: 'ho_ten', placeholder: '{ho_ten}' },
        { label: 'CCCD', key: 'cccd', placeholder: '{cccd}' },
        { label: 'CMND', key: 'cmnd', placeholder: '{cmnd}' },
        { label: 'Ngày sinh', key: 'ngay_sinh', placeholder: '{ngay_sinh}' },
        { label: 'Giới tính', key: 'gioi_tinh', placeholder: '{gioi_tinh}' },
        { label: 'Nơi cư trú', key: 'noi_cu_tru', placeholder: '{noi_cu_tru}' },
        { label: 'Ngày cấp', key: 'ngay_cap', placeholder: '{ngay_cap}' },
        { label: 'Dân tộc', key: 'dan_toc', placeholder: '{dan_toc}' },
        { label: 'Nơi cấp', key: 'noi_cap', placeholder: '{noi_cap}' }
    ];
    const [quickInputValues, setQuickInputValues] = useState<Record<string, string>>({});
    const applyDataToSyncfusion = useMemo(
        () => applyDataToSyncfusionFactory(() => sfContainerRef.current),
        []
    );
    const handleClearQuickInputs = useCallback(() => {
        setQuickInputValues({});
    }, []);
    const currentCodeRef = useRef<string>('');
    const handleApplyQuickInputs = useCallback(async () => {
        try {
            if (!sfContainerRef.current?.documentEditor) {
                setSnackbar({ open: true, message: 'Editor chưa sẵn sàng', severity: 'warning' });
                return;
            }
            const data: ProcessingData = {};
            quickInputFields.forEach(f => {
                const v = (quickInputValues[f.key] || '').trim();
                if (v) data[f.key] = v;
            });
            if (Object.keys(data).length === 0) {
                setSnackbar({
                    open: true,
                    message: 'Chưa có dữ liệu để áp dụng',
                    severity: 'info'
                });
                return;
            }
            const ok = await applyDataToSyncfusion(data);
            setSnackbar({
                open: true,
                message: ok ? 'Đã chèn dữ liệu nhanh vào tài liệu' : 'Không thể chèn dữ liệu',
                severity: ok ? 'success' : 'error'
            });
        } catch (e: any) {
            setSnackbar({
                open: true,
                message: e?.message || 'Lỗi áp dụng dữ liệu',
                severity: 'error'
            });
        }
    }, [applyDataToSyncfusion, quickInputFields, quickInputValues, setSnackbar]);

    const [syncfusionDocumentReady, setSyncfusionDocumentReady] = useState(false);
    const [syncfusionLoading, setSyncfusionLoading] = useState(false);
    const [showFieldGuide, setShowFieldGuide] = useState(false);
    const [showQuickInsertPanel, setShowQuickInsertPanel] = useState(true);
    const [previewMode] = useState<'syncfusion'>('syncfusion');
    const [workingDocsByCode, setWorkingDocsByCode] = useState<
        Record<string, WorkingDocument | undefined>
    >({});
    const { processingStep, progress, processDocument, resetProcessing } = useDocumentProcessor();
    const [workingDocsListByCode, setWorkingDocsListByCode] = useState<
        Record<string, WorkingDocument[]>
    >({});
    const [showFilters, setShowFilters] = useState(false);
    const selectedTemplateNameFromPath = useMemo(() => {
        if (!state.selectedTemplatePath) return '';
        const parts = state.selectedTemplatePath.split('/');
        const filename = parts[parts.length - 1];
        return filename.replace(/\.(docx?|DOCX?)$/, '');
    }, [state.selectedTemplatePath]);
    const displayTemplateName = useMemo(() => {
        if (state.uploadedTemplateName) {
            return state.uploadedTemplateName.replace(/\.(docx?|DOCX?)$/, '');
        }
        return selectedTemplateNameFromPath;
    }, [state.uploadedTemplateName, selectedTemplateNameFromPath]);

    // Upload a DOCX file and replace the current working document
    const handleUploadReplaceDocument = useCallback(
        (file: File) => {
            if (!file) return;
            if (!file.name.toLowerCase().endsWith('.docx')) {
                setSnackbar({
                    open: true,
                    message: 'Vui lòng chọn file .docx',
                    severity: 'warning'
                });
                return;
            }

            // Create object URL for the new file
            const url = URL.createObjectURL(file);

            // Update state to replace current working document
            setState(prev => ({
                ...prev,
                uploadedTemplateUrl: url,
                uploadedTemplateName: file.name,
                selectedTemplatePath: url,
                generatedBlob: null, // Clear any generated content
                error: null
            }));

            // Reset processing state
            resetProcessing();

            // Clear any existing preview content
            if (previewMode === 'syncfusion' && sfContainerRef.current?.documentEditor) {
                // Load the new document into Syncfusion editor
                sfContainerRef.current.documentEditor.open(file);
            }

            setSnackbar({
                open: true,
                message: `Đã thay thế tài liệu hiện tại bằng "${file.name}"`,
                severity: 'success'
            });
        },
        [resetProcessing, previewMode]
    );

    const saveWorkingDocToDb = useCallback(
        async (maTTHC: string, blob: Blob, fileName: string, mimeType: string) => {
            try {
                if (!maTTHC) {
                    console.error('❌ maTTHC is required to save working document');
                    return;
                }

                // Check if document already exists for this maTTHC
                const byUpdated = await db.workingDocumentsV2
                    .where('maTTHC')
                    .equals(maTTHC)
                    .sortBy('updatedAt');
                const existingDoc = byUpdated[byUpdated.length - 1];

                if (existingDoc) {
                    // Update existing document
                    const updatedRecord: WorkingDocument = {
                        ...existingDoc,
                        fileName,
                        mimeType,
                        blob,
                        updatedAt: Date.now()
                    };

                    if (existingDoc.id != null) {
                        await db.workingDocumentsV2.update(existingDoc.id, updatedRecord);
                    } else {
                        await db.workingDocumentsV2.add(updatedRecord);
                    }

                    // Update local state
                    setWorkingDocsByCode(prev => ({ ...prev, [maTTHC]: updatedRecord }));
                    setWorkingDocsListByCode(prev => ({
                        ...prev,
                        [maTTHC]: [
                            updatedRecord,
                            ...(prev[maTTHC] || []).filter(d => d.id !== existingDoc?.id)
                        ]
                    }));

                    console.log(`✅ Successfully updated existing working document in IndexedDB:`, {
                        maTTHC,
                        fileName,
                        mimeType,
                        blobSize: blob.size,
                        updatedAt: new Date(updatedRecord.updatedAt).toISOString()
                    });
                } else {
                    // Create new document
                    const newRecord: WorkingDocument = {
                        maTTHC,
                        fileName,
                        mimeType,
                        blob,
                        updatedAt: Date.now()
                    };

                    await db.workingDocumentsV2.add(newRecord);

                    // Update local state
                    setWorkingDocsByCode(prev => ({ ...prev, [maTTHC]: newRecord }));
                    setWorkingDocsListByCode(prev => ({
                        ...prev,
                        [maTTHC]: [newRecord, ...(prev[maTTHC] || [])]
                    }));

                    console.log(`✅ Successfully created new working document in IndexedDB:`, {
                        maTTHC,
                        fileName,
                        mimeType,
                        blobSize: blob.size,
                        updatedAt: new Date(newRecord.updatedAt).toISOString()
                    });
                }
            } catch (e) {
                console.error('❌ Failed to save working document to IndexedDB:', e);
                throw e; // Re-throw to let caller handle the error
            }
        },
        []
    );
    const extractCurrentCode = useCallback((): string => {
        const tryExtract = (url: string | null | undefined): string => {
            if (!url) return '';
            try {
                // Handle working:// URLs from IndexedDB
                if (url.startsWith('working://')) {
                    return url.replace('working://', '').trim();
                }

                const parts = url.split('/');
                const idx = parts.indexOf('templates_by_code');
                if (idx >= 0 && idx + 1 < parts.length) {
                    return decodeURIComponent(parts[idx + 1] || '').trim();
                }
            } catch {}
            return '';
        };

        // Debug logging
        console.log('🔍 extractCurrentCode debug:', {
            editorStateSelectedRecord: editorState.selectedRecord?.maTTHC,
            stateSelectedTemplatePath: state.selectedTemplatePath,
            stateSelectedHtmlUrl: state.selectedHtmlUrl,
            currentCodeRef: currentCodeRef.current
        });

        // First priority: Check if we have a selected record in the editor modal
        if (editorState.selectedRecord?.maTTHC) {
            console.log(
                '✅ Using maTTHC from editorState.selectedRecord:',
                editorState.selectedRecord.maTTHC
            );
            return editorState.selectedRecord.maTTHC;
        }

        // Second priority: Check from state paths
        const fromDocx = tryExtract(state.selectedTemplatePath);
        if (fromDocx) {
            console.log('✅ Using maTTHC from state.selectedTemplatePath:', fromDocx);
            return fromDocx;
        }

        const fromHtml = tryExtract(state.selectedHtmlUrl || undefined);
        if (fromHtml) {
            console.log('✅ Using maTTHC from state.selectedHtmlUrl:', fromHtml);
            return fromHtml;
        }

        // Third priority: Use remembered code from currentCodeRef
        if (currentCodeRef.current) {
            console.log('✅ Using maTTHC from currentCodeRef.current:', currentCodeRef.current);
            return currentCodeRef.current;
        }

        console.log('❌ No maTTHC found in any source');
        return '';
    }, [state.selectedTemplatePath, state.selectedHtmlUrl, editorState.selectedRecord]);
    // Working document functions
    const refreshWorkingDocuments = useCallback(async () => {
        try {
            setWorkingDocsState(prev => ({ ...prev, isLoading: true }));
            const allWorking = await db.workingDocumentsV2.orderBy('updatedAt').reverse().toArray();
            const byCode: { [maTTHC: string]: WorkingDocument } = {};
            const listByCode: { [maTTHC: string]: WorkingDocument[] } = {};

            allWorking.forEach(doc => {
                if (!doc.maTTHC) return;
                if (!listByCode[doc.maTTHC]) listByCode[doc.maTTHC] = [];
                listByCode[doc.maTTHC].push(doc);
                if (!byCode[doc.maTTHC]) byCode[doc.maTTHC] = doc;
            });

            setWorkingDocsState(prev => ({
                ...prev,
                workingDocsByCode: byCode,
                workingDocsListByCode: listByCode,
                isLoading: false
            }));

            console.log(`✅ Refreshed working documents: ${Object.keys(byCode).length} documents`);
        } catch (e) {
            console.error('❌ Failed to refresh working documents:', e);
            setWorkingDocsState(prev => ({ ...prev, isLoading: false }));
        }
    }, []);

    // Save or update current working document without downloading
    // Save or update current working document without downloading
    const handleSaveWorkingDocument = useCallback(async () => {
        try {
            const currentCode = extractCurrentCode();
            if (!currentCode) {
                setSnackbar({
                    open: true,
                    message: 'Không thể xác định mã thủ tục hành chính',
                    severity: 'warning'
                });
                return;
            }

            // Determine current content to save
            let blob: Blob | null = null;
            let mimeType =
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

            if (previewMode === 'syncfusion' && sfContainerRef.current?.documentEditor) {
                blob = await sfContainerRef.current.documentEditor.saveAsBlob('Docx');
            } else if (state.generatedBlob) {
                blob = state.generatedBlob;
                mimeType = state.generatedBlob.type || mimeType;
            } else if (state.uploadedTemplateUrl) {
                const response = await fetch(state.uploadedTemplateUrl);
                blob = await response.blob();
                mimeType = blob.type || mimeType;
            } else if (state.selectedTemplatePath) {
                const response = await fetch(state.selectedTemplatePath);
                blob = await response.blob();
                mimeType = blob.type || mimeType;
            }

            if (!blob) {
                setSnackbar({
                    open: true,
                    message: 'Không có nội dung để lưu',
                    severity: 'warning'
                });
                return;
            }

            // Simplified logic: determine if we should update existing or create new
            let shouldUpdateExisting =
                currentWorkingDocIdRef.current != null && !state.uploadedTemplateUrl; // Don't update if we have a new uploaded template

            let fileNameToSave: string;

            console.log('🔍 Save logic decision:', {
                currentWorkingDocIdRef: currentWorkingDocIdRef.current,
                hasUploadedTemplate: !!state.uploadedTemplateUrl,
                shouldUpdateExisting
            });

            if (shouldUpdateExisting) {
                // UPDATE CASE: Update the existing working document
                console.log(
                    '🔄 Updating existing working document with ID:',
                    currentWorkingDocIdRef.current
                );

                try {
                    // Get the existing document to preserve its filename
                    const existingDoc = await db.workingDocumentsV2.get(
                        currentWorkingDocIdRef.current!
                    );
                    if (existingDoc) {
                        // Preserve the original filename when updating
                        fileNameToSave = existingDoc.fileName;

                        await db.workingDocumentsV2.update(currentWorkingDocIdRef.current!, {
                            fileName: fileNameToSave,
                            mimeType,
                            blob,
                            updatedAt: Date.now()
                        });

                        console.log('✅ Successfully updated existing working document:', {
                            id: currentWorkingDocIdRef.current,
                            fileName: fileNameToSave,
                            maTTHC: currentCode
                        });
                    } else {
                        // Fallback: create new if existing doc not found
                        console.log('⚠️ Existing document not found, creating new one');
                        throw new Error('Existing document not found');
                    }
                } catch (error) {
                    console.log('❌ Update failed, falling back to create new:', error);
                    // Fallback to create new
                    shouldUpdateExisting = false;
                }
            }

            if (!shouldUpdateExisting) {
                // CREATE NEW CASE: Create a new working document entry
                console.log('🆕 Creating new working document entry');

                // Generate a meaningful filename
                let baseName = 'mau_da_chinh';
                if (state.uploadedTemplateName) {
                    baseName = decodeFileName(state.uploadedTemplateName).replace(/\.docx$/i, '');
                } else if (displayTemplateName) {
                    baseName = displayTemplateName;
                } else if (editorState.selectedRecord?.selectedMauDon?.tenFile) {
                    baseName = editorState.selectedRecord.selectedMauDon.tenFile.replace(
                        /\.docx$/i,
                        ''
                    );
                }

                console.log('🔍 Filename generation:', {
                    uploadedTemplateName: state.uploadedTemplateName,
                    displayTemplateName,
                    selectedMauDonFile: editorState.selectedRecord?.selectedMauDon?.tenFile,
                    finalBaseName: baseName
                });

                // Make filename unique with timestamp
                const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                fileNameToSave = `${baseName}_${timestamp}.docx`;

                // Create new document
                const newId = await db.workingDocumentsV2.add({
                    maTTHC: currentCode,
                    fileName: fileNameToSave,
                    mimeType,
                    blob,
                    updatedAt: Date.now()
                });

                // Update the current working doc reference
                currentWorkingDocIdRef.current = Number(newId);

                console.log('✅ Successfully created new working document:', {
                    id: newId,
                    fileName: fileNameToSave,
                    maTTHC: currentCode
                });
            }

            await refreshWorkingDocuments();

            // Switch to working document context and show in editor
            setState(prev => ({
                ...prev,
                selectedTemplatePath: `working://${currentCode}`,
                selectedHtmlUrl: null,
                generatedBlob: blob
            }));
            currentCodeRef.current = currentCode;

            if (previewMode === 'syncfusion' && sfContainerRef.current?.documentEditor) {
                sfContainerRef.current.documentEditor.open(blob);
            }

            // Clear uploaded replacement marker after creating a new entry
            if (state.uploadedTemplateUrl) {
                setState(prev => ({
                    ...prev,
                    uploadedTemplateUrl: null,
                    uploadedTemplateName: null
                }));
            }

            // Update editor state to reflect the new working document
            if (editorState.selectedRecord) {
                const updatedRecord = {
                    ...editorState.selectedRecord
                    // Ensure the record has updated working documents
                };
                setEditorState(prev => ({
                    ...prev,
                    selectedRecord: updatedRecord
                }));
            }

            setSnackbar({
                open: true,
                message: shouldUpdateExisting
                    ? 'Đã cập nhật tài liệu đang làm việc'
                    : 'Đã lưu tài liệu mới vào IndexedDB',
                severity: 'success'
            });
        } catch (error) {
            console.error('Error saving working document:', error);
            setSnackbar({
                open: true,
                message: 'Lỗi khi lưu tài liệu',
                severity: 'error'
            });
        }
    }, [
        extractCurrentCode,
        previewMode,
        state.generatedBlob,
        state.uploadedTemplateUrl,
        state.uploadedTemplateName,
        state.selectedTemplatePath,
        displayTemplateName,
        saveWorkingDocToDb,
        refreshWorkingDocuments
    ]);

    const handleDeleteWorkingDocument = useCallback(
        async (id: number, fileName: string) => {
            try {
                await db.workingDocumentsV2.delete(id);

                console.log('✅ Đã xóa working document:', { id, fileName });

                // Refresh lại danh sách tài liệu
                await refreshWorkingDocuments();

                // Reset currentWorkingDocIdRef nếu đang xóa chính nó
                if (currentWorkingDocIdRef.current === id) {
                    currentWorkingDocIdRef.current = null;
                }

                setSnackbar({
                    open: true,
                    message: `Đã xóa mẫu: ${fileName}`,
                    severity: 'success'
                });
            } catch (error) {
                console.error('❌ Lỗi khi xóa working document:', error);
                setSnackbar({
                    open: true,
                    message: 'Lỗi khi xóa mẫu',
                    severity: 'error'
                });
            }
        },
        [refreshWorkingDocuments]
    );

    // Download the current working document (filled document, custom template, or original template)
    const handleDownloadWorkingDocument = useCallback(async () => {
        try {
            // Get the current maTTHC from the selected template path or URL
            const currentCode = extractCurrentCode();
            console.log('🔍 Debug extractCurrentCode:', {
                selectedTemplatePath: state.selectedTemplatePath,
                selectedHtmlUrl: state.selectedHtmlUrl,
                extractedCode: currentCode
            });

            if (!currentCode) {
                setSnackbar({
                    open: true,
                    message: 'Không thể xác định mã thủ tục hành chính',
                    severity: 'warning'
                });
                return;
            }

            let blob: Blob;
            let fileName: string;
            let mimeType: string;

            // Priority 1: If Syncfusion editor is active and ready, save the current edited content
            if (previewMode === 'syncfusion' && sfContainerRef.current?.documentEditor) {
                const baseName = decodeFileName(displayTemplateName) || 'file';
                const timestamp = Date.now();
                fileName = `${currentCode}_${baseName.replace(/\s/g, '_')}_${timestamp}.docx`;
                blob = await sfContainerRef.current.documentEditor.saveAsBlob('Docx');
                mimeType =
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

                // Save to IndexedDB
                await saveWorkingDocToDb(currentCode, blob, fileName, mimeType);

                // Refresh working documents from IndexedDB
                await refreshWorkingDocuments();

                // Download the file
                saveAs(blob, fileName);

                setSnackbar({
                    open: true,
                    message: `Đã lưu và tải xuống tài liệu đã chỉnh sửa: ${fileName}`,
                    severity: 'success'
                });
                return;
            }

            // Priority 3: Save the filled document if available
            if (state.generatedBlob) {
                const baseName = decodeFileName(displayTemplateName) || 'file';
                const timestamp = Date.now();
                fileName = `${currentCode}_${baseName.replace(/\s/g, '_')}_${timestamp}.docx`;
                blob = state.generatedBlob;
                mimeType =
                    state.generatedBlob.type ||
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

                // Save to IndexedDB
                await saveWorkingDocToDb(currentCode, blob, fileName, mimeType);

                // Refresh working documents from IndexedDB
                await refreshWorkingDocuments();

                // Download the file
                saveAs(blob, fileName);

                setSnackbar({
                    open: true,
                    message: `Đã lưu và tải xuống tài liệu đã điền: ${fileName}`,
                    severity: 'success'
                });
                return;
            }

            // Priority 4: Save the custom uploaded template if available
            if (state.uploadedTemplateUrl) {
                const response = await fetch(state.uploadedTemplateUrl);
                blob = await response.blob();
                const baseName = decodeFileName(state.uploadedTemplateName || '') || 'mau_da_chinh';
                const timestamp = Date.now();
                fileName = `${currentCode}_${baseName.replace(/\s/g, '_')}_${timestamp}.docx`;
                mimeType =
                    blob.type ||
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

                // Save to IndexedDB
                await saveWorkingDocToDb(currentCode, blob, fileName, mimeType);

                // Refresh working documents from IndexedDB
                await refreshWorkingDocuments();

                // Download the file
                saveAs(blob, fileName);

                setSnackbar({
                    open: true,
                    message: `Đã lưu và tải xuống mẫu đã chỉnh: ${fileName}`,
                    severity: 'success'
                });
                return;
            }

            // Priority 5: Save the original template if available
            if (state.selectedTemplatePath) {
                // Check if it's a working document from IndexedDB
                if (state.selectedTemplatePath.startsWith('working://')) {
                    if (state.generatedBlob) {
                        // Use the blob directly for working documents
                        blob = state.generatedBlob;
                        const baseName = decodeFileName(displayTemplateName) || 'mau_goc';
                        const timestamp = Date.now();
                        fileName = `${currentCode}_${baseName.replace(/\s/g, '_')}_${timestamp}.docx`;
                        mimeType =
                            blob.type ||
                            'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

                        // Save to IndexedDB
                        await saveWorkingDocToDb(currentCode, blob, fileName, mimeType);

                        // Refresh working documents from IndexedDB
                        await refreshWorkingDocuments();

                        // Download the file
                        saveAs(blob, fileName);

                        setSnackbar({
                            open: true,
                            message: `Đã lưu và tải xuống tài liệu đã lưu: ${fileName}`,
                            severity: 'success'
                        });
                        return;
                    } else {
                        setSnackbar({
                            open: true,
                            message: 'Không thể lưu tài liệu đã lưu',
                            severity: 'error'
                        });
                        return;
                    }
                }

                // For regular templates, fetch from URL
                const response = await fetch(state.selectedTemplatePath);
                blob = await response.blob();
                const baseName = decodeFileName(displayTemplateName) || 'mau_goc';
                const timestamp = Date.now();
                fileName = `${currentCode}_${baseName.replace(/\s/g, '_')}_${timestamp}.docx`;
                mimeType =
                    blob.type ||
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

                // Save to IndexedDB
                await saveWorkingDocToDb(currentCode, blob, fileName, mimeType);

                // Refresh working documents from IndexedDB
                await refreshWorkingDocuments();

                // Download the file
                saveAs(blob, fileName);

                setSnackbar({
                    open: true,
                    message: `Đã lưu và tải xuống mẫu gốc: ${fileName}`,
                    severity: 'success'
                });
                return;
            }

            // No document available
            setSnackbar({
                open: true,
                message: 'Không có tài liệu nào để lưu và tải xuống',
                severity: 'warning'
            });
        } catch (error) {
            console.error('Error saving and downloading document:', error);
            setSnackbar({
                open: true,
                message: 'Lỗi khi lưu và tải xuống tài liệu',
                severity: 'error'
            });
        }
    }, [
        state.generatedBlob,
        state.uploadedTemplateUrl,
        state.uploadedTemplateName,
        state.selectedTemplatePath,
        displayTemplateName,
        previewMode,
        extractCurrentCode,
        saveWorkingDocToDb,
        refreshWorkingDocuments
    ]);

    const getWorkingDocumentsForMaTTHC = useCallback(
        (maTTHC: string): WorkingDocument[] => {
            return workingDocsState.workingDocsListByCode[maTTHC] || [];
        },
        [workingDocsState.workingDocsListByCode]
    );

    const hasWorkingDocuments = useCallback(
        (maTTHC: string): boolean => {
            return workingDocsState.workingDocsListByCode[maTTHC]?.length > 0 || false;
        },
        [workingDocsState.workingDocsListByCode]
    );

    const sfContainerRef = useRef<DocumentEditorContainerComponent | null>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const availableTemplates = useMemo(() => {
        return filteredRecords.filter(r => r.danhSachMauDon && r.danhSachMauDon.length > 0);
    }, [filteredRecords]);
    // Memoized statistics for header
    const templateStats = useMemo(() => {
        const available = filteredRecords.filter(
            r => r.danhSachMauDon && r.danhSachMauDon.length > 0
        ).length;
        const total = filteredRecords.length;
        return { available, total };
    }, [filteredRecords]);
    // Event handlers
    const handleFilterChange = useCallback((filterType: keyof FilterState, value: string) => {
        setFilters(prev => {
            const newFilters = {
                ...prev,
                [filterType]: value
            };
            return newFilters;
        });
    }, []);
    const handleClearFilters = useCallback(() => {
        setFilters({
            searchText: '',
            linhVuc: '',
            doiTuong: '',
            capThucHien: '',
            availability: 'all'
        });
    }, []);
    //  Chọn template
    const handleSelectTemplate = useCallback(async (record: EnhancedTTHCRecord) => {
        console.log('🎯 Template selected:', record);

        // Kiểm tra xem record có mẫu đơn nào không
        if (!record.danhSachMauDon || record.danhSachMauDon.length === 0) {
            setSnackbar({
                open: true,
                message: `Mẫu đơn "${record.tenTTHC}" chưa có sẵn trong hệ thống`,
                severity: 'warning'
            });
            return;
        }

        // Nếu chỉ có 1 mẫu đơn, sử dụng trực tiếp
        if (record.danhSachMauDon.length === 1) {
            const singleMauDon = record.danhSachMauDon[0];
            const updatedRecord = { ...record, selectedMauDon: singleMauDon };

            // Set the current code reference for later use
            currentCodeRef.current = record.maTTHC;

            setEditorState(prev => ({
                ...prev,
                selectedRecord: updatedRecord,
                showEditorModal: true,
                syncfusionLoading: true,
                syncfusionDocumentReady: false
            }));

            setSnackbar({
                open: true,
                message: `Đang tải mẫu: ${record.tenTTHC}`,
                severity: 'info'
            });
            return;
        }

        // Nếu có nhiều mẫu đơn, mở modal chọn mẫu
        setTemplateSelectionModal({
            open: true,
            record: record
        });
    }, []);
    const handleCloseEditor = useCallback(() => {
        setEditorState({
            selectedRecord: null,
            showEditorModal: false,
            syncfusionLoading: false,
            syncfusionDocumentReady: false,
            socketStatus: editorState.socketStatus
        });
        setScanState({
            inputMode: 'ntsoft',
            inputText: '',
            extractedData: null,
            isProcessing: false
        });
    }, [editorState.socketStatus]);
    const insertFieldIntoSyncfusion = useCallback((fieldPlaceholder: string) => {
        try {
            const container = sfContainerRef.current;
            if (!container || !container.documentEditor) {
                setSnackbar({
                    open: true,
                    message: 'Editor chưa sẵn sàng để chèn field',
                    severity: 'warning'
                });
                return;
            }
            container.documentEditor.editor.insertText(fieldPlaceholder);
            setSnackbar({
                open: true,
                message: `Đã chèn field "${fieldPlaceholder}" vào document`,
                severity: 'success'
            });
        } catch (error) {
            console.error('❌ Error inserting field:', error);
            setSnackbar({
                open: true,
                message: 'Lỗi khi chèn field vào document',
                severity: 'error'
            });
        }
    }, []);
    // Load template into Syncfusion editor with retry mechanism
    const loadTemplateIntoSyncfusion = useCallback(async (record: EnhancedTTHCRecord) => {
        console.log('🔄 Starting template load process for:', record.tenTTHC);
        // Retry function to wait for Syncfusion to be ready
        const waitForSyncfusion = async (maxRetries = 10): Promise<boolean> => {
            for (let i = 0; i < maxRetries; i++) {
                if (sfContainerRef.current?.documentEditor) {
                    console.log('✅ Syncfusion editor found, proceeding...');
                    return true;
                }
                console.log(`⏳ Waiting for Syncfusion editor (attempt ${i + 1}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            return false;
        };
        const isReady = await waitForSyncfusion();
        if (!isReady) {
            console.error('❌ Syncfusion editor not ready after waiting');
            setEditorState(prev => ({
                ...prev,
                syncfusionLoading: false,
                syncfusionDocumentReady: false
            }));
            setSnackbar({
                open: true,
                message: 'Syncfusion editor không sẵn sàng. Vui lòng thử lại.',
                severity: 'error'
            });
            return;
        }
        try {
            console.log('🔄 Loading template into Syncfusion...');
            if (!record.selectedMauDon) {
                throw new Error('Không có mẫu đơn được chọn');
            }

            let blob: Blob;

            // Check if template is from IndexedDB working documents
            if (record.selectedMauDon.isFromIndexedDB && record.selectedMauDon.workingDocument) {
                console.log(
                    '📦 Loading template from IndexedDB working document:',
                    record.selectedMauDon.tenFile
                );
                blob = record.selectedMauDon.workingDocument.blob;
            }
            // Check if template is API template
            else if (record.selectedMauDon.isApiTemplate) {
                console.log('📦 Loading API template:', record.selectedMauDon.tenFile);

                if (
                    record.selectedMauDon.isFromOffline &&
                    record.selectedMauDon.thanhPhanHoSoTTHCID
                ) {
                    // Load from offline file repository
                    console.log(
                        '📁 Loading API template from offline:',
                        record.selectedMauDon.thanhPhanHoSoTTHCID
                    );
                    const offlineBlob = await thanhPhanHoSoTTHCRepository.getFileBlobForUse(
                        record.selectedMauDon.thanhPhanHoSoTTHCID
                    );
                    if (!offlineBlob) {
                        throw new Error('Không thể tải file offline');
                    }
                    blob = offlineBlob;
                } else {
                    // Load from API URL
                    const apiUrl = `http://laptrinhid.qlns.vn/uploads/tthc/${record.selectedMauDon.duongDanTepDinhKem}`;
                    console.log('📁 Loading API template from URL:', apiUrl);
                    const res = await fetch(apiUrl);
                    if (!res.ok) {
                        console.error(
                            '❌ Failed to fetch API template:',
                            res.status,
                            res.statusText
                        );
                        throw new Error(
                            `Không thể tải file mẫu API: ${res.status} ${res.statusText}`
                        );
                    }
                    blob = await res.blob();
                }
            } else {
                // Load from CSV template URL (legacy)
                const templateUrl = buildDocxUrlForRecord(record, record.selectedMauDon);
                console.log('📁 Template URL (legacy):', templateUrl);
                const res = await fetch(templateUrl);
                if (!res.ok) {
                    console.error(
                        '❌ Failed to fetch legacy template:',
                        res.status,
                        res.statusText
                    );
                    throw new Error(`Không thể tải file mẫu: ${res.status} ${res.statusText}`);
                }
                blob = await res.blob();
            }

            console.log('📦 Template blob size:', blob.size, 'bytes');
            console.log('📦 Template blob type:', blob.type);

            // Validate blob
            if (blob.size === 0) {
                throw new Error('File template không có nội dung (0 bytes)');
            }

            if (blob.size > 50 * 1024 * 1024) {
                // 50MB limit
                throw new Error('File template quá lớn (>50MB)');
            }

            const form = new FormData();
            // Use a safe filename for Syncfusion service
            const safeFileName = (record.selectedMauDon.tenFile || 'template.docx').replace(
                /[^a-zA-Z0-9.-]/g,
                '_'
            );
            form.append('files', blob, safeFileName);

            console.log('🔄 Converting DOCX to SFDT...');
            console.log('🌐 Syncfusion service URL:', SYNCFUSION_SERVICE_URL + 'Import');
            console.log('📄 Sending file:', safeFileName, 'size:', blob.size, 'type:', blob.type);

            // Create timeout controller for better browser compatibility
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            const importRes = await fetch(`${SYNCFUSION_SERVICE_URL}Import`, {
                method: 'POST',
                body: form,
                signal: controller.signal
            }).finally(() => clearTimeout(timeoutId));

            console.log('📡 Syncfusion response status:', importRes.status);
            console.log(
                '📡 Syncfusion response headers:',
                Object.fromEntries(importRes.headers.entries())
            );

            if (!importRes.ok) {
                const responseText = await importRes.text().catch(() => 'Unable to read response');
                console.error('❌ Syncfusion import failed:');
                console.error('   Status:', importRes.status);
                console.error('   StatusText:', importRes.statusText);
                console.error('   Response:', responseText);

                // Try alternative service URL if the main one fails
                if (importRes.status === 404) {
                    console.log('🔄 Trying alternative Syncfusion service...');
                    try {
                        const alternativeUrl =
                            'https://ej2services.syncfusion.com/production/web-services/api/documenteditor/Import';
                        console.log('🌐 Alternative service URL:', alternativeUrl);

                        const altController = new AbortController();
                        const altTimeoutId = setTimeout(() => altController.abort(), 30000);

                        const altImportRes = await fetch(alternativeUrl, {
                            method: 'POST',
                            body: form,
                            signal: altController.signal
                        }).finally(() => clearTimeout(altTimeoutId));

                        if (altImportRes.ok) {
                            console.log('✅ Alternative service succeeded');
                            const sfdtText = await altImportRes.text();
                            console.log('✅ SFDT conversion completed, length:', sfdtText.length);

                            if (!sfdtText || sfdtText.length < 100) {
                                throw new Error('SFDT conversion returned invalid data');
                            }

                            // Continue with the successfully converted SFDT
                            console.log('🔄 Opening document in Syncfusion editor...');
                            sfContainerRef.current!.documentEditor.open(sfdtText);

                            // Continue with the rest of the success flow
                            setTimeout(() => {
                                try {
                                    const testSfdt =
                                        sfContainerRef.current?.documentEditor?.serialize();
                                    if (testSfdt && testSfdt.length > 100) {
                                        const availableSuffixes = scanDocumentForSuffixes(
                                            sfContainerRef.current
                                        );
                                        console.log(
                                            '📋 Document loaded with available targets:',
                                            availableSuffixes
                                        );

                                        setTargetState(prev => ({
                                            ...prev,
                                            availableTargets: availableSuffixes,
                                            selectedTarget: '',
                                            usedTargets: [],
                                            originalSfdt: testSfdt
                                        }));

                                        setEditorState(prev => ({
                                            ...prev,
                                            syncfusionDocumentReady: true,
                                            syncfusionLoading: false
                                        }));

                                        console.log(
                                            '✅ Syncfusion document ready for data insertion'
                                        );
                                        const suffixMessage =
                                            availableSuffixes.length > 0
                                                ? ` (Tìm thấy ${availableSuffixes.length} đối tượng: ${availableSuffixes.map(s => `_${s}`).join(', ')})`
                                                : ' (Không tìm thấy trường đặc biệt)';

                                        setSnackbar({
                                            open: true,
                                            message: `Đã tải thành công: ${record.tenTTHC}${suffixMessage}`,
                                            severity: 'success'
                                        });
                                    } else {
                                        throw new Error('Document not properly loaded');
                                    }
                                } catch (error) {
                                    console.warn('⚠️ Error checking document readiness:', error);
                                    setEditorState(prev => ({
                                        ...prev,
                                        syncfusionDocumentReady: true,
                                        syncfusionLoading: false
                                    }));
                                }
                            }, 2000);

                            return; // Exit early since alternative service succeeded
                        }
                    } catch (altError) {
                        console.error('❌ Alternative service also failed:', altError);
                    }
                }

                // Final fallback: Try to open the document directly without SFDT conversion
                console.log('🔄 Attempting direct document load as final fallback...');
                try {
                    sfContainerRef.current!.documentEditor.open(blob);

                    setTimeout(() => {
                        try {
                            const testSfdt = sfContainerRef.current?.documentEditor?.serialize();
                            if (testSfdt && testSfdt.length > 100) {
                                const availableSuffixes = scanDocumentForSuffixes(
                                    sfContainerRef.current
                                );
                                console.log(
                                    '📋 Document loaded (direct) with available targets:',
                                    availableSuffixes
                                );

                                setTargetState(prev => ({
                                    ...prev,
                                    availableTargets: availableSuffixes,
                                    selectedTarget: '',
                                    usedTargets: [],
                                    originalSfdt: testSfdt
                                }));

                                setEditorState(prev => ({
                                    ...prev,
                                    syncfusionDocumentReady: true,
                                    syncfusionLoading: false
                                }));

                                console.log('✅ Direct document loading succeeded');
                                const suffixMessage =
                                    availableSuffixes.length > 0
                                        ? ` (Tìm thấy ${availableSuffixes.length} đối tượng: ${availableSuffixes.map(s => `_${s}`).join(', ')})`
                                        : ' (Không tìm thấy trường đặc biệt)';

                                setSnackbar({
                                    open: true,
                                    message: `Đã tải thành công (direct): ${record.tenTTHC}${suffixMessage}`,
                                    severity: 'success'
                                });

                                return; // Exit function successfully
                            } else {
                                throw new Error('Direct document loading failed');
                            }
                        } catch (directError) {
                            console.error('❌ Direct document loading also failed:', directError);
                            throw new Error(
                                `Tất cả phương thức tải document đều thất bại: ${importRes.status} ${importRes.statusText}\nResponse: ${responseText}`
                            );
                        }
                    }, 2000);

                    return; // Exit early as we're attempting direct load
                } catch (directLoadError) {
                    console.error('❌ Direct load attempt failed:', directLoadError);
                }

                throw new Error(
                    `Lỗi Syncfusion service: ${importRes.status} ${importRes.statusText}\nResponse: ${responseText}`
                );
            }
            const sfdtText = await importRes.text();
            console.log('✅ SFDT conversion completed, length:', sfdtText.length);
            if (!sfdtText || sfdtText.length < 100) {
                throw new Error('SFDT conversion returned invalid data');
            }
            console.log('🔄 Opening document in Syncfusion editor...');
            sfContainerRef.current!.documentEditor.open(sfdtText);
            // Wait longer for document to be fully loaded
            setTimeout(() => {
                try {
                    const testSfdt = sfContainerRef.current?.documentEditor?.serialize();
                    if (testSfdt && testSfdt.length > 100) {
                        // Scan document for available suffixes
                        const availableSuffixes = scanDocumentForSuffixes(sfContainerRef.current);
                        console.log(
                            '📋 Document loaded with available targets:',
                            availableSuffixes
                        );

                        // Update target state with scanned suffixes and save original document
                        setTargetState(prev => ({
                            ...prev,
                            availableTargets: availableSuffixes,
                            selectedTarget: '',
                            usedTargets: [],
                            originalSfdt: testSfdt // Save original document for reset
                        }));

                        setEditorState(prev => ({
                            ...prev,
                            syncfusionDocumentReady: true,
                            syncfusionLoading: false
                        }));
                        console.log('✅ Syncfusion document ready for data insertion');
                        const suffixMessage =
                            availableSuffixes.length > 0
                                ? ` (Tìm thấy ${availableSuffixes.length} đối tượng: ${availableSuffixes.map(s => `_${s}`).join(', ')})`
                                : ' (Không tìm thấy trường đặc biệt)';

                        setSnackbar({
                            open: true,
                            message: `Đã tải thành công: ${record.tenTTHC}${suffixMessage}`,
                            severity: 'success'
                        });
                    } else {
                        throw new Error('Document not properly loaded');
                    }
                } catch (error) {
                    console.warn('⚠️ Error checking document readiness:', error);
                    // Still mark as ready to allow user interaction
                    setEditorState(prev => ({
                        ...prev,
                        syncfusionDocumentReady: true,
                        syncfusionLoading: false
                    }));
                }
            }, 2000); // Increased timeout
        } catch (e: any) {
            console.error('❌ Error loading Syncfusion document:', e);
            setEditorState(prev => ({
                ...prev,
                syncfusionLoading: false,
                syncfusionDocumentReady: false
            }));
            setSnackbar({
                open: true,
                message: e?.message || 'Không thể mở tài liệu trong Syncfusion',
                severity: 'error'
            });
        }
    }, []);
    // Load ThuTucHanhChinh data from API or IndexedDB
    useEffect(() => {
        const loadThuTucHanhChinhData = async () => {
            setDataLoading(true);
            try {
                console.log('📋 Loading ThuTucHanhChinh data...');
                let data: ThuTucHanhChinh[] = [];

                // Check if data is synced to IndexedDB
                const isDataSynced = await dataSyncService.isDataSynced();

                if (isDataSynced) {
                    // Load from IndexedDB
                    console.log('✅ Using offline data from IndexedDB');
                    data = await db.thuTucHanhChinh.orderBy('tenThuTucHanhChinh').toArray();
                    console.log(`✅ Loaded ${data.length} ThuTucHanhChinh from IndexedDB`);
                } else {
                    // Load from API
                    console.log('📡 Loading data from API');
                    const response = await thuTucHanhChinhApiService.getAllThuTucHanhChinh(1, 1000);

                    if (response.success && response.data) {
                        data = response.data.items;
                        console.log(`✅ Loaded ${data.length} ThuTucHanhChinh from API`);
                    } else {
                        throw new Error(
                            response.error?.message || 'Failed to load ThuTucHanhChinh data'
                        );
                    }
                }

                setThuTucHcList(data);

                setSnackbar({
                    open: true,
                    message: `Đã tải ${data.length} thủ tục hành chính ${isDataSynced ? '(offline)' : '(online)'}`,
                    severity: 'success'
                });
            } catch (error) {
                console.error('❌ Error loading ThuTucHanhChinh data:', error);
                setSnackbar({
                    open: true,
                    message: 'Không thể tải danh sách thủ tục hành chính',
                    severity: 'error'
                });
            } finally {
                setDataLoading(false);
            }
        };

        loadThuTucHanhChinhData();
    }, []);

    // Load lĩnh vực data from repository
    useEffect(() => {
        const loadLinhVuc = async () => {
            setLinhVucLoading(true);
            try {
                const data = await linhVucRepository.getLinhVucList();
                setLinhVucList(data);
                console.log('✅ Loaded lĩnh vực from repository:', data.length, 'items');

                // Show success message
                setSnackbar({
                    open: true,
                    message: `Đã tải ${data.length} lĩnh vực từ cơ sở dữ liệu`,
                    severity: 'success'
                });
            } catch (error) {
                console.error('❌ Error loading lĩnh vực:', error);
                setSnackbar({
                    open: true,
                    message: 'Không thể tải danh sách lĩnh vực',
                    severity: 'error'
                });
            } finally {
                setLinhVucLoading(false);
            }
        };

        loadLinhVuc();
    }, []);

    // Load working documents from IndexedDB on component mount
    useEffect(() => {
        refreshWorkingDocuments();
    }, [refreshWorkingDocuments]);
    useEffect(() => {
        if (!insertFieldKey && availableFieldKeys.length > 0) {
            setInsertFieldKey(availableFieldKeys[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableFieldKeys.length]);

    // Filter records when filters change
    useEffect(() => {
        const filtered = filterRecords(csvRecords, filters, linhVucList);
        setFilteredRecords(filtered);
    }, [csvRecords, filters, linhVucList]);
    // Load template when editor modal opens
    useEffect(() => {
        console.log('Modal state changed:', {
            showEditorModal: editorState.showEditorModal,
            selectedRecord: editorState.selectedRecord?.tenTTHC || 'none',
            syncfusionLoading: editorState.syncfusionLoading
        });
        if (editorState.showEditorModal && editorState.selectedRecord) {
            console.log('🚀 Triggering template load for:', editorState.selectedRecord.tenTTHC);
            loadTemplateIntoSyncfusion(editorState.selectedRecord);
        }
    }, [editorState.showEditorModal, editorState.selectedRecord, loadTemplateIntoSyncfusion]);
    useEffect(() => {
        templatePathRef.current = state.selectedTemplatePath;
    }, [state.selectedTemplatePath]);

    useEffect(() => {
        if (state.generatedBlob && previewContainerRef.current) {
            previewContainerRef.current.innerHTML = '';
            renderAsync(state.generatedBlob, previewContainerRef.current, undefined, {
                className: 'docx-preview-container'
            });
        }
    }, [state.generatedBlob]);
    useEffect(() => {
        const renderSelectedTemplate = async () => {
            // Điều kiện chung: chỉ chạy khi có mẫu được chọn.
            const templateUrl = state.uploadedTemplateUrl || state.selectedTemplatePath;
            if (!templateUrl) {
                return;
            }

            try {
                // ----- Chế độ xem Syncfusion -----
                if (previewMode === 'syncfusion') {
                    // Điều kiện kiểm tra ref cho Syncfusion
                    if (!sfContainerRef.current?.documentEditor) return;

                    // Kiểm tra xem có phải là working document từ IndexedDB không
                    const isWorkingDocument = templateUrl.startsWith('working://');

                    if (isWorkingDocument && state.generatedBlob) {
                        // Nếu là working document và có blob, mở trực tiếp vào Syncfusion
                        console.log(
                            '🔄 Loading working document from IndexedDB into Syncfusion...'
                        );
                        setSyncfusionLoading(true);
                        setSyncfusionDocumentReady(true);

                        try {
                            // Mở trực tiếp blob vào Syncfusion editor
                            sfContainerRef.current.documentEditor.open(state.generatedBlob);

                            // Wait a bit for the document to be fully loaded
                            setTimeout(() => {
                                // Verify document is actually loaded by checking its content
                                try {
                                    const testSfdt =
                                        sfContainerRef.current?.documentEditor?.serialize();
                                    if (testSfdt) {
                                        const testJson =
                                            typeof testSfdt === 'string'
                                                ? JSON.parse(testSfdt)
                                                : testSfdt;
                                        const testSections = testJson?.sections || testJson?.sec;
                                        if (
                                            testJson &&
                                            testSections &&
                                            Array.isArray(testSections)
                                        ) {
                                            setSyncfusionDocumentReady(true);
                                            setSyncfusionLoading(false);
                                            console.log(
                                                '✅ Syncfusion document ready for data insertion'
                                            );
                                            console.log(
                                                '📄 Document has',
                                                testSections.length,
                                                'sections'
                                            );
                                        } else {
                                            console.warn(
                                                '⚠️ Document structure not ready yet, waiting longer...'
                                            );
                                            console.log(
                                                'Available properties:',
                                                Object.keys(testJson || {})
                                            );
                                            // Wait a bit more
                                            setTimeout(() => {
                                                setSyncfusionDocumentReady(true);
                                                setSyncfusionLoading(false);
                                            }, 1000);
                                        }
                                    } else {
                                        console.warn(
                                            '⚠️ Cannot serialize document yet, waiting longer...'
                                        );
                                        setTimeout(() => {
                                            setSyncfusionDocumentReady(true);
                                            setSyncfusionLoading(false);
                                        }, 1000);
                                    }
                                } catch (error) {
                                    console.warn('⚠️ Error checking document readiness:', error);
                                    setSyncfusionDocumentReady(true);
                                    setSyncfusionLoading(false);
                                }
                            }, 1000);
                        } catch (e: any) {
                            console.error('❌ Error loading working document into Syncfusion:', e);
                            setSyncfusionLoading(false);
                            setSyncfusionDocumentReady(false);
                            setSnackbar({
                                open: true,
                                message:
                                    e?.message || 'Không thể mở tài liệu đã lưu trong Syncfusion',
                                severity: 'error'
                            });
                            // Nếu lỗi, giữ nguyên chế độ syncfusion
                            console.warn('Error loading working document, keeping syncfusion mode');
                        }
                    } else {
                        // Nếu không phải working document, sử dụng logic cũ để tải từ URL
                        try {
                            console.log('🔄 Loading template into Syncfusion...');
                            setSyncfusionLoading(true);
                            setSyncfusionDocumentReady(false);

                            const res = await fetch(templateUrl);
                            if (!res.ok) throw new Error('Không thể tải file mẫu cho Syncfusion');

                            const blob = await res.blob();
                            const form = new FormData();
                            form.append(
                                'files',
                                blob,
                                state.uploadedTemplateName || 'template.docx'
                            );

                            console.log('🔄 Converting DOCX to SFDT...');
                            // Gọi service của Syncfusion để chuyển đổi docx -> sfdt
                            const importRes = await fetch(`${SYNCFUSION_SERVICE_URL}Import`, {
                                method: 'POST',
                                body: form
                            });

                            if (!importRes.ok) {
                                throw new Error(`Lỗi khi import file: ${importRes.statusText}`);
                            }

                            const sfdtText = await importRes.text();
                            console.log('✅ SFDT conversion completed');

                            // Mở chuỗi SFDT nhận được từ service
                            console.log('🔄 Opening document in Syncfusion editor...');
                            sfContainerRef.current.documentEditor.open(sfdtText);

                            // Wait a bit for the document to be fully loaded
                            setTimeout(() => {
                                // Verify document is actually loaded by checking its content
                                try {
                                    const testSfdt =
                                        sfContainerRef.current?.documentEditor?.serialize();
                                    if (testSfdt) {
                                        const testJson =
                                            typeof testSfdt === 'string'
                                                ? JSON.parse(testSfdt)
                                                : testSfdt;
                                        const testSections = testJson?.sections || testJson?.sec;
                                        if (
                                            testJson &&
                                            testSections &&
                                            Array.isArray(testSections)
                                        ) {
                                            setSyncfusionDocumentReady(true);
                                            setSyncfusionLoading(false);
                                            console.log(
                                                '✅ Syncfusion document ready for data insertion'
                                            );
                                            console.log(
                                                '📄 Document has',
                                                testSections.length,
                                                'sections'
                                            );
                                        } else {
                                            console.warn(
                                                '⚠️ Document structure not ready yet, waiting longer...'
                                            );
                                            console.log(
                                                'Available properties:',
                                                Object.keys(testJson || {})
                                            );
                                            // Wait a bit more
                                            setTimeout(() => {
                                                setSyncfusionDocumentReady(true);
                                                setSyncfusionLoading(false);
                                            }, 1000);
                                        }
                                    } else {
                                        console.warn(
                                            '⚠️ Cannot serialize document yet, waiting longer...'
                                        );
                                        setTimeout(() => {
                                            setSyncfusionDocumentReady(true);
                                            setSyncfusionLoading(false);
                                        }, 1000);
                                    }
                                } catch (error) {
                                    console.warn('⚠️ Error checking document readiness:', error);
                                    setSyncfusionDocumentReady(true);
                                    setSyncfusionLoading(false);
                                }
                            }, 1000);
                        } catch (e: any) {
                            console.error('❌ Error loading Syncfusion document:', e);
                            setSyncfusionLoading(false);
                            setSyncfusionDocumentReady(false);
                            setSnackbar({
                                open: true,
                                message: e?.message || 'Không thể mở tài liệu trong Syncfusion',
                                severity: 'error'
                            });
                            // Nếu lỗi, giữ nguyên chế độ syncfusion
                            console.warn(
                                'Error loading Syncfusion document, keeping syncfusion mode'
                            );
                        }
                    }
                }
                // ----- Chế độ xem HTML -----
                // (Giữ nguyên logic HTML của bạn vì nó đã hoạt động tốt với selectedHtmlUrl)
            } catch (err) {
                console.error('Lỗi khi render preview mẫu:', err);
                const message = err instanceof Error ? err.message : 'Lỗi không xác định';
                setSnackbar({ open: true, message, severity: 'error' });
            }
        };

        renderSelectedTemplate();
    }, [
        state.selectedTemplatePath,
        state.uploadedTemplateUrl,
        previewMode,
        state.selectedHtmlUrl,
        state.generatedBlob
    ]);

    const handleSnackbarClose = useCallback(() => {
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);

    //#endregion Import
    const [offlineFilesState, setOfflineFilesState] = useState({
        downloadedFiles: {} as { [thanhPhanHoSoTTHCID: string]: boolean },
        totalDownloaded: 0,
        totalSize: 0
    });
    const [filteredThuTucHcList, setFilteredThuTucHcList] = useState<ThuTucHanhChinh[]>([]);

    const handleApiTemplateSelect = async (templateData: {
        record: ThuTucHanhChinh;
        template: import('@/admin/services/thanhPhanHoSoService').ThanhPhanHoSoTTHC;
    }) => {
        console.log('🎯 API Template selected:', templateData);

        try {
            // Convert ThanhPhanHoSoTTHC to a format compatible with the existing editor
            const { record, template } = templateData;

            // Check if template has a valid file path
            if (!template.duongDanTepDinhKem) {
                setSnackbar({
                    open: true,
                    message: 'Mẫu đơn không có đường dẫn tệp hợp lệ',
                    severity: 'error'
                });
                return;
            }

            // Pre-download all files for this procedure to improve performance
            try {
                console.log(
                    '📥 Pre-downloading all files for procedure:',
                    record.maThuTucHanhChinh
                );
                const allTemplates = await thanhPhanHoSoTTHCRepository.getThanhPhanHoSoByMaTTHC(
                    record.maThuTucHanhChinh
                );
                console.log(`✅ Found ${allTemplates.length} templates for procedure`);
            } catch (error) {
                console.warn(
                    '⚠️ Failed to pre-download files, continuing with selected template only:',
                    error
                );
            }

            const hasLocalFile = await thanhPhanHoSoTTHCRepository.hasLocalFile(
                template.thanhPhanHoSoTTHCID
            );

            let fileSource = 'online';
            let templatePath = '';

            if (hasLocalFile) {
                console.log('✅ Using offline file for template:', template.tenThanhPhanHoSoTTHC);
                fileSource = 'offline';
                templatePath = `offline:${template.thanhPhanHoSoTTHCID}`;
            } else {
                console.log('📥 File not available offline, downloading...');
                fileSource = 'downloading';

                // Try to download the file to IndexedDB
                const downloadSuccess = await thanhPhanHoSoTTHCRepository.downloadFileById(
                    template.thanhPhanHoSoTTHCID
                );

                if (downloadSuccess) {
                    console.log('✅ File downloaded successfully to IndexedDB');
                    fileSource = 'offline';
                    templatePath = `offline:${template.thanhPhanHoSoTTHCID}`;
                } else {
                    console.log('⚠️ Download failed, using API URL as fallback');
                    fileSource = 'online';
                    templatePath = `http://laptrinhid.qlns.vn/uploads/tthc/${template.duongDanTepDinhKem}`;
                }
            }

            // Create a compatible record for the editor
            const selectedMauDon = {
                tenFile: template.tenTepDinhKem,
                tenGiayTo: template.tenThanhPhanHoSoTTHC,
                tenThanhPhan: template.tenThanhPhanHoSoTTHC,
                soBanChinh: template.soBanChinh,
                soBanSao: template.soBanSao,
                ghiChu: template.ghiChu,
                duongDanTepDinhKem: template.duongDanTepDinhKem,
                duongDan: templatePath, // This will be used by loadTemplateIntoSyncfusion
                // Mark this as an API template for special handling
                isApiTemplate: true,
                isFromOffline: fileSource === 'offline',
                // Store template ID for offline access
                thanhPhanHoSoTTHCID: template.thanhPhanHoSoTTHCID
            };

            const editorRecord = {
                maTTHC: record.maThuTucHanhChinh,
                tenTTHC: record.tenThuTucHanhChinh,
                linhVuc: record.maLinhVuc,
                doiTuong: record.doiTuongThucHien,
                selectedMauDon: selectedMauDon,
                // Add danhSachMauDon array with the single selected template
                // This prevents the "Cannot read properties of undefined (reading 'map')" error
                danhSachMauDon: [selectedMauDon]
            } as any; // Type assertion for compatibility

            // Set the current code reference for later use
            currentCodeRef.current = record.maThuTucHanhChinh;

            // Check if there are existing working documents for this TTHC
            const hasExistingWorkingDocs = hasWorkingDocuments(record.maThuTucHanhChinh);
            console.log(
                `🔍 API template selection - Has existing working docs for ${record.maThuTucHanhChinh}:`,
                hasExistingWorkingDocs
            );

            if (hasExistingWorkingDocs) {
                // If there are working documents, show template selection modal with both API template and working documents
                console.log(
                    '📋 Showing template selection modal with API template + working documents'
                );
                setTemplateSelectionModal({
                    open: true,
                    record: editorRecord
                });
            } else {
                // If no working documents, directly open editor with API template
                console.log('🚀 Directly opening editor with API template (no working documents)');
                setEditorState(prev => ({
                    ...prev,
                    selectedRecord: editorRecord,
                    showEditorModal: true,
                    syncfusionLoading: true,
                    syncfusionDocumentReady: false
                }));
            }

            // setSnackbar({
            //     open: true,
            //     message: `Đang tải mẫu ${fileSource === 'offline' ? '(offline)' : fileSource === 'downloading' ? '(đang tải về)' : '(online)'}: ${template.tenThanhPhanHoSoTTHC}`,
            //     severity: 'info'
            // });

            const message = hasExistingWorkingDocs
                ? `Đã tìm thấy ${getWorkingDocumentsForMaTTHC(record.maThuTucHanhChinh).length} bản sao tùy chỉnh. Hãy chọn mẫu bạn muốn sử dụng.`
                : `Đang tải mẫu ${template.tenThanhPhanHoSoTTHC}`;

            setSnackbar({
                open: true,
                message,
                severity: hasExistingWorkingDocs ? 'info' : 'info'
            });

            // For API templates, we need to load the document from the appropriate source
            // This will be handled in the editor modal's useEffect when it detects isApiTemplate
        } catch (error) {
            console.error('❌ Error handling API template selection:', error);
            setSnackbar({
                open: true,
                message: 'Lỗi khi xử lý mẫu API',
                severity: 'error'
            });
        }
    };
    const [dataLoading, setDataLoading] = useState(true);
    const [thuTucHcList, setThuTucHcList] = useState<ThuTucHanhChinh[]>([]);
    const filterThuTucHanhChinh = (
        thuTucHcList: ThuTucHanhChinh[],
        filters: FilterState,
        linhVucList: LinhVuc[]
    ): ThuTucHanhChinh[] => {
        return thuTucHcList.filter(thuTucHC => {
            // Search text filter
            if (filters.searchText) {
                const searchLower = filters.searchText.toLowerCase();
                const linhVuc = linhVucList.find(lv => lv.maLinhVuc === thuTucHC.maLinhVuc);
                const searchableText = [
                    thuTucHC.tenThuTucHanhChinh,
                    thuTucHC.maThuTucHanhChinh,
                    linhVuc?.tenLinhVuc || thuTucHC.maLinhVuc,
                    thuTucHC.doiTuongThucHien,
                    thuTucHC.moTa
                ]
                    .join(' ')
                    .toLowerCase();
                if (!searchableText.includes(searchLower)) {
                    return false;
                }
            }

            // Lĩnh vực filter - filters.linhVuc chứa tenLinhVuc, cần map về maLinhVuc để so sánh
            if (filters.linhVuc) {
                // Tìm lĩnh vực từ tenLinhVuc để lấy maLinhVuc
                const selectedLinhVuc = linhVucList.find(lv => lv.tenLinhVuc === filters.linhVuc);
                if (selectedLinhVuc) {
                    // So sánh maLinhVuc của thuTucHC với maLinhVuc của lĩnh vực được chọn
                    if (thuTucHC.maLinhVuc !== selectedLinhVuc.maLinhVuc) {
                        return false;
                    }
                } else {
                    // Fallback: nếu không tìm thấy, có thể filters.linhVuc là maLinhVuc
                    if (thuTucHC.maLinhVuc !== filters.linhVuc) {
                        return false;
                    }
                }
            }

            if (filters.doiTuong && !thuTucHC.doiTuongThucHien.includes(filters.doiTuong)) {
                return false;
            }
            if (filters.capThucHien && !thuTucHC.maCapHanhChinh.includes(filters.capThucHien)) {
                return false;
            }

            // Note: availability filter không áp dụng cho IndexedDB data vì templates được load từ API riêng

            return true;
        });
    };

    const memoizedFilteredData = useMemo(() => {
        // Ensure arrays are not undefined before filtering
        if (
            !thuTucHcList ||
            !Array.isArray(thuTucHcList) ||
            !linhVucList ||
            !Array.isArray(linhVucList)
        ) {
            console.log('⚠️ Data not ready yet:', {
                thuTucHcList: !!thuTucHcList,
                linhVucList: !!linhVucList
            });
            return [];
        }

        const filtered = filterThuTucHanhChinh(thuTucHcList, filters, linhVucList);
        console.log('🔍 Filtered data:', {
            total: thuTucHcList.length,
            filtered: filtered.length,
            filters
        });
        return filtered;
    }, [thuTucHcList, filters, linhVucList]);

    useEffect(() => {
        setFilteredThuTucHcList(memoizedFilteredData);
    }, [memoizedFilteredData]);
    //#region Import

    return (
        <>
            <Box
                sx={{
                    width: '100%',
                    minHeight: '100vh',
                    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                    p: { xs: 1, sm: 1, md: 1 },
                    '@keyframes slideInRight': {
                        '0%': {
                            opacity: 0,
                            transform: 'translateY(-50%) translateX(100%)'
                        },
                        '100%': {
                            opacity: 1,
                            transform: 'translateY(-50%) translateX(0)'
                        }
                    }
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1,
                        p: 2,
                        borderRadius: 1,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        backdropFilter: 'blur(10px)',
                        background: 'rgba(255,255,255,0.95)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        transition: 'all 0.3s ease',
                        mb: 1
                    }}
                >
                    <TextField
                        size="small"
                        value={filters.searchText}
                        onChange={e => handleFilterChange('searchText', e.target.value)}
                        placeholder="Tìm kiếm thủ tục, mã, lĩnh vực..."
                        variant="outlined"
                        sx={{
                            minWidth: 220,
                            flex: 1,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 1,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    boxShadow: '0 4px 12px rgba(25,118,210,0.15)'
                                },
                                '&.Mui-focused': {
                                    boxShadow: '0 4px 20px rgba(25,118,210,0.25)'
                                }
                            }
                        }}
                    />
                    <Autocomplete
                        size="small"
                        options={['', ...linhVucList.map(lv => lv.maLinhVuc)]}
                        value={filters.linhVuc}
                        onChange={(event, newValue) => {
                            handleFilterChange('linhVuc', newValue || '');

                            // Debug: Log thông tin lĩnh vực được chọn
                            if (newValue) {
                                const selectedLinhVuc = linhVucList.find(
                                    lv => lv.maLinhVuc === newValue
                                );
                                console.log('🎯 Selected lĩnh vực:', {
                                    maLinhVuc: newValue,
                                    tenLinhVuc: selectedLinhVuc?.tenLinhVuc,
                                    csvMatch: filterOptions.linhVuc.includes(
                                        selectedLinhVuc?.tenLinhVuc || ''
                                    )
                                });
                            }
                        }}
                        getOptionLabel={option => {
                            if (!option) return 'Tất cả';
                            const linhVuc = linhVucList.find(lv => lv.maLinhVuc === option);
                            return linhVuc ? linhVuc.tenLinhVuc : option;
                        }}
                        renderInput={params => (
                            <TextField
                                {...params}
                                label={`Lĩnh vực (${linhVucList.length})`}
                                placeholder={linhVucLoading ? 'Đang tải...' : 'Chọn lĩnh vực'}
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <>
                                            {linhVucLoading && <CircularProgress size={20} />}
                                            {params.InputProps.endAdornment}
                                        </>
                                    )
                                }}
                            />
                        )}
                        loading={linhVucLoading}
                        sx={{ minWidth: 250, maxWidth: 250 }}
                        renderOption={(props, option) => {
                            if (!option) {
                                return (
                                    <Box component="li" {...props}>
                                        <Typography variant="body2">Tất cả</Typography>
                                    </Box>
                                );
                            }

                            const linhVuc = linhVucList.find(lv => lv.maLinhVuc === option);
                            return (
                                <Box component="li" {...props}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 0.5,
                                            width: '100%'
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {linhVuc?.tenLinhVuc || option}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Mã: {option}
                                        </Typography>
                                    </Box>
                                </Box>
                            );
                        }}
                    />

                    <Autocomplete
                        size="small"
                        sx={{ minWidth: 200, maxWidth: 200 }}
                        options={filterOptions.doiTuong}
                        value={filters.doiTuong || null}
                        onChange={(e, newValue) => handleFilterChange('doiTuong', newValue || '')}
                        renderInput={params => (
                            <TextField {...params} label="Đối tượng" placeholder="Tất cả" />
                        )}
                    />
                    <Autocomplete
                        size="small"
                        sx={{ minWidth: 200, maxWidth: 200 }}
                        options={filterOptions.capThucHien}
                        value={filters.capThucHien || null}
                        onChange={(e, newValue) =>
                            handleFilterChange('capThucHien', newValue || '')
                        }
                        renderInput={params => (
                            <TextField {...params} label="Cấp thực hiện" placeholder="Tất cả" />
                        )}
                    />
                </Box>
                {/* Template List */}
                <Card
                    sx={{
                        borderRadius: 1,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        backdropFilter: 'blur(10px)',
                        background: 'rgba(255,255,255,0.95)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        transition: 'all 0.3s ease',
                        height: '90vh'
                    }}
                >
                    <CardHeader
                        title={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Danh sách mẫu đơn
                                </Typography>
                            </Box>
                        }
                        sx={{
                            pb: 0,
                            '& .MuiCardHeader-title': {
                                fontSize: '1.1rem',
                                fontWeight: 600
                            }
                        }}
                    />
                    <CardContent
                        sx={{
                            flex: 1,
                            height: '100%'
                        }}
                    >
                        {dataLoading || linhVucLoading ? (
                            <Box sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                    <CircularProgress size={24} />
                                    <Typography
                                        variant="body1"
                                        color="primary"
                                        sx={{ fontWeight: 500 }}
                                    >
                                        Đang tải danh sách thủ tục hành chính...
                                    </Typography>
                                </Box>
                                {/* Skeleton Loading */}
                                {[1, 2, 3].map(item => (
                                    <Box
                                        key={item}
                                        sx={{
                                            mb: 3,
                                            p: 3,
                                            borderRadius: 1,
                                            border: '1px solid #e0e0e0',
                                            animation: 'pulse 1.5s ease-in-out infinite alternate'
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start'
                                            }}
                                        >
                                            <Box sx={{ flex: 1 }}>
                                                <Box
                                                    sx={{
                                                        height: 24,
                                                        bgcolor: '#f0f0f0',
                                                        borderRadius: 1,
                                                        mb: 2,
                                                        width: '70%',
                                                        animation:
                                                            'shimmer 1.5s ease-in-out infinite'
                                                    }}
                                                />
                                                <Box
                                                    sx={{
                                                        height: 16,
                                                        bgcolor: '#f5f5f5',
                                                        borderRadius: 1,
                                                        mb: 1,
                                                        width: '50%'
                                                    }}
                                                />
                                                <Box
                                                    sx={{
                                                        height: 16,
                                                        bgcolor: '#f5f5f5',
                                                        borderRadius: 1,
                                                        width: '60%'
                                                    }}
                                                />
                                            </Box>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 1,
                                                    alignItems: 'flex-end'
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        height: 24,
                                                        width: 80,
                                                        bgcolor: '#e8f5e8',
                                                        borderRadius: 12
                                                    }}
                                                />
                                                <Box
                                                    sx={{
                                                        height: 32,
                                                        width: 120,
                                                        bgcolor: '#e3f2fd',
                                                        borderRadius: 1
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    height: '100%',
                                    overflowY: 'auto',
                                    pr: 1,
                                    pt: 1,
                                    paddingBottom: 0,
                                    flex: 1,
                                    '&::-webkit-scrollbar': {
                                        width: '8px'
                                    },
                                    '&::-webkit-scrollbar-track': {
                                        background: '#f1f1f1',
                                        borderRadius: '4px'
                                    },
                                    '&::-webkit-scrollbar-thumb': {
                                        background: '#c1c1c1',
                                        borderRadius: '4px',
                                        '&:hover': {
                                            background: '#a8a8a8'
                                        }
                                    }
                                }}
                            >
                                {filteredThuTucHcList &&
                                    Array.isArray(filteredThuTucHcList) &&
                                    filteredThuTucHcList.map((data, index) => (
                                        <ApiTemplateCard
                                            key={`${data.thuTucHanhChinhID}-${index}`}
                                            record={data}
                                            linhVucList={linhVucList || []}
                                            onSelect={() => {}}
                                            onTemplateSelect={handleApiTemplateSelect}
                                            hasWorkingDocuments={hasWorkingDocuments(
                                                data.maThuTucHanhChinh
                                            )}
                                            workingDocumentsCount={
                                                getWorkingDocumentsForMaTTHC(data.maThuTucHanhChinh)
                                                    .length
                                            }
                                        />
                                    ))}
                                {(!filteredThuTucHcList || filteredThuTucHcList.length === 0) &&
                                    !dataLoading &&
                                    !linhVucLoading && (
                                        <Paper
                                            sx={{
                                                p: 6,
                                                textAlign: 'center',
                                                borderRadius: 1,
                                                background:
                                                    'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                                                border: '2px dashed #dee2e6'
                                            }}
                                        >
                                            <Box sx={{ mb: 3 }}>
                                                <Typography
                                                    variant="h1"
                                                    sx={{
                                                        fontSize: '4rem',
                                                        opacity: 0.7,
                                                        mb: 2
                                                    }}
                                                >
                                                    📄
                                                </Typography>
                                            </Box>
                                            <Typography
                                                variant="h5"
                                                color="text.secondary"
                                                sx={{
                                                    mb: 2,
                                                    fontWeight: 600
                                                }}
                                            >
                                                Không tìm thấy mẫu đơn nào
                                            </Typography>
                                            <Typography
                                                variant="body1"
                                                color="text.secondary"
                                                sx={{ mb: 3 }}
                                            >
                                                Thử thay đổi bộ lọc để tìm kiếm mẫu đơn phù hợp với
                                                nhu cầu của bạn
                                            </Typography>
                                            <Button
                                                variant="outlined"
                                                onClick={handleClearFilters}
                                                sx={{
                                                    borderRadius: 1,
                                                    textTransform: 'none',
                                                    fontWeight: 600
                                                }}
                                            >
                                                🔄 Xóa tất cả bộ lọc
                                            </Button>
                                        </Paper>
                                    )}
                            </Box>
                        )}
                    </CardContent>
                </Card>
                {/* Syncfusion Editor Modal */}
                <Dialog
                    open={editorState.showEditorModal}
                    onClose={handleCloseEditor}
                    fullWidth
                    sx={{
                        '& .MuiDialog-paper': {
                            width: { xs: '90vw', sm: '100vw' },
                            height: { xs: '100vh', sm: '100vh' },
                            maxHeight: { xs: '100vh', sm: '100vh' },
                            maxWidth: { xs: '100vw', sm: '100vw' },
                            // borderRadius: { xs: 0, sm: 3 },
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                            boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
                            overflow: 'hidden',
                            margin: { xs: 0, sm: 'auto' }
                        },
                        '& .MuiBackdrop-root': {
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            backdropFilter: 'blur(4px)'
                        }
                    }}
                >
                    <DialogTitle
                        style={{
                            padding: 0,
                            margin: 0
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingRight: 2,
                                paddingLeft: 2
                            }}
                        >
                            <Typography
                                style={{
                                    paddingLeft: 10
                                }}
                                fontWeight={'bold'}
                            >
                                Thiết lập mẫu
                            </Typography>
                            <Box>
                                <IconButton onClick={handleCloseEditor}>
                                    <Close
                                        style={{
                                            fontSize: 24
                                        }}
                                    />
                                </IconButton>
                            </Box>
                        </Box>
                    </DialogTitle>
                    <DialogContent
                        sx={{
                            p: 0,
                            height: 'calc(100% - 120px)',
                            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: { xs: 'column', lg: 'row' },
                                width: '100%',
                                height: '100%',
                                gap: { xs: 1, sm: 2 },
                                p: { xs: 1, sm: 2 }
                            }}
                        >
                            <Card
                                sx={{
                                    position: 'relative',
                                    height: { xs: '100%', lg: '100%' },
                                    width: { xs: '100%', lg: '100%' },
                                    borderRadius: { xs: 1, sm: 2 },
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                                    background: 'rgba(255,255,255,0.95)',
                                    overflow: 'hidden'
                                }}
                            >
                                <Box
                                    sx={{
                                        background:
                                            'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                        borderBottom: '1px solid rgba(0,0,0,0.1)',
                                        p: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <Paper sx={{ p: 3, height: 'fit-content' }}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between'
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    gap: 1,
                                                    flexWrap: 'wrap',
                                                    justifyContent: 'space-between',
                                                    width: '100%'
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        gap: 1,
                                                        flexWrap: 'wrap'
                                                    }}
                                                >
                                                    <Button
                                                        variant="outlined"
                                                        color="info"
                                                        startIcon={<InfoIcon />}
                                                        onClick={() => setShowFieldGuide(true)}
                                                    >
                                                        Hướng dẫn chèn mẫu thiết lập
                                                    </Button>
                                                    <Button
                                                        variant="outlined"
                                                        color="secondary"
                                                        startIcon={<AddCircleOutlineIcon />}
                                                        onClick={() =>
                                                            setShowQuickInsertPanel(
                                                                !showQuickInsertPanel
                                                            )
                                                        }
                                                        sx={{
                                                            backgroundColor: showQuickInsertPanel
                                                                ? 'secondary.50'
                                                                : 'transparent'
                                                        }}
                                                    >
                                                        {showQuickInsertPanel ? 'Ẩn' : 'Hiện'} modal
                                                        thiết lập
                                                    </Button>
                                                    {/* <Button
                                                        variant="outlined"
                                                        startIcon={<DownloadIcon />}
                                                        onClick={handleDownloadOriginalTemplate}
                                                    >
                                                        Tải File gốc
                                                    </Button> */}
                                                    <Button
                                                        component="label"
                                                        variant="outlined"
                                                        startIcon={<UploadIcon />}
                                                    >
                                                        Tải mẫu mới
                                                        <input
                                                            type="file"
                                                            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                                            hidden
                                                            onChange={e => {
                                                                const file = e.target.files?.[0];
                                                                if (file)
                                                                    handleUploadReplaceDocument(
                                                                        file
                                                                    );
                                                                // Reset input value to allow selecting the same file again
                                                                e.target.value = '';
                                                            }}
                                                        />
                                                    </Button>
                                                </Box>

                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    {/* Dropdown to select a template */}
                                                    <FormControl
                                                        size="small"
                                                        sx={{ minWidth: 200 }}
                                                    >
                                                        <InputLabel id="template-select-label">
                                                            Chọn mẫu
                                                        </InputLabel>
                                                        <Select
                                                            labelId="template-select-label"
                                                            value={
                                                                editorState.selectedRecord
                                                                    ?.selectedMauDon?.tenFile || ''
                                                            }
                                                            onChange={async e => {
                                                                const selectedTemplateName =
                                                                    e.target.value;

                                                                // Find the selected template in both CSV and IndexedDB templates
                                                                const selectedTemplate =
                                                                    editorState.selectedRecord?.danhSachMauDon.find(
                                                                        template =>
                                                                            template.tenFile ===
                                                                            selectedTemplateName
                                                                    ) ||
                                                                    getWorkingDocumentsForMaTTHC(
                                                                        editorState.selectedRecord
                                                                            ?.maTTHC || ''
                                                                    ).find(
                                                                        doc =>
                                                                            doc.fileName ===
                                                                            selectedTemplateName
                                                                    );

                                                                if (selectedTemplate) {
                                                                    let updatedRecord = {
                                                                        ...editorState.selectedRecord!
                                                                    };

                                                                    // Check if the selected template is from IndexedDB
                                                                    if (
                                                                        'blob' in selectedTemplate
                                                                    ) {
                                                                        // Create a custom `MauDon` object for IndexedDB templates
                                                                        const customMauDon = {
                                                                            tenGiayTo: `Tài liệu đã lưu - ${selectedTemplate.fileName}`,
                                                                            tenFile:
                                                                                selectedTemplate.fileName,
                                                                            duongDan: `IndexedDB - ${new Date(selectedTemplate.updatedAt).toLocaleDateString('vi-VN')}`,
                                                                            isFromIndexedDB: true,
                                                                            workingDocument:
                                                                                selectedTemplate
                                                                        };
                                                                        updatedRecord.selectedMauDon =
                                                                            customMauDon;
                                                                    } else {
                                                                        // For CSV templates
                                                                        updatedRecord.selectedMauDon =
                                                                            selectedTemplate;
                                                                    }

                                                                    // Update the editor state with the selected template
                                                                    setEditorState(prev => ({
                                                                        ...prev,
                                                                        selectedRecord:
                                                                            updatedRecord,
                                                                        syncfusionLoading: true,
                                                                        syncfusionDocumentReady: false
                                                                    }));

                                                                    // Reload the selected template into Syncfusion
                                                                    await loadTemplateIntoSyncfusion(
                                                                        updatedRecord
                                                                    );

                                                                    setSnackbar({
                                                                        open: true,
                                                                        message: `Đã tải mẫu: ${selectedTemplateName}`,
                                                                        severity: 'success'
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            {/* Add CSV templates */}
                                                            {editorState.selectedRecord?.danhSachMauDon.map(
                                                                (template, index) => (
                                                                    <MenuItem
                                                                        key={`csv-${index}`}
                                                                        value={template.tenFile}
                                                                    >
                                                                        {template.tenFile}
                                                                    </MenuItem>
                                                                )
                                                            )}

                                                            {/* Add IndexedDB templates */}
                                                            {getWorkingDocumentsForMaTTHC(
                                                                editorState.selectedRecord
                                                                    ?.maTTHC || ''
                                                            ).map((workingDoc, index) => (
                                                                <MenuItem
                                                                    key={`indexeddb-${index}`}
                                                                    value={workingDoc.fileName}
                                                                >
                                                                    {workingDoc.fileName} (mẫu đã
                                                                    thiết lập)
                                                                </MenuItem>
                                                            ))}
                                                        </Select>
                                                    </FormControl>
                                                    <Button
                                                        variant="outlined"
                                                        startIcon={<DownloadIcon />}
                                                        onClick={handleDownloadWorkingDocument}
                                                        disabled={
                                                            !(
                                                                state.generatedBlob ||
                                                                state.uploadedTemplateUrl ||
                                                                state.selectedTemplatePath ||
                                                                (previewMode === 'syncfusion' &&
                                                                    sfContainerRef.current
                                                                        ?.documentEditor)
                                                            )
                                                        }
                                                    >
                                                        TẢI
                                                    </Button>
                                                    <Button
                                                        variant="outlined"
                                                        startIcon={<SaveIcon />}
                                                        onClick={handleSaveWorkingDocument}
                                                        disabled={
                                                            !(
                                                                state.generatedBlob ||
                                                                state.uploadedTemplateUrl ||
                                                                state.selectedTemplatePath ||
                                                                (previewMode === 'syncfusion' &&
                                                                    sfContainerRef.current
                                                                        ?.documentEditor)
                                                            )
                                                        }
                                                    >
                                                        Lưu
                                                    </Button>
                                                </Box>
                                            </Box>
                                        </Box>
                                        <Divider sx={{ mb: 2 }} />
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                bgcolor: 'grey.50',
                                                minHeight: '70vh',
                                                overflowY: 'auto',
                                                border: '1px solid #e0e0e0'
                                            }}
                                        >
                                            {previewMode === 'syncfusion' && (
                                                <div
                                                    style={{
                                                        width: '100%',
                                                        minHeight: '70vh',
                                                        position: 'relative'
                                                    }}
                                                >
                                                    {syncfusionLoading && (
                                                        <Box
                                                            sx={{
                                                                position: 'absolute',
                                                                top: 0,
                                                                left: 0,
                                                                right: 0,
                                                                bottom: 0,
                                                                backgroundColor:
                                                                    'rgba(255, 255, 255, 0.8)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                zIndex: 1000,
                                                                flexDirection: 'column',
                                                                gap: 2
                                                            }}
                                                        >
                                                            <CircularProgress />
                                                            <Typography
                                                                variant="body2"
                                                                color="text.secondary"
                                                            >
                                                                Đang tải tài liệu...
                                                            </Typography>
                                                        </Box>
                                                    )}

                                                    <DocumentEditorContainerComponent
                                                        id="sf-docx-editor-embedded"
                                                        ref={sfContainerRef}
                                                        serviceUrl={SYNCFUSION_SERVICE_URL}
                                                        enableToolbar={true}
                                                        height={'70vh'}
                                                        width={'80vw'}
                                                        style={{ display: 'block' }}
                                                        toolbarMode={'Toolbar'}
                                                        locale="vi-VN"
                                                    />

                                                    {/* Quick Insert Field Panel */}
                                                    {syncfusionDocumentReady ||
                                                        (showQuickInsertPanel && (
                                                            <Box
                                                                sx={{
                                                                    position: 'fixed',
                                                                    top: '50%',
                                                                    right: 32,
                                                                    transform: 'translateY(-50%)',
                                                                    background:
                                                                        'linear-gradient(135deg, #fff 0%, #f8f9fa 100%)',
                                                                    border: '2px solid rgba(255,255,255,0.3)',
                                                                    borderRadius: 3,
                                                                    boxShadow:
                                                                        '0 8px 32px rgba(0,0,0,0.2)',
                                                                    p: 3,
                                                                    maxWidth: 320,
                                                                    zIndex: 9999,
                                                                    backdropFilter: 'blur(10px)',
                                                                    '&:hover': {
                                                                        boxShadow:
                                                                            '0 12px 40px rgba(0,0,0,0.3)',
                                                                        transform:
                                                                            'translateY(-50%) scale(1.02)'
                                                                    },
                                                                    transition: 'all 0.3s ease',
                                                                    animation:
                                                                        'slideInRight 0.5s ease-out'
                                                                }}
                                                            >
                                                                <Box
                                                                    sx={{
                                                                        display: 'flex',
                                                                        justifyContent:
                                                                            'space-between',
                                                                        alignItems: 'center',
                                                                        mb: 1.5,
                                                                        cursor: 'move',
                                                                        '&:hover': {
                                                                            backgroundColor:
                                                                                'rgba(0,0,0,0.02)',
                                                                            borderRadius: 1
                                                                        }
                                                                    }}
                                                                    title="Kéo để di chuyển panel"
                                                                >
                                                                    <Typography
                                                                        variant="subtitle2"
                                                                        sx={{
                                                                            fontWeight: 'bold',
                                                                            color: 'primary.main',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: 1
                                                                        }}
                                                                    >
                                                                        <AddCircleOutlineIcon fontSize="small" />
                                                                        Chèn Field Nhanh
                                                                    </Typography>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() =>
                                                                            setShowQuickInsertPanel(
                                                                                false
                                                                            )
                                                                        }
                                                                        sx={{
                                                                            color: 'text.secondary',
                                                                            '&:hover': {
                                                                                color: 'error.main',
                                                                                backgroundColor:
                                                                                    'error.50'
                                                                            }
                                                                        }}
                                                                    >
                                                                        <CloseIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Box>
                                                                <Box
                                                                    sx={{
                                                                        display: 'flex',
                                                                        flexWrap: 'wrap',
                                                                        gap: 1
                                                                    }}
                                                                >
                                                                    {[
                                                                        {
                                                                            label: 'Họ tên',
                                                                            value: '{ho_ten}',
                                                                            color: 'primary'
                                                                        },
                                                                        {
                                                                            label: 'Ngày sinh',
                                                                            value: '{ngay_sinh}',
                                                                            color: 'info'
                                                                        },
                                                                        {
                                                                            label: 'Giới tính',
                                                                            value: '{gioi_tinh}',
                                                                            color: 'info'
                                                                        },
                                                                        {
                                                                            label: 'Địa chỉ',
                                                                            value: '{noi_cu_tru}',
                                                                            color: 'success'
                                                                        },
                                                                        {
                                                                            label: 'Dân tộc',
                                                                            value: '{dan_toc}',
                                                                            color: 'warning'
                                                                        },
                                                                        {
                                                                            label: 'Ngày cấp',
                                                                            value: '{ngay_cap}',
                                                                            color: 'error'
                                                                        },
                                                                        {
                                                                            label: 'Số CCCD',
                                                                            value: '{so_cccd}',
                                                                            color: 'secondary'
                                                                        },
                                                                        {
                                                                            label: 'Số CMND',
                                                                            value: '{so_cmnd}',
                                                                            color: 'secondary'
                                                                        },
                                                                        {
                                                                            label: 'Ngày hiện tại',
                                                                            value: '{ngay_hientai}',
                                                                            color: 'info'
                                                                        },
                                                                        {
                                                                            label: 'Tháng hiện tại',
                                                                            value: '{thang_hientai}',
                                                                            color: 'info'
                                                                        },
                                                                        {
                                                                            label: 'Năm hiện tại',
                                                                            value: '{nam_hientai}',
                                                                            color: 'info'
                                                                        }
                                                                    ].map((field, index) => (
                                                                        <Button
                                                                            key={field.value}
                                                                            size="small"
                                                                            variant="outlined"
                                                                            color={
                                                                                field.color as any
                                                                            }
                                                                            sx={{
                                                                                fontSize: '11px',
                                                                                py: 0.5,
                                                                                px: 1,
                                                                                textTransform:
                                                                                    'none',
                                                                                borderRadius: 1,
                                                                                flex: '1 1 calc(50% - 4px)',
                                                                                minWidth: '90px',
                                                                                '&:hover': {
                                                                                    transform:
                                                                                        'translateY(-1px)',
                                                                                    boxShadow: 2
                                                                                },
                                                                                transition:
                                                                                    'all 0.2s ease'
                                                                            }}
                                                                            onClick={() =>
                                                                                insertFieldIntoSyncfusion(
                                                                                    field.value
                                                                                )
                                                                            }
                                                                            title={`Chèn ${field.value} vào vị trí con trô`}
                                                                        >
                                                                            {field.label}
                                                                        </Button>
                                                                    ))}
                                                                </Box>
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{
                                                                        mt: 1.5,
                                                                        display: 'block',
                                                                        textAlign: 'center',
                                                                        color: 'text.secondary',
                                                                        fontStyle: 'italic'
                                                                    }}
                                                                >
                                                                    💡 Click để chèn field vào vị
                                                                    trí con trỏ
                                                                </Typography>
                                                                {/* Quick input box (separate fields) */}
                                                                <Box
                                                                    sx={{
                                                                        mt: 2,
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        gap: 1.5
                                                                    }}
                                                                >
                                                                    <Typography
                                                                        variant="caption"
                                                                        color="text.secondary"
                                                                    >
                                                                        Nhập nhanh giá trị (tùy
                                                                        chọn)
                                                                    </Typography>
                                                                    <Box
                                                                        sx={{
                                                                            display: 'grid',
                                                                            gridTemplateColumns:
                                                                                '1fr 1fr',
                                                                            gap: 1
                                                                        }}
                                                                    >
                                                                        {quickInputFields.map(f => (
                                                                            <TextField
                                                                                key={`input-${f.key}`}
                                                                                size="small"
                                                                                label={f.label}
                                                                                placeholder={
                                                                                    f.placeholder ||
                                                                                    `{${f.key}}`
                                                                                }
                                                                                value={
                                                                                    quickInputValues[
                                                                                        f.key
                                                                                    ] || ''
                                                                                }
                                                                                onChange={e =>
                                                                                    setQuickInputValues(
                                                                                        prev => ({
                                                                                            ...prev,
                                                                                            [f.key]:
                                                                                                e
                                                                                                    .target
                                                                                                    .value
                                                                                        })
                                                                                    )
                                                                                }
                                                                            />
                                                                        ))}
                                                                    </Box>
                                                                    <Box
                                                                        sx={{
                                                                            display: 'flex',
                                                                            gap: 1,
                                                                            justifyContent:
                                                                                'flex-end'
                                                                        }}
                                                                    >
                                                                        <Button
                                                                            size="small"
                                                                            color="inherit"
                                                                            onClick={
                                                                                handleClearQuickInputs
                                                                            }
                                                                        >
                                                                            Xóa
                                                                        </Button>
                                                                        <Button
                                                                            size="small"
                                                                            variant="contained"
                                                                            onClick={
                                                                                handleApplyQuickInputs
                                                                            }
                                                                        >
                                                                            Áp dụng
                                                                        </Button>
                                                                    </Box>
                                                                </Box>
                                                            </Box>
                                                        ))}
                                                </div>
                                            )}
                                        </Paper>
                                    </Paper>
                                </Box>
                                {/* Document editor is now handled by the instance in the left panel above */}
                            </Card>
                        </Box>
                    </DialogContent>
                </Dialog>
                {/* Modal chọn mẫu đơn */}
                <Dialog
                    open={templateSelectionModal.open}
                    onClose={() => setTemplateSelectionModal({ open: false, record: null })}
                    maxWidth="md"
                    fullWidth
                    sx={{
                        '& .MuiDialog-paper': {
                            borderRadius: 1,
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                            boxShadow: '0 24px 48px rgba(0,0,0,0.2)'
                        }
                    }}
                >
                    <Box
                        sx={{
                            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                            color: 'white',
                            p: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}
                    >
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            Chọn mẫu đơn - {templateSelectionModal.record?.tenTTHC}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <IconButton
                                onClick={() =>
                                    setTemplateSelectionModal({ open: false, record: null })
                                }
                                sx={{ color: 'white' }}
                            >
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </Box>
                    <DialogContent sx={{ p: 3 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Vui lòng chọn một mẫu đơn từ danh sách bên dưới để tiếp tục:
                        </Typography>

                        {/* API + CSV Templates Section */}
                        {templateSelectionModal.record?.danhSachMauDon &&
                            templateSelectionModal.record.danhSachMauDon.length > 0 && (
                                <>
                                    <Typography
                                        variant="h6"
                                        sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}
                                    >
                                        Mẫu đơn
                                        {templateSelectionModal.record.selectedMauDon
                                            ?.isApiTemplate && (
                                            <Chip
                                                label="API Template"
                                                color="primary"
                                                size="small"
                                                sx={{ ml: 1, fontWeight: 600 }}
                                            />
                                        )}
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 2,
                                            mb: 4
                                        }}
                                    >
                                        {templateSelectionModal.record.danhSachMauDon.map(
                                            (mauDon, index) => (
                                                <Paper
                                                    key={`csv-${index}`}
                                                    variant="outlined"
                                                    sx={{
                                                        p: 3,
                                                        borderRadius: 1,
                                                        border: '2px solid transparent',
                                                        background:
                                                            'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s ease',
                                                        '&:hover': {
                                                            transform: 'translateY(-2px)',
                                                            boxShadow:
                                                                '0 8px 25px rgba(25,118,210,0.15)',
                                                            borderColor: '#1976d2'
                                                        }
                                                    }}
                                                    onClick={() => {
                                                        // Cập nhật selectedMauDon cho record
                                                        const updatedRecord = {
                                                            ...templateSelectionModal.record!,
                                                            selectedMauDon: mauDon
                                                        };
                                                        setTemplateSelectionModal({
                                                            open: false,
                                                            record: null
                                                        });

                                                        // Set the current code reference for later use
                                                        currentCodeRef.current =
                                                            templateSelectionModal.record!.maTTHC;

                                                        // Trực tiếp mở editor thay vì gọi handleSelectTemplate
                                                        setEditorState(prev => ({
                                                            ...prev,
                                                            selectedRecord: updatedRecord,
                                                            showEditorModal: true,
                                                            syncfusionLoading: true,
                                                            syncfusionDocumentReady: false
                                                        }));
                                                        setShowQuickInsertPanel(true);
                                                        resetProcessing();

                                                        setSnackbar({
                                                            open: true,
                                                            message: `Đang tải mẫu: ${updatedRecord.tenTTHC}`,
                                                            severity: 'info'
                                                        });
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center'
                                                        }}
                                                    >
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography
                                                                variant="h6"
                                                                sx={{ fontWeight: 600, mb: 1 }}
                                                            >
                                                                {mauDon.tenFile}
                                                            </Typography>
                                                            {mauDon.tenGiayTo && (
                                                                <Typography
                                                                    variant="body2"
                                                                    color="text.secondary"
                                                                >
                                                                    {mauDon.tenGiayTo}
                                                                </Typography>
                                                            )}
                                                            <Typography
                                                                variant="caption"
                                                                color="primary"
                                                                sx={{ fontStyle: 'italic' }}
                                                            >
                                                                {mauDon.duongDan}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            justifyContent: 'flex-end'
                                                        }}
                                                    >
                                                        <Button
                                                            variant="contained"
                                                            size="medium"
                                                            startIcon={<EditIcon />}
                                                            sx={{
                                                                borderRadius: 1,
                                                                textTransform: 'none',
                                                                fontWeight: 600,
                                                                background:
                                                                    'linear-gradient(45deg, #1976d2, #42a5f5)',
                                                                '&:hover': {
                                                                    background:
                                                                        'linear-gradient(45deg, #1565c0, #1976d2)',
                                                                    transform: 'translateY(-2px)'
                                                                },
                                                                transition: 'all 0.3s ease'
                                                            }}
                                                        >
                                                            Sử dụng mẫu này
                                                        </Button>
                                                    </Box>
                                                </Paper>
                                            )
                                        )}
                                    </Box>
                                </>
                            )}

                        {/* IndexedDB Working Documents Section */}
                        {templateSelectionModal.record?.maTTHC &&
                            hasWorkingDocuments(templateSelectionModal.record.maTTHC) && (
                                <>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            mb: 2,
                                            color: 'success.main',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1
                                        }}
                                    >
                                        <Chip
                                            label="Đã tùy chỉnh"
                                            color="success"
                                            size="small"
                                            sx={{ fontWeight: 600 }}
                                        />
                                        Mẫu đơn đã thiết lập (
                                        {
                                            getWorkingDocumentsForMaTTHC(
                                                templateSelectionModal.record.maTTHC
                                            ).length
                                        }
                                        )
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {getWorkingDocumentsForMaTTHC(
                                            templateSelectionModal.record.maTTHC
                                        ).map((workingDoc, index) => (
                                            <Paper
                                                key={`indexeddb-${index}`}
                                                variant="outlined"
                                                sx={{
                                                    p: 3,
                                                    borderRadius: 1,
                                                    border: '2px solid transparent',
                                                    background:
                                                        'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s ease',
                                                    '&:hover': {
                                                        transform: 'translateY(-2px)',
                                                        boxShadow:
                                                            '0 8px 25px rgba(25,118,210,0.15)',
                                                        borderColor: '#1976d2'
                                                    }
                                                }}
                                                onClick={() => {
                                                    // Create a custom mauDon object from working document
                                                    const customMauDon = {
                                                        tenGiayTo: `Tài liệu đã lưu - ${workingDoc.fileName}`,
                                                        tenFile: workingDoc.fileName,
                                                        duongDan: `IndexedDB - ${new Date(workingDoc.updatedAt).toLocaleDateString('vi-VN')}`,
                                                        isFromIndexedDB: true,
                                                        workingDocument: workingDoc
                                                    };

                                                    // Cập nhật selectedMauDon cho record
                                                    const updatedRecord = {
                                                        ...templateSelectionModal.record!,
                                                        selectedMauDon: customMauDon
                                                    };
                                                    setTemplateSelectionModal({
                                                        open: false,
                                                        record: null
                                                    });

                                                    // Set the current code reference for later use
                                                    currentCodeRef.current =
                                                        templateSelectionModal.record!.maTTHC;

                                                    // Trực tiếp mở editor thay vì gọi handleSelectTemplate
                                                    setEditorState(prev => ({
                                                        ...prev,
                                                        selectedRecord: updatedRecord,
                                                        showEditorModal: true,
                                                        syncfusionLoading: true,
                                                        syncfusionDocumentReady: false
                                                    }));

                                                    // Set the current working doc reference
                                                    currentWorkingDocIdRef.current = workingDoc.id;

                                                    // Reset uploadedTemplateUrl để không bị coi như upload mới
                                                    setState(prev => ({
                                                        ...prev,
                                                        uploadedTemplateUrl: null,
                                                        uploadedTemplateName: null,
                                                        selectedTemplatePath: `working://${templateSelectionModal.record!.maTTHC}`,
                                                        generatedBlob: workingDoc.blob // nếu bạn load sẵn blob
                                                    }));

                                                    setShowQuickInsertPanel(true);

                                                    setSnackbar({
                                                        open: true,
                                                        message: `Đang tải mẫu đã thiết lập: ${workingDoc.fileName}`,
                                                        severity: 'info'
                                                    });
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'flex-start',
                                                        mb: 2
                                                    }}
                                                >
                                                    <Box sx={{ flex: 1 }}>
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 2,
                                                                mb: 1
                                                            }}
                                                        >
                                                            <Typography
                                                                variant="h6"
                                                                sx={{ fontWeight: 600 }}
                                                            >
                                                                {workingDoc.fileName}
                                                            </Typography>
                                                            <Chip
                                                                label="Bản sao tùy chỉnh"
                                                                color="success"
                                                                size="small"
                                                                sx={{
                                                                    fontWeight: 600,
                                                                    fontSize: '0.65rem'
                                                                }}
                                                            />
                                                        </Box>
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: 0.5
                                                            }}
                                                        >
                                                            <Typography
                                                                variant="body2"
                                                                color="text.secondary"
                                                            >
                                                                📄 Kích thước:{' '}
                                                                {(
                                                                    workingDoc.blob.size / 1024
                                                                ).toFixed(1)}{' '}
                                                                KB
                                                            </Typography>
                                                            <Typography
                                                                variant="body2"
                                                                color="text.secondary"
                                                            >
                                                                📅 Cập nhật:{' '}
                                                                {new Date(
                                                                    workingDoc.updatedAt
                                                                ).toLocaleString('vi-VN')}
                                                            </Typography>
                                                            <Typography
                                                                variant="caption"
                                                                color="success.main"
                                                                sx={{
                                                                    fontStyle: 'italic',
                                                                    fontWeight: 500,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 0.5
                                                                }}
                                                            >
                                                                💾 Đã lưu trong IndexedDB
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Box>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        justifyContent: 'flex-end',
                                                        gap: 1
                                                    }}
                                                >
                                                    <Button
                                                        variant="contained"
                                                        size="medium"
                                                        startIcon={<EditIcon />}
                                                        sx={{
                                                            borderRadius: 1,
                                                            textTransform: 'none',
                                                            fontWeight: 600,
                                                            background:
                                                                'linear-gradient(45deg, #4caf50, #66bb6a)',
                                                            color: 'white',
                                                            '&:hover': {
                                                                background:
                                                                    'linear-gradient(45deg, #388e3c, #4caf50)',
                                                                transform: 'translateY(-2px)'
                                                            },
                                                            transition: 'all 0.3s ease'
                                                        }}
                                                    >
                                                        Sử dụng bản tùy chỉnh
                                                    </Button>
                                                    <Button
                                                        variant="contained"
                                                        size="medium"
                                                        startIcon={<DeleteIcon />}
                                                        sx={{
                                                            borderRadius: 1,
                                                            textTransform: 'none',
                                                            fontWeight: 600,
                                                            background:
                                                                'linear-gradient(45deg, #db3e3eff, #c01919ff)',
                                                            '&:hover': {
                                                                background:
                                                                    'linear-gradient(45deg, #c01919ff, #db5454ff)',
                                                                transform: 'translateY(-2px)'
                                                            },
                                                            transition: 'all 0.3s ease'
                                                        }}
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            setConfirmDialog({
                                                                open: true,
                                                                id: workingDoc.id,
                                                                fileName: workingDoc.fileName
                                                            });
                                                        }}
                                                    >
                                                        Xóa mẫu
                                                    </Button>
                                                </Box>
                                            </Paper>
                                        ))}
                                    </Box>
                                </>
                            )}

                        {/* No templates message */}
                        {(!templateSelectionModal.record?.danhSachMauDon ||
                            templateSelectionModal.record.danhSachMauDon.length === 0) &&
                            (!templateSelectionModal.record?.maTTHC ||
                                !hasWorkingDocuments(templateSelectionModal.record.maTTHC)) && (
                                <Paper
                                    sx={{
                                        p: 4,
                                        textAlign: 'center',
                                        borderRadius: 1,
                                        background:
                                            'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                                        border: '2px dashed #dee2e6'
                                    }}
                                >
                                    <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                                        📄 Không có mẫu đơn nào
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Không tìm thấy mẫu đơn nào cho thủ tục này trong hệ thống
                                        hoặc IndexedDB.
                                    </Typography>
                                </Paper>
                            )}
                    </DialogContent>
                </Dialog>
                <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false })}>
                    <DialogTitle>Xác nhận xóa</DialogTitle>
                    <DialogContent>
                        <Typography>
                            Bạn có chắc chắn muốn xóa mẫu <b>{confirmDialog.fileName}</b>?
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setConfirmDialog({ open: false })}>Hủy</Button>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={() => {
                                if (confirmDialog.id != null) {
                                    handleDeleteWorkingDocument(
                                        confirmDialog.id,
                                        confirmDialog.fileName!
                                    );
                                }
                                setConfirmDialog({ open: false });
                            }}
                        >
                            Xóa
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Snackbar for notifications */}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={4000}
                    onClose={handleSnackbarClose}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                    <Alert
                        onClose={handleSnackbarClose}
                        severity={snackbar.severity}
                        sx={{ width: '100%' }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </>
    );
}
export default TemplateProceduresComponent;
