import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// --- THƯ VIỆN ---
import { Socket, io } from 'socket.io-client';

// --- ICON ---
import {
    AddCircleOutline as AddCircleOutlineIcon,
    Badge as BadgeIcon,
    CalendarToday as CalendarTodayIcon,
    CheckCircle as CheckCircleIcon,
    Close as CloseIcon,
    Edit as EditIcon,
    EventAvailable as EventAvailableIcon,
    Event as EventIcon,
    Home as HomeIcon,
    Info as InfoIcon,
    Person as PersonIcon,
    Print as PrintIcon,
    Wc as WcIcon,
    Wifi as WifiIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Typography
} from '@mui/material';
import { Grid } from '@mui/system';
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

DocumentEditorContainerComponent.Inject(Toolbar, Ribbon);

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

interface EnhancedTTHCRecord extends TTHCRecord {
    isTemplateAvailable: boolean;
}

interface FilterOptions {
    linhVuc: string[];
    thuTucByLinhVuc: { [linhVuc: string]: string[] };
}

interface FilterState {
    linhVuc: string;
    thuTuc: string;
    availability: 'all' | 'available' | 'unavailable';
}

interface TemplateEditorState {
    selectedRecord: EnhancedTTHCRecord | null;
    showEditorModal: boolean;
    syncfusionLoading: boolean;
    syncfusionDocumentReady: boolean;
    socketStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
}

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
                stt: item['STT'] !== undefined && item['STT'] !== null ? String(item['STT']) : '',
                maTTHC: item['Mã TTHC'] ?? '',
                tenTTHC: item['Tên TTHC'] ?? '',
                qdCongBo: item['QĐ Công bố'] ?? '',
                doiTuong: item['Đối tượng'] ?? '',
                linhVuc: item['Lĩnh vực'] ?? '',
                coQuanCongKhai: item['Cơ quan công khai'] ?? '',
                capThucHien: item['Cấp thực hiện'] ?? '',
                tinhTrang: item['Tình trạng'] ?? '',
                tenGiayTo: item['Tên giấy tờ'] ?? '',
                mauDon: item['Mẫu đơn, tờ khai'] ?? '',
                tenFile: item['Tên File'] ?? ''
            } as TTHCRecord;

            // Normalize all fields to string
            (Object.keys(record) as Array<keyof TTHCRecord>).forEach(key => {
                (record as any)[key] = record[key] ? String(record[key]) : '';
            });

            return record;
        })
        .filter(
            r =>
                (r.tenFile && r.tenFile.toLowerCase().includes('.doc')) ||
                (r.mauDon && r.mauDon.toLowerCase().includes('.doc'))
        );

    return records;
};

const createFilterOptions = (records: TTHCRecord[]): FilterOptions => {
    const linhVucSet = new Set<string>();
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
    });

    Object.keys(thuTucByLinhVuc).forEach(linhVuc => {
        thuTucByLinhVuc[linhVuc].sort();
    });

    return {
        linhVuc: Array.from(linhVucSet).sort(),
        thuTucByLinhVuc
    };
};

const sanitizeCodeForPath = (code: string): string => (code || '').replace(/[\\/]/g, '_').trim();

