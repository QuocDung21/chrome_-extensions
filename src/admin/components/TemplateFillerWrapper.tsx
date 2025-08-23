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
    Download,
    Download as DownloadIcon,
    Edit as EditIcon,
    EventAvailable as EventAvailableIcon,
    Event as EventIcon,
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

import { WorkingDocument, db } from '@/admin/db/db';
import { linhVucRepository } from '@/admin/repository/LinhVucRepository';
import { LinhVuc, linhVucApiService } from '@/admin/services/linhVucService';
import { formatDDMMYYYY, getCurrentDateParts } from '@/admin/utils/formatDate';

DocumentEditorContainerComponent.Inject(Toolbar, Ribbon, Print);
// --- CẤU HÌNH ---
const SOCKET_URL = 'http://103.162.21.146:5003';
const SYNCFUSION_SERVICE_URL =
    'https://services.syncfusion.com/react/production/api/documenteditor/';
const SOCKET_RECONNECT_ATTEMPTS = 5;
const SOCKET_RECONNECT_DELAY = 3000;
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
type Props = {
    value?: LinhVuc | null; // cho phép control từ ngoài
    onChange?: (value: LinhVuc | null) => void;
};
// --- CUSTOM HOOKS ---
const useSocketConnection = (apiUrl: string) => {
    const [socketStatus, setSocketStatus] = useState<
        'connected' | 'disconnected' | 'connecting' | 'error'
    >('disconnected');
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const socketRef = useRef<Socket | null>(null);
    const connect = useCallback(() => {
        if (socketRef.current?.connected) return;
        setSocketStatus('connecting');
        socketRef.current = io(apiUrl, {
            transports: ['websocket'],
            timeout: 10000,
            reconnection: true,
            reconnectionAttempts: SOCKET_RECONNECT_ATTEMPTS,
            reconnectionDelay: SOCKET_RECONNECT_DELAY
        });
        socketRef.current.on('connect', () => {
            setSocketStatus('connected');
            setReconnectAttempts(0);
        });
        socketRef.current.on('disconnect', () => {
            setSocketStatus('disconnected');
        });
        socketRef.current.on('connect_error', error => {
            console.error('Socket connection error:', error);
            setSocketStatus('error');
            setReconnectAttempts(prev => prev + 1);
        });
        socketRef.current.on('reconnect', attemptNumber => {
            console.log(`Reconnected after ${attemptNumber} attempts`);
            setSocketStatus('connected');
            setReconnectAttempts(0);
        });
        socketRef.current.on('reconnect_failed', () => {
            setSocketStatus('error');
        });
    }, [apiUrl]);
    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        setSocketStatus('disconnected');
    }, []);
    const on = useCallback((event: string, callback: (...args: any[]) => void) => {
        if (socketRef.current) {
            socketRef.current.on(event, callback);
        }
    }, []);
    const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
        if (socketRef.current) {
            socketRef.current.off(event, callback);
        }
    }, []);
    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);
    return {
        socketStatus,
        reconnectAttempts,
        connect,
        disconnect,
        on,
        off
    };
};
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
const extractTemplateName = (fullPath: string): string => {
    if (!fullPath || !fullPath.includes('/')) return '';
    const parts = fullPath.split('/');
    return parts[parts.length - 1];
};
const checkTemplateExists = async (record: TTHCRecord, mauDon: MauDon): Promise<boolean> => {
    try {
        const url = buildDocxUrlForRecord(record, mauDon);
        const res = await fetch(url, { method: 'HEAD' });
        return res.ok;
    } catch {
        return false;
    }
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
// Hàm xử lý dữ liệu thông minh
const processDataIntelligently = (data: string): any => {
    // Simple parsing logic - can be enhanced later
    try {
        // Try JSON format first
        return JSON.parse(data);
    } catch {
        // Try pipe-separated format: CCCD|CMND|Họ tên|Ngày sinh|Giới tính|Địa chỉ|Ngày cấp
        const parts = data.split('|');
        if (parts.length >= 7) {
            const [cccd, cmnd, hoTen, ngaySinh, gioiTinh, diaChi, ngayCap] = parts;
            return { cccd, cmnd, hoTen, ngaySinh, gioiTinh, diaChi, ngayCap };
        }
        // Try comma-separated format
        const commaParts = data.split(',');
        if (commaParts.length >= 7) {
            const [cccd, cmnd, hoTen, ngaySinh, gioiTinh, diaChi, ngayCap] = commaParts;
            return { cccd, cmnd, hoTen, ngaySinh, gioiTinh, diaChi, ngayCap };
        }
        throw new Error('Định dạng dữ liệu không được hỗ trợ');
    }
};
// Chuyển đổi dữ liệu từ mobile/socket sang ProcessingData
const convertScannedInfoToProcessingData = (data: any): ProcessingData => {
    // Handle mobile socket data format
    if (data.so_cccd || data.so_cmnd || data.ho_ten) {
        console.log('📱 Detected mobile socket data format, using as-is');
        return {
            ...data,
            cccd: data.cccd || data.so_cccd || '',
            cmnd: data.cmnd || data.so_cmnd || '',
            hoTen: data.hoTen || data.ho_ten || '',
            ngaySinh: data.ngaySinh || data.ngay_sinh || '',
            gioiTinh: data.gioiTinh || data.gioi_tinh || '',
            diaChi: data.diaChi || data.noi_cu_tru || '',
            ngayCap: data.ngayCap || data.ngay_cap || '',
            so_cccd: data.so_cccd || data.cccd || '',
            so_cmnd: data.so_cmnd || data.cmnd || '',
            ho_ten: data.ho_ten || data.hoTen || '',
            ngay_sinh: data.ngay_sinh || data.ngaySinh || '',
            gioi_tinh: data.gioi_tinh || data.gioiTinh || '',
            noi_cu_tru: data.noi_cu_tru || data.diaChi || '',
            ngay_cap: data.ngay_cap || data.ngayCap || '',
            // Tách ngày/tháng/năm
            ns_ngay: data.ns_ngay || '',
            ns_thang: data.ns_thang || '',
            ns_nam: data.ns_nam || '',
            nc_ngay: data.nc_ngay || '',
            nc_thang: data.nc_thang || '',
            nc_nam: data.nc_nam || ''
        } as ProcessingData;
    }
    return data;
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

function LinhVucListComponent({ value = '', onChange }: any) {
    const [linhVucList, setLinhVucList] = useState<LinhVuc[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedLinhVuc, setSelectedLinhVuc] = useState<LinhVuc | null>(value);

    useEffect(() => {
        const loadLinhVuc = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await linhVucRepository.getLinhVucList();
                setLinhVucList(data);
            } catch (err: any) {
                setError(err.message || 'Đã có lỗi xảy ra.');
            } finally {
                setLoading(false);
            }
        };

        loadLinhVuc();
    }, []);

    // Nếu prop value thay đổi từ bên ngoài thì đồng bộ lại state
    useEffect(() => {
        setSelectedLinhVuc(value || null);
    }, [value]);

    const handleChange = (event: any, newValue: LinhVuc | null) => {
        setSelectedLinhVuc(newValue);
        onChange?.(newValue);
    };

    if (loading) return <CircularProgress />;
    if (error) return <div style={{ color: 'red' }}>Lỗi: {error}</div>;

    return (
        <Autocomplete
            size="small"
            options={linhVucList}
            value={selectedLinhVuc}
            onChange={handleChange}
            getOptionLabel={option => option.tenLinhVuc}
            isOptionEqualToValue={(option, value) => option.maLinhVuc === value.maLinhVuc}
            sx={{ minWidth: 200, maxWidth: 200 }}
            renderInput={params => (
                <TextField {...params} label="Lĩnh vực" placeholder="Chọn lĩnh vực" />
            )}
        />
    );
}

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

                                    {hasTemplates && (
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={e => {
                                                e.stopPropagation();
                                                const selected = record.danhSachMauDon[0];
                                                const docUrl = buildDocxUrlForRecord(
                                                    record,
                                                    selected
                                                );
                                                const code = record.maTTHC;
                                                // Prefer callback if provided; fallback to navigation + localStorage
                                                if (onSetupTemplate) {
                                                    onSetupTemplate({ docUrl, code });
                                                    try {
                                                        onNavigateProcedures?.();
                                                    } catch {}
                                                } else {
                                                    localStorage.setItem(
                                                        'pending_procedure_load',
                                                        JSON.stringify({ docUrl, code })
                                                    );
                                                    window.location.href =
                                                        '/src/admin/index.html#/procedures/';
                                                }
                                            }}
                                            startIcon={<EditIcon />}
                                            sx={{ ml: 1, textTransform: 'none' }}
                                        >
                                            Thiết lập mẫu
                                        </Button>
                                    )}
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
                {/* <Box sx={{ px: 1, pb: 1 }}>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between'
                    }}
                >
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1.5, pl: 0.5 }}>
                        Danh sách mẫu đơn / tờ khai
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="text"
                            color="primary"
                            size="small"
                            startIcon={<Download />}
                        >
                            Tải
                        </Button>
                        <Button
                            variant="text"
                            size="small"
                            color={hasTemplates ? 'primary' : 'success'}
                            onClick={e => {
                                e.stopPropagation();
                                onSelectTemplate(record);
                            }}
                            startIcon={<Add />}
                        >
                            Tạo trực tuyến
                        </Button>
                    </Box>
                </Box>
            </Box> */}
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