const buildDocxUrlForRecord = (record: TTHCRecord): string => {
    const code = sanitizeCodeForPath(record.maTTHC);
    const templateName = record.tenFile || extractTemplateName(record.mauDon);
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

const checkTemplateExists = async (record: TTHCRecord): Promise<boolean> => {
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
): Promise<EnhancedTTHCRecord[]> => {
    const checks = await Promise.all(records.map(r => checkTemplateExists(r)));
    return records.map((record, idx) => ({ ...record, isTemplateAvailable: checks[idx] }));
};

const filterRecords = (
    records: EnhancedTTHCRecord[],
    filters: FilterState
): EnhancedTTHCRecord[] => {
    return records.filter(record => {
        if (filters.linhVuc && !record.linhVuc.includes(filters.linhVuc)) {
            return false;
        }

        if (filters.thuTuc && !record.tenTTHC.includes(filters.thuTuc)) {
            return false;
        }

        if (filters.availability === 'available' && !record.isTemplateAvailable) {
            return false;
        }
        if (filters.availability === 'unavailable' && record.isTemplateAvailable) {
            return false;
        }

        return true;
    });
};

// Chuyển đổi dữ liệu từ mobile/socket sang ProcessingData
const convertScannedInfoToProcessingData = (data: any): ProcessingData => {
    // Handle mobile socket data format
    if (data.so_cccd || data.so_cmnd || data.ho_ten) {
        console.log('📱 Detected mobile socket format, using as-is');
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

// Apply data to Syncfusion editor
const applyDataToSyncfusion = async (
    editor: DocumentEditorContainerComponent | null,
    data: ProcessingData
): Promise<boolean> => {
    try {
        console.log('🔄 Starting Syncfusion data insertion...', data);

        if (!editor?.documentEditor) {
            console.error('❌ DocumentEditor is null');
            return false;
        }

        const currentSfdt = editor.documentEditor.serialize();
        if (!currentSfdt) {
            console.error('❌ Failed to serialize document');
            return false;
        }

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
            '{ns_ngay}': data.ns_ngay || '',
            '{ns_thang}': data.ns_thang || '',
            '{ns_nam}': data.ns_nam || '',
            '{nc_ngay}': data.nc_ngay || '',
            '{nc_thang}': data.nc_thang || '',
            '{nc_nam}': data.nc_nam || ''
        };

        console.log('📝 Replace map:', replaceMap);

        let totalReplacements = 0;
        let modifiedSfdt = currentSfdt;

        for (const [placeholder, value] of Object.entries(replaceMap)) {
            if (value) {
                const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                const beforeLength = modifiedSfdt.length;
                modifiedSfdt = modifiedSfdt.replace(regex, value);
                const afterLength = modifiedSfdt.length;

                if (beforeLength !== afterLength) {
                    totalReplacements++;
                    console.log(`✅ Replaced "${placeholder}" with "${value}" in SFDT`);
                }
            }
        }

        if (totalReplacements > 0) {
            console.log('🔄 Loading modified document...');
            editor.documentEditor.open(modifiedSfdt);
            console.log('✅ Document reloaded with replacements');
        }

        console.log(`🎯 Total replacements made: ${totalReplacements}`);
        return true;
    } catch (error: any) {
        console.error('❌ Error in applyDataToSyncfusion:', error);
        return false;
    }
};

// --- COMPONENT CHÍNH ---
function TemplateFillerComponent() {
    // State cho danh sách mẫu
    const [csvRecords, setCsvRecords] = useState<EnhancedTTHCRecord[]>([]);
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        linhVuc: [],
        thuTucByLinhVuc: {}
    });
    const [filters, setFilters] = useState<FilterState>({
        linhVuc: '',
        thuTuc: '',
        availability: 'all'
    });
    const [filteredRecords, setFilteredRecords] = useState<EnhancedTTHCRecord[]>([]);
    const [csvLoading, setCsvLoading] = useState(false);

    // State cho template editor
    const [editorState, setEditorState] = useState<TemplateEditorState>({
        selectedRecord: null,
        showEditorModal: false,
        syncfusionLoading: false,
        syncfusionDocumentReady: false,
        socketStatus: 'disconnected'
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

    const sfContainerRef = useRef<DocumentEditorContainerComponent | null>(null);

    // Socket connection
    const { socketStatus, on, off } = useSocketConnection(SOCKET_URL);

    // Memoized values
    const availableThuTuc = useMemo(() => {
        if (!filters.linhVuc || !filterOptions.thuTucByLinhVuc[filters.linhVuc]) {
            return [];
        }
        return filterOptions.thuTucByLinhVuc[filters.linhVuc];
    }, [filters.linhVuc, filterOptions.thuTucByLinhVuc]);

    // Event handlers
    const handleFilterChange = useCallback((filterType: keyof FilterState, value: string) => {
        setFilters(prev => {
            const newFilters = {
                ...prev,
                [filterType]: value
            };

            if (filterType === 'linhVuc') {
                newFilters.thuTuc = '';
            }

            return newFilters;
        });
    }, []);

    const handleClearFilters = useCallback(() => {
        setFilters({
            linhVuc: '',
            thuTuc: '',
            availability: 'all'
        });
    }, []);

    const handleSelectTemplate = useCallback(async (record: EnhancedTTHCRecord) => {
        console.log('🎯 Template selected:', record);

        if (!record.isTemplateAvailable) {
            setSnackbar({
                open: true,
                message: `Mẫu đơn "${record.tenFile || extractTemplateName(record.mauDon)}" chưa có sẵn trong hệ thống`,
                severity: 'warning'
            });
            return;
        }

        // Test template URL immediately
        const templateUrl = buildDocxUrlForRecord(record);
        console.log('🔍 Testing template URL:', templateUrl);

        try {
            const testRes = await fetch(templateUrl, { method: 'HEAD' });
            if (!testRes.ok) {
                throw new Error(`Template not accessible: ${testRes.status} ${testRes.statusText}`);
            }
            console.log('✅ Template URL is accessible');
        } catch (error) {
            console.error('❌ Template URL test failed:', error);
            setSnackbar({
                open: true,
                message: `Không thể truy cập file mẫu: ${error}`,
                severity: 'error'
            });
            return;
        }

        setEditorState(prev => ({
            ...prev,
            selectedRecord: record,
            showEditorModal: true,
            syncfusionLoading: true,
            syncfusionDocumentReady: false
        }));

        setSnackbar({
            open: true,
            message: `Đang mở modal và tải mẫu: ${record.tenTTHC}`,
            severity: 'info'
        });
    }, []);

    const handleCloseEditor = useCallback(() => {
        setEditorState(prev => ({
            ...prev,
            showEditorModal: false,
            selectedRecord: null,
            syncfusionLoading: false,
            syncfusionDocumentReady: false
        }));
    }, []);

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
            const templateUrl = buildDocxUrlForRecord(record);
            console.log('📁 Template URL:', templateUrl);

            const res = await fetch(templateUrl);
            if (!res.ok) {
                console.error('❌ Failed to fetch template:', res.status, res.statusText);
                throw new Error(`Không thể tải file mẫu: ${res.status} ${res.statusText}`);
            }

            const blob = await res.blob();
            console.log('📦 Template blob size:', blob.size, 'bytes');

            const form = new FormData();
            form.append('files', blob, record.tenFile || 'template.docx');

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
                        setEditorState(prev => ({
                            ...prev,
                            syncfusionDocumentReady: true,
                            syncfusionLoading: false
                        }));
                        console.log('✅ Syncfusion document ready for data insertion');

                        setSnackbar({
                            open: true,
                            message: `Đã tải thành công: ${record.tenTTHC}`,
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

                const availableCount = enhancedRecords.filter(r => r.isTemplateAvailable).length;
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

    // Filter records when filters change
    useEffect(() => {
        const filtered = filterRecords(csvRecords, filters);
        setFilteredRecords(filtered);
    }, [csvRecords, filters]);

    // Load template when editor modal opens
    useEffect(() => {
        console.log('📋 Modal state changed:', {
            showEditorModal: editorState.showEditorModal,
            selectedRecord: editorState.selectedRecord?.tenTTHC || 'none',
            syncfusionLoading: editorState.syncfusionLoading
        });

        if (editorState.showEditorModal && editorState.selectedRecord) {
            console.log('🚀 Triggering template load for:', editorState.selectedRecord.tenTTHC);
            loadTemplateIntoSyncfusion(editorState.selectedRecord);
        }
    }, [editorState.showEditorModal, editorState.selectedRecord, loadTemplateIntoSyncfusion]);

    // Socket event handlers for mobile data
    useEffect(() => {
        const handleDataReceived = async (data: ProcessingData) => {
            if (!editorState.selectedRecord || !editorState.syncfusionDocumentReady) {
                setSnackbar({
                    open: true,
                    message: 'Vui lòng chọn và mở mẫu đơn trước khi nhận dữ liệu.',
                    severity: 'warning'
                });
                return;
            }

            if (data) {
                try {
                    console.log('🔌 Received data from mobile app via socket:', data);
                    const processingData = convertScannedInfoToProcessingData(data);
                    console.log('🔄 Converted mobile data to ProcessingData:', processingData);

                    const success = await applyDataToSyncfusion(
                        sfContainerRef.current,
                        processingData
                    );

                    if (success) {
                        setSnackbar({
                            open: true,
                            message: 'Đã chèn dữ liệu từ Mobile App vào Syncfusion Editor!',
                            severity: 'success'
                        });
                    } else {
                        setSnackbar({
                            open: true,
                            message: 'Lỗi khi chèn dữ liệu vào Syncfusion Editor',
                            severity: 'error'
                        });
                    }
                } catch (error) {
                    const errorMessage =
                        error instanceof Error ? error.message : 'Lỗi không xác định.';
                    setSnackbar({
                        open: true,
                        message: `Lỗi xử lý dữ liệu từ Mobile App: ${errorMessage}`,
                        severity: 'error'
                    });
                    console.error('❌ Error processing socket data:', error);
                }
            }
        };

        on('data_received', handleDataReceived);

        return () => {
            off('data_received', handleDataReceived);
        };
    }, [on, off, editorState.selectedRecord, editorState.syncfusionDocumentReady]);

    const handleSnackbarClose = useCallback(() => {
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);

    console.log('🎨 TemplateFillerComponent render:', {
        csvRecordsCount: csvRecords.length,
        filteredRecordsCount: filteredRecords.length,
        showEditorModal: editorState.showEditorModal,
        selectedRecord: editorState.selectedRecord?.tenTTHC,
        syncfusionLoading: editorState.syncfusionLoading,
        syncfusionReady: editorState.syncfusionDocumentReady
    });

    return (
        <Box sx={{ width: '100%', p: 3 }}>
            {/* Filter Controls */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                            gap: 2,
                            mb: 2
                        }}
                    >
                        <FormControl fullWidth size="small">
                            <InputLabel>Lĩnh vực</InputLabel>
                            <Select
                                value={filters.linhVuc}
                                label="Lĩnh vực"
                                onChange={e => handleFilterChange('linhVuc', e.target.value)}
                            >
                                <MenuItem value="">Tất cả</MenuItem>
                                {filterOptions.linhVuc.map(item => (
                                    <MenuItem key={item} value={item}>
                                        {item}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small">
                            <InputLabel>Thủ tục</InputLabel>
                            <Select
                                value={filters.thuTuc}
                                label="Thủ tục"
                                onChange={e => handleFilterChange('thuTuc', e.target.value)}
                                disabled={!filters.linhVuc}
                            >
                                <MenuItem value="">Tất cả</MenuItem>
                                {availableThuTuc.map(item => (
                                    <MenuItem key={item} value={item}>
                                        {item}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small">
                            <InputLabel>Trạng thái mẫu</InputLabel>
                            <Select
                                value={filters.availability}
                                label="Trạng thái mẫu"
                                onChange={e => handleFilterChange('availability', e.target.value)}
                            >
                                <MenuItem value="all">Tất cả</MenuItem>
                                <MenuItem value="available">Có sẵn mẫu</MenuItem>
                                <MenuItem value="unavailable">Chưa có mẫu</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                    {/* 
                    <Button variant="outlined" onClick={handleClearFilters} size="small">
                        Xóa bộ lọc
                    </Button> */}
                </CardContent>
            </Card>

            {/* Template List */}
            <Card>
                <CardContent>
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 2
                        }}
                    >
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Chip
                                icon={<CheckCircleIcon />}
                                label={`${filteredRecords.filter(r => r.isTemplateAvailable).length} có mẫu`}
                                color="success"
                                size="small"
                                variant="outlined"
                            />
                        </Box>
                    </Box>

                    {csvLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Box sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            {filteredRecords
                                .filter(r => r.isTemplateAvailable)
                                .map((record, index) => (
                                    <Paper
                                        key={index}
                                        variant="outlined"
                                        sx={{
                                            p: 2,
                                            mb: 2,
                                            borderRadius: 2,
                                            border: '1px solid #e0e0e0',
                                            '&:hover': {
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                                borderColor: '#1976d2'
                                            },
                                            transition: 'all 0.2s ease-in-out',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => handleSelectTemplate(record)}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start'
                                            }}
                                        >
                                            <Box sx={{ flex: 1 }}>
                                                <Typography
                                                    variant="subtitle1"
                                                    color="primary"
                                                    sx={{ fontWeight: 'bold', mb: 1 }}
                                                >
                                                    {record.maTTHC} - {record.tenTTHC}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{ mb: 1 }}
                                                >
                                                    Lĩnh vực: {record.linhVuc}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Đối tượng:{' '}
                                                    {record.doiTuong || 'Công dân Việt Nam'}
                                                </Typography>
                                            </Box>

                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 1,
                                                    alignItems: 'flex-end'
                                                }}
                                            >
                                                <Chip
                                                    label="Có sẵn mẫu"
                                                    color="success"
                                                    size="small"
                                                    icon={<CheckCircleIcon />}
                                                />
                                                <Button
                                                    variant="contained"
                                                    color="primary"
                                                    size="small"
                                                    startIcon={<EditIcon />}
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        handleSelectTemplate(record);
                                                    }}
                                                >
                                                    Soạn thảo
                                                </Button>
                                            </Box>
                                        </Box>
                                    </Paper>
                                ))}

                            {filteredRecords.filter(r => r.isTemplateAvailable).length === 0 && (
                                <Paper sx={{ p: 4, textAlign: 'center' }}>
                                    <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                                        Không tìm thấy mẫu đơn nào
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Thử thay đổi bộ lọc để tìm kiếm mẫu đơn phù hợp
                                    </Typography>
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
                maxWidth="xl"
                fullWidth
                sx={{
                    '& .MuiDialog-paper': {
                        height: '90vh',
                        maxHeight: '90vh'
                    }
                }}
            >
                <DialogTitle
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        pb: 1
                    }}
                >
                    <Typography variant="body2" fontWeight={'bold'}>
                        Tạo trực tuyến . NTSoft Document AI
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                            icon={<WifiIcon />}
                            label={socketStatus === 'connected' ? 'Đã kết nối' : 'Mất kết nối ngắt'}
                            color={socketStatus === 'connected' ? 'success' : 'default'}
                            size="small"
                        />
                        <IconButton onClick={handleCloseEditor}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>

                <DialogContent sx={{ p: 1, height: '100%' }}>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'row',
                            width: '100%',
                            height: '100%'
                        }}
                    >
                        <Card
                            sx={{
                                position: 'relative',
                                height: '100%',
                                width: '70%',
                                borderRadius: 2,
                                padding: 2
                            }}
                        >
                            <Box
                                p={1}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                <Typography variant="body2" fontWeight={'bold'}>
                                    Mẫu đơn/tờ khai 
                                </Typography>
                            </Box>
                            <CardContent
                                sx={{
                                    height: '100%'
                                }}
                            >
                                {editorState.syncfusionLoading && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 1000,
                                            flexDirection: 'column',
                                            gap: 2
                                        }}
                                    >
                                        <CircularProgress />
                                        <Typography variant="body2" color="text.secondary">
                                            Đang tải tài liệu...
                                        </Typography>
                                    </Box>
                                )}
                                {!editorState.syncfusionDocumentReady &&
                                    !editorState.syncfusionLoading && (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                backgroundColor: 'rgba(245, 245, 245, 0.9)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                zIndex: 999,
                                                flexDirection: 'column',
                                                gap: 2
                                            }}
                                        >
                                            <InfoIcon color="info" sx={{ fontSize: 48 }} />
                                            <Typography variant="h6" color="text.secondary">
                                                Đang chuẩn bị tài liệu
                                            </Typography>
                                        </Box>
                                    )}
                                <DocumentEditorContainerComponent
                                    id="sf-docx-editor-modal"
                                    ref={sfContainerRef}
                                    serviceUrl={SYNCFUSION_SERVICE_URL}
                                    enableToolbar={false}
                                    showPropertiesPane={false}
                                    height={'100%'}
                                    style={{ display: 'block' }}
                                    // toolbarMode={'Toolbar'}
                                    locale="vi-VN"
                                />
                            </CardContent>

                            {/* Quick Insert Field Panel */}
                            {/* {editorState.syncfusionDocumentReady && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 16,
                                        right: 16,
                                        background:
                                            'linear-gradient(135deg, #fff 0%, #f8f9fa 100%)',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: 2,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        p: 2,
                                        maxWidth: 280,
                                        zIndex: 1500,
                                        // disable  toolbarMode
                                        display: 'none'
                                    }}
                                >
                                    <Typography
                                        variant="subtitle2"
                                        sx={{
                                            mb: 1.5,
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
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {[
                                            {
                                                label: 'Họ tên',
                                                value: '{ho_ten}',
                                                color: 'primary'
                                            },
                                            { label: 'CCCD', value: '{cccd}', color: 'secondary' },
                                            { label: 'CMND', value: '{cmnd}', color: 'secondary' },
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
                                            { label: 'Ngày S', value: '{ns_ngay}', color: 'info' },
                                            {
                                                label: 'Tháng S',
                                                value: '{ns_thang}',
                                                color: 'info'
                                            },
                                            { label: 'Năm S', value: '{ns_nam}', color: 'info' },
                                            { label: 'Ngày C', value: '{nc_ngay}', color: 'error' },
                                            {
                                                label: 'Tháng C',
                                                value: '{nc_thang}',
                                                color: 'error'
                                            },
                                            { label: 'Năm C', value: '{nc_nam}', color: 'error' }
                                        ].map(field => (
                                            <Button
                                                key={field.value}
                                                size="small"
                                                variant="outlined"
                                                color={field.color as any}
                                                sx={{
                                                    fontSize: '11px',
                                                    py: 0.5,
                                                    px: 1,
                                                    textTransform: 'none',
                                                    borderRadius: 1,
                                                    flex: '1 1 calc(50% - 4px)',
                                                    minWidth: '90px',
                                                    '&:hover': {
                                                        transform: 'translateY(-1px)',
                                                        boxShadow: 2
                                                    },
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onClick={() =>
                                                    insertFieldIntoSyncfusion(field.value)
                                                }
                                                title={`Chèn ${field.value} vào vị trí con trỏ`}
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
                                        💡 Click để chèn field vào vị trí con trỏ
                                    </Typography>
                                </Box>
                            )} */}
                        </Card>
                        <Card
                            sx={{
                                borderWidth: 1,
                                borderRadius: 5,
                                borderColor: 'yellow',
                                backgroundColor: "yellow'",
                                width: 200,
                                height: 200
                            }}
                        >
                            <Card></Card>
                        </Card>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button
                        variant="outlined"
                        onClick={() => {
                            try {
                                sfContainerRef.current?.documentEditor?.print();
                            } catch {}
                        }}
                        startIcon={<PrintIcon />}
                        disabled={!editorState.syncfusionDocumentReady}
                    >
                        In
                    </Button>
                    <Button onClick={handleCloseEditor} variant="contained">
                        Đóng
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
    );
}

export const Route = createLazyFileRoute('/template-filler/')({
    component: TemplateFillerComponent
});