// Function to reset document to original state
const resetDocumentToOriginal = async (
    editor: DocumentEditorContainerComponent | null,
    originalSfdt: string | null
): Promise<boolean> => {
    try {
        if (!editor?.documentEditor) {
            console.error('❌ DocumentEditor is null, cannot reset');
            return false;
        }

        if (!originalSfdt) {
            console.error('❌ No original SFDT stored, cannot reset');
            return false;
        }

        console.log('🔄 Resetting document to original state...');
        editor.documentEditor.open(originalSfdt);
        console.log('✅ Document reset to original state');

        return true;
    } catch (error) {
        console.error('❌ Error resetting document:', error);
        return false;
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
function TemplateFillerComponent({
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

    const handleDownloadClick = () => {
        if (sfContainerRef.current && sfContainerRef.current.documentEditor) {
            const fileName = editorState.selectedRecord?.selectedMauDon?.tenFile || 'Document.docx';
            sfContainerRef.current.documentEditor.save(fileName, 'Docx');
        } else {
            console.error('Document editor not ready to download.');
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
    // Extract template name from path for display

    const handleDownloadOriginalTemplate = useCallback(async () => {
        if (!state.selectedTemplatePath) return;

        // Check if it's a working document from IndexedDB
        if (state.selectedTemplatePath.startsWith('working://')) {
            if (state.generatedBlob) {
                // Use the blob directly for working documents
                const baseName = (
                    state.uploadedTemplateName ||
                    selectedTemplateNameFromPath ||
                    'mau'
                )
                    .replace(/\s/g, '_')
                    .replace(/\.(docx?|DOCX?)$/, '');
                saveAs(state.generatedBlob, `${baseName}.docx`);
                setSnackbar({
                    open: true,
                    message: 'Đã tải xuống tài liệu đã lưu',
                    severity: 'success'
                });
            } else {
                setSnackbar({
                    open: true,
                    message: 'Không thể tải xuống tài liệu đã lưu',
                    severity: 'error'
                });
            }
            return;
        }

        try {
            const res = await fetch(state.selectedTemplatePath);
            if (!res.ok) throw new Error('Không thể tải file mẫu');
            const blob = await res.blob();
            const baseName = decodeFileName(
                state.uploadedTemplateName || selectedTemplateNameFromPath || 'mau'
            )
                .replace(/\s/g, '_')
                .replace(/\.(docx?|DOCX?)$/, '');
            saveAs(blob, `${baseName}.docx`);
        } catch (e) {
            setSnackbar({ open: true, message: 'Không thể tải mẫu gốc', severity: 'error' });
        }
    }, [
        state.selectedTemplatePath,
        state.uploadedTemplateName,
        selectedTemplateNameFromPath,
        state.generatedBlob
    ]);

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

            setSnackbar({
                open: true,
                message: shouldUpdateExisting
                    ? 'Đã cập nhật tài liệu đang làm việc'
                    : 'Đã lưu tài liệu mới',
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

    const handleLoadWorkingFromDb = useCallback(
        async (maTTHC: string, record: LocalEnhancedTTHCRecord, docId?: number) => {
            try {
                // First try to get from local state, then from IndexedDB
                let doc: WorkingDocument | undefined;
                if (docId != null) {
                    const found = await db.workingDocumentsV2.get(docId);
                    doc = found || undefined;
                } else {
                    doc = workingDocsByCode[maTTHC];
                    if (!doc) {
                        const list = await db.workingDocumentsV2
                            .where('maTTHC')
                            .equals(maTTHC)
                            .sortBy('updatedAt');
                        doc = list[list.length - 1];
                    }
                }

                if (!doc) {
                    setSnackbar({
                        open: true,
                        message: 'Không tìm thấy tài liệu đã lưu cho thủ tục này',
                        severity: 'warning'
                    });
                    return;
                }

                // Set the selected record for context
                setSelectedRecord(record);

                // Ghi nhớ mã thủ tục để sử dụng cho các thao tác lưu tiếp theo
                currentCodeRef.current = maTTHC || '';
                currentWorkingDocIdRef.current = doc.id ?? null;

                // Create object URL for the blob
                const objectUrl = URL.createObjectURL(doc.blob);

                if (doc.mimeType === 'text/html') {
                    // For HTML files, set as HTML URL but keep syncfusion mode
                    setState(prev => ({
                        ...prev,
                        selectedTemplatePath: `working://${maTTHC}`,
                        selectedHtmlUrl: objectUrl,
                        generatedBlob: null,
                        error: null
                    }));

                    // Keep syncfusion mode for consistency
                } else {
                    // For DOCX and other binary files
                    setState(prev => ({
                        ...prev,
                        selectedTemplatePath: `working://${maTTHC}`,
                        selectedHtmlUrl: null,
                        generatedBlob: doc.blob,
                        error: null
                    }));

                    // Load directly into Syncfusion editor
                    if (sfContainerRef.current?.documentEditor) {
                        sfContainerRef.current.documentEditor.open(doc.blob);
                    }
                }

                // Reset processing state and close modals
                resetProcessing();
                setShowFilters(false);
                setShowTemplateModal(false);

                setSnackbar({
                    open: true,
                    message: `Đã mở tài liệu đã lưu: ${doc.fileName}`,
                    severity: 'success'
                });

                console.log(
                    `✅ Loaded working document from IndexedDB: ${doc.fileName} for maTTHC: ${maTTHC}`
                );
            } catch (error) {
                console.error('Lỗi khi mở tài liệu đã lưu từ IndexedDB:', error);
                setSnackbar({
                    open: true,
                    message: 'Lỗi khi mở tài liệu đã lưu',
                    severity: 'error'
                });
            }
        },
        [workingDocsByCode, previewMode, resetProcessing]
    );

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
    // Socket connection
    const { socketStatus, on, off } = useSocketConnection(SOCKET_URL);
    // Memoized values
    const availableThuTuc = useMemo(() => {
        if (!filters.linhVuc || !filterOptions.thuTucByLinhVuc[filters.linhVuc]) {
            return [];
        }
        return filterOptions.thuTucByLinhVuc[filters.linhVuc];
    }, [filters.linhVuc, filterOptions.thuTucByLinhVuc]);
    // Memoized available templates for performance
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

            // Check if template is from IndexedDB
            if (record.selectedMauDon.isFromIndexedDB && record.selectedMauDon.workingDocument) {
                console.log('📦 Loading template from IndexedDB:', record.selectedMauDon.tenFile);
                blob = record.selectedMauDon.workingDocument.blob;
            } else {
                // Load from CSV template URL
                const templateUrl = buildDocxUrlForRecord(record, record.selectedMauDon);
                console.log('📁 Template URL:', templateUrl);
                const res = await fetch(templateUrl);
                if (!res.ok) {
                    console.error('❌ Failed to fetch template:', res.status, res.statusText);
                    throw new Error(`Không thể tải file mẫu: ${res.status} ${res.statusText}`);
                }
                blob = await res.blob();
            }

            console.log('📦 Template blob size:', blob.size, 'bytes');
            const form = new FormData();
            form.append('files', blob, record.selectedMauDon.tenFile);
            console.log('🔄 Converting DOCX to SFDT...');
            console.log('🌐 Syncfusion service URL:', SYNCFUSION_SERVICE_URL + 'Import');
            const importRes = await fetch(`${SYNCFUSION_SERVICE_URL}Import`, {
                method: 'POST',
                body: form
            });
            if (!importRes.ok) {
                console.error(
                    '❌ Syncfusion import failed:',
                    importRes.status,
                    importRes.statusText
                );
                throw new Error(`Lỗi khi import file: ${importRes.status} ${importRes.statusText}`);
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
    // Effects
    useEffect(() => {
        setEditorState(prev => ({ ...prev, socketStatus }));
    }, [socketStatus]);
    // Load JSON data on component mount
    useEffect(() => {
        const loadData = async () => {
            setCsvLoading(true);
            try {
                const jsonResponse = await fetch('/DanhSachTTHC.json');
                if (!jsonResponse.ok) {
                    throw new Error('Không thể tải dữ liệu JSON');
                }
                const jsonContent = await jsonResponse.json();
                const rawRecords = parseJSONData(jsonContent);
                const enhancedRecords = await enhanceRecordsWithAvailability(rawRecords);
                setCsvRecords(enhancedRecords);
                setFilterOptions(createFilterOptions(rawRecords));
                setFilteredRecords(enhancedRecords);
                const availableCount = enhancedRecords.filter(
                    r => r.danhSachMauDon && r.danhSachMauDon.length > 0
                ).length;
                const totalCount = enhancedRecords.length;
                setSnackbar({
                    open: true,
                    message: `Đã tải ${totalCount} thủ tục hành chính, ${availableCount} có mẫu đơn sẵn sàng`,
                    severity: 'success'
                });
            } catch (error) {
                console.error('Error loading data:', error);
                setSnackbar({
                    open: true,
                    message: 'Không thể tải dữ liệu mẫu đơn',
                    severity: 'error'
                });
            } finally {
                setCsvLoading(false);
            }
        };
        loadData();
    }, []);

    // Load lĩnh vực data from repository
    useEffect(() => {
        const loadLinhVuc = async () => {
            setLinhVucLoading(true);
            try {
                const data = await linhVucRepository.getLinhVucList();
                setLinhVucList(data);
                console.log('✅ Loaded lĩnh vực from repository:', data.length, 'items');

                // Log mapping between repository and CSV data for debugging
                const csvLinhVuc = filterOptions.linhVuc;
                console.log('📊 CSV lĩnh vực count:', csvLinhVuc.length);
                console.log('📊 Repository lĩnh vực count:', data.length);

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
    }, [filterOptions.linhVuc]);

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
        setState(prev => ({ ...prev, socketStatus }));
    }, [socketStatus]);
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
                // Since we only use syncfusion mode, this section is not needed
                // All document viewing is handled by Syncfusion editor

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
                        setSyncfusionDocumentReady(false);

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
        // Cần thêm state.generatedBlob vào dependency array vì chúng ta sử dụng nó để kiểm tra
        // xem có phải là working document từ IndexedDB không
    }, [
        state.selectedTemplatePath,
        state.uploadedTemplateUrl,
        previewMode,
        state.selectedHtmlUrl,
        state.generatedBlob
    ]);
    // Socket event handlers for mobile data
    // useEffect(() => {
    //     const handleDataReceived = async (data: ProcessingData) => {
    //         if (!editorState.selectedRecord || !editorState.syncfusionDocumentReady) {
    //             setSnackbar({
    //                 open: true,
    //                 message: 'Vui lòng chọn và mở mẫu đơn trước khi nhận dữ liệu.',
    //                 severity: 'warning'
    //             });
    //             return;
    //         }
    //         if (data) {
    //             try {
    //                 console.log('🔌 Received data from mobile app via socket:', data);
    //                 console.log('🎯 Current selected target:', targetState.selectedTarget);
    //                 const processingData = convertScannedInfoToProcessingData(data);
    //                 console.log('🔄 Converted mobile data to ProcessingData:', processingData);
    //                 const success = await applyDataToSyncfusion(
    //                     sfContainerRef.current,
    //                     processingData,
    //                     targetState.selectedTarget
    //                 );

    //                 // Update extracted data in scan state
    //                 setScanState(prev => ({
    //                     ...prev,
    //                     extractedData: processingData
    //                 }));

    //                 if (success) {
    //                     // Remove target from available list if it was used
    //                     const usedTarget = targetState.selectedTarget;
    //                     if (usedTarget) {
    //                         setTargetState(prev => ({
    //                             ...prev,
    //                             availableTargets: prev.availableTargets.filter(
    //                                 t => t !== usedTarget
    //                             ),
    //                             usedTargets: [...prev.usedTargets, usedTarget],
    //                             selectedTarget: ''
    //                         }));

    //                         setSnackbar({
    //                             open: true,
    //                             message: `Đã chèn dữ liệu cho đối tượng _${usedTarget} từ NTS DocumentAI`,
    //                             severity: 'success'
    //                         });
    //                     } else {
    //                         setSnackbar({
    //                             open: true,
    //                             message: 'Đã chèn dữ liệu (mặc định) từ NTS DocumentAI',
    //                             severity: 'success'
    //                         });
    //                     }
    //                 } else {
    //                     setSnackbar({
    //                         open: true,
    //                         message: 'Lỗi khi chèn dữ từ NTS DocumentAI',
    //                         severity: 'error'
    //                     });
    //                 }
    //             } catch (error) {
    //                 const errorMessage =
    //                     error instanceof Error ? error.message : 'Lỗi không xác định.';
    //                 setSnackbar({
    //                     open: true,
    //                     message: `Lỗi xử lý dữ liệu`,
    //                     severity: 'error'
    //                 });
    //                 console.error('❌ Error processing socket data:', error);
    //             }
    //         }
    //     };
    //     on('data_received', handleDataReceived);
    //     return () => {
    //         off('data_received', handleDataReceived);
    //     };
    // }, [
    //     on,
    //     off,
    //     editorState.selectedRecord,
    //     editorState.syncfusionDocumentReady,
    //     targetState.selectedTarget
    // ]);
    const handleSnackbarClose = useCallback(() => {
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);
    // Scan & Fill Panel Handlers
    const handleInputModeChange = useCallback((mode: 'ntsoft' | 'scanner') => {
        setScanState(prev => ({ ...prev, inputMode: mode }));
        console.log('Input mode', mode);
    }, []);
    const handleInputTextChange = useCallback((text: string) => {
        setScanState(prev => ({ ...prev, inputText: text }));
    }, []);
    const handleOpenDocumentAI = useCallback(() => {
        // Logic để mở Document AI app
        setSnackbar({
            open: true,
            message: 'Đang mở NTSoft Document AI...',
            severity: 'info'
        });
    }, []);
    // const handleAnalyzeAndFill = useCallback(async () => {
    //     if (!scanState.inputText.trim()) {
    //         setSnackbar({
    //             open: true,
    //             message: 'Vui lòng nhập dữ liệu cần phân tích',
    //             severity: 'warning'
    //         });
    //         return;
    //     }
    //     if (!editorState.selectedRecord || !editorState.syncfusionDocumentReady) {
    //         setSnackbar({
    //             open: true,
    //             message: 'Vui lòng mở mẫu đơn trước khi điền dữ liệu',
    //             severity: 'warning'
    //         });
    //         return;
    //     }
    //     setScanState(prev => ({ ...prev, isProcessing: true }));
    //     try {
    //         const scannedInfo = processDataIntelligently(scanState.inputText);
    //         const processingData = convertScannedInfoToProcessingData({
    //             ...scannedInfo,
    //             ngaySinh: formatDDMMYYYY(scannedInfo.ngaySinh),
    //             ngayCap: formatDDMMYYYY(scannedInfo.ngayCap)
    //         });
    //         setScanState(prev => ({
    //             ...prev,
    //             extractedData: processingData,
    //             isProcessing: false
    //         }));
    //         // Apply data to Syncfusion editor
    //         const success = await applyDataToSyncfusion(
    //             sfContainerRef.current,
    //             processingData,
    //             targetState.selectedTarget
    //         );
    //         if (success) {
    //             // Remove target from available list if it was used
    //             const usedTarget = targetState.selectedTarget;
    //             if (usedTarget) {
    //                 setTargetState(prev => ({
    //                     ...prev,
    //                     availableTargets: prev.availableTargets.filter(t => t !== usedTarget),
    //                     usedTargets: [...prev.usedTargets, usedTarget],
    //                     selectedTarget: ''
    //                 }));

    //                 setSnackbar({
    //                     open: true,
    //                     message: `Đã phân tích và điền dữ liệu cho đối tượng _${usedTarget} thành công!`,
    //                     severity: 'success'
    //                 });
    //             } else {
    //                 setSnackbar({
    //                     open: true,
    //                     message: 'Đã phân tích và điền dữ liệu (mặc định) thành công!',
    //                     severity: 'success'
    //                 });
    //             }
    //         } else {
    //             setSnackbar({
    //                 open: true,
    //                 message: 'Lỗi khi điền dữ liệu vào document',
    //                 severity: 'error'
    //             });
    //         }
    //     } catch (error) {
    //         const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
    //         setScanState(prev => ({ ...prev, isProcessing: false }));
    //         setSnackbar({
    //             open: true,
    //             message: `Lỗi phân tích dữ liệu: ${errorMessage}`,
    //             severity: 'error'
    //         });
    //     }
    // }, [scanState.inputText, editorState.selectedRecord, editorState.syncfusionDocumentReady]);
    // console.log('🎨 TemplateFillerComponent render:', {
    //     csvRecordsCount: csvRecords.length,
    //     filteredRecordsCount: filteredRecords.length,
    //     showEditorModal: editorState.showEditorModal,
    //     selectedRecord: editorState.selectedRecord?.tenTTHC,
    //     syncfusionLoading: editorState.syncfusionLoading,
    //     syncfusionReady: editorState.syncfusionDocumentReady
    // });
    // const handleKeyDown = async (e: React.KeyboardEvent) => {
    //     if (e.key === 'Enter') {
    //         e.preventDefault();
    //         await handleAnalyzeAndFill();
    //     }
    // };

    const customToolbarItems = ['Print'];

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
                {/* <Card
                    sx={{
                        mb: 4,
                        borderRadius: 1,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        backdropFilter: 'blur(10px)',
                        background: 'rgba(255,255,255,0.9)',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}
                >
                    <CardHeader
                        title="🔍 Tìm kiếm nhanh"
                        sx={{
                            pb: 1,
                            '& .MuiCardHeader-title': {
                                fontSize: '1.1rem',
                                fontWeight: 600
                            }
                        }}
                    />
                    <CardContent sx={{ pt: 0 }}>
                        <TextField
                            fullWidth
                            size="medium"
                            value={filters.searchText}
                            onChange={e => handleFilterChange('searchText', e.target.value)}
                            placeholder="🔍 Tìm kiếm thủ tục, mã, lĩnh vực, đối tượng, quyết định công bố..."
                            variant="outlined"
                            sx={{
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
                    </CardContent>
                </Card> */}

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
                    {/* <FormControl size="small" sx={{ minWidth: 120, maxWidth: 120 }}>
                        <InputLabel>Lĩnh vực</InputLabel>
                        <Select
                            value={filters.linhVuc}
                            onChange={e => handleFilterChange('linhVuc', e.target.value)}
                        >
                            <MenuItem value="">
                                <em>Tất cả</em>
                            </MenuItem>
                            {filterOptions.linhVuc.map(item => (
                                <MenuItem key={item} value={item}>
                                    {item}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl> */}
                    {/* <FormControl size="small" sx={{ minWidth: 120, maxWidth: 120 }}>
                        <InputLabel>Đối tượng</InputLabel>
                        <Select
                            value={filters.doiTuong}
                            onChange={e => handleFilterChange('doiTuong', e.target.value)}
                        >
                            <MenuItem value="">
                                <em>Tất cả</em>
                            </MenuItem>
                            {filterOptions.doiTuong.map(item => (
                                <MenuItem key={item} value={item}>
                                    {item}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl> */}
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

                    {/* <FormControl size="small" sx={{ minWidth: 120, maxWidth: 120 }}>
                        <InputLabel>Cấp thực hiện</InputLabel>
                        <Select
                            value={filters.capThucHien}
                            onChange={e => handleFilterChange('capThucHien', e.target.value)}
                        >
                            <MenuItem value="">
                                <em>Tất cả</em>
                            </MenuItem>
                            {filterOptions.capThucHien.map(item => (
                                <MenuItem key={item} value={item}>
                                    {item}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl> */}
                    {/* <LinhVucListComponent /> */}
                    {/* <FormControl size="small" sx={{ minWidth: 120, maxWidth: 120 }}>
                        <InputLabel>Trạng thái mẫu</InputLabel>
                        <Select
                            value={filters.availability}
                            onChange={e => handleFilterChange('availability', e.target.value)}
                        >
                            <MenuItem value="all">Tất cả</MenuItem>
                            <MenuItem value="available">Có sẵn mẫu</MenuItem>
                            <MenuItem value="unavailable">Chưa có mẫu</MenuItem>
                        </Select>
                    </FormControl> */}
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
                        title="Danh sách mẫu đơn"
                        sx={{
                            pb: 1,
                            '& .MuiCardHeader-title': {
                                fontSize: '1.1rem',
                                fontWeight: 600
                            }
                        }}
                        // action={
                        //     <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        //         <Button
                        //             variant="outlined"
                        //             size="small"
                        //             onClick={refreshWorkingDocuments}
                        //             disabled={workingDocsState.isLoading}
                        //             startIcon={<RestartAltIcon />}
                        //             sx={{
                        //                 borderRadius: 1,
                        //                 textTransform: 'none',
                        //                 fontWeight: 600,
                        //                 borderColor: 'success.main',
                        //                 color: 'success.main',
                        //                 '&:hover': {
                        //                     borderColor: 'success.dark',
                        //                     backgroundColor: 'success.light',
                        //                     color: 'success.dark'
                        //                 }
                        //             }}
                        //         >
                        //             {workingDocsState.isLoading ? 'Đang tải...' : '🔄 Làm mới IndexedDB'}
                        //         </Button>
                        //         <Chip
                        //             icon={<CheckCircleIcon />}
                        //             label={`${availableTemplates.length} có sẵn`}
                        //             color="success"
                        //             size="small"
                        //             variant="filled"
                        //             sx={{
                        //                 fontWeight: 600,
                        //                 '& .MuiChip-icon': {
                        //                     color: 'inherit'
                        //                 }
                        //             }}
                        //         />
                        //         <Chip
                        //             label={`${filteredRecords.length} tổng cộng`}
                        //             color="primary"
                        //             size="small"
                        //             variant="outlined"
                        //             sx={{ fontWeight: 500 }}
                        //         />
                        //         {/* IndexedDB working documents count */}
                        //         {Object.keys(workingDocsState.workingDocsListByCode).length > 0 && (
                        //             <Chip
                        //                 icon={<Star />}
                        //                 label={`${Object.keys(workingDocsState.workingDocsListByCode).length} từ IndexedDB`}
                        //                 color="success"
                        //                 size="small"
                        //                 variant="outlined"
                        //                 sx={{
                        //                     fontWeight: 500,
                        //                     borderColor: 'success.main',
                        //                     color: 'success.main'
                        //                 }}
                        //             />
                        //         )}
                        //     </Box>
                        // }
                    />
                    <CardContent>
                        {csvLoading ? (
                            <Box sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                    <CircularProgress size={24} />
                                    <Typography
                                        variant="body1"
                                        color="primary"
                                        sx={{ fontWeight: 500 }}
                                    >
                                        Đang tải danh sách mẫu đơn...
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
                                    overflowY: 'auto',
                                    pr: 1,
                                    pt: 1,
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
                                {availableTemplates.map((record, index) => (
                                    <TemplateCard
                                        key={`${record.maTTHC}-${index}`}
                                        record={record}
                                        index={index}
                                        onSelect={handleSelectTemplate}
                                        onSelectTemplate={handleSelectTemplate}
                                        onSetupTemplate={onSetupTemplate}
                                        onNavigateProcedures={() => {
                                            try {
                                                navigate({ to: '/procedures' });
                                            } catch {
                                                try {
                                                    window.location.href =
                                                        '/src/admin/index.html#/procedures/';
                                                } catch {}
                                            }
                                        }}
                                        hasWorkingDocuments={hasWorkingDocuments(record.maTTHC)}
                                        workingDocumentsCount={
                                            getWorkingDocumentsForMaTTHC(record.maTTHC).length
                                        }
                                    />
                                ))}
                                {availableTemplates.length === 0 && (
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
                                            Thử thay đổi bộ lọc để tìm kiếm mẫu đơn phù hợp với nhu
                                            cầu của bạn
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
                                                        Hướng dẫn chèn {`{field}`}
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
                                                        {showQuickInsertPanel ? 'Ẩn' : 'Hiện'} Panel
                                                        Field
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
                                                        TẢI MẪU ĐÃ TÙY CHỈNH
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
                                                        Lưu mẫu đã tùy chỉnh
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
                                                        style={{ display: 'block' }}
                                                        toolbarMode={'Toolbar'}
                                                        locale="vi-VN"
                                                    />

                                                    {/* Quick Insert Field Panel */}
                                                    {syncfusionDocumentReady &&
                                                        showQuickInsertPanel && (
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
                                                        )}
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

                        {/* CSV Templates Section */}
                        {templateSelectionModal.record?.danhSachMauDon &&
                            templateSelectionModal.record.danhSachMauDon.length > 0 && (
                                <>
                                    <Typography
                                        variant="h6"
                                        sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}
                                    >
                                        Mẫu đơn hệ thống
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
                                        sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}
                                    >
                                        Mẫu đơn được thiết lập
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
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography
                                                            variant="h6"
                                                            sx={{ fontWeight: 600, mb: 1 }}
                                                        >
                                                            {workingDoc.fileName}
                                                        </Typography>
                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                        >
                                                            Mẫu đơn tùy chỉnh
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            color="primary"
                                                            sx={{ fontStyle: 'italic' }}
                                                        >
                                                            {workingDoc.fileName}
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
export default TemplateFillerComponent;
