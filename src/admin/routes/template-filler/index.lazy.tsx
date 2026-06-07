import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { saveAs } from 'file-saver';
import { Socket, io } from 'socket.io-client';

import { Close, Download, PictureAsPdf, Print } from '@mui/icons-material';
import {
    Alert,
    Autocomplete,
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
    IconButton,
    Paper,
    Snackbar,
    TextField,
    Typography
} from '@mui/material';
import { createLazyFileRoute } from '@tanstack/react-router';

import { ApiTemplateCard } from '@/admin/components/template-filler/ApiTemplateCard';
import { DataSyncPanel } from '@/admin/components/template-filler/DataSyncPanel';
import {
    PlaceholderIndexChoice,
    PlaceholderSummary,
    SyncfusionEditorModal
} from '@/admin/components/template-filler/SyncfusionEditorModal';
import {
    prepareTemplateData,
    processWordTemplate
} from '@/admin/components/word-mapper/templateUtils';
import { ConfigConstant } from '@/admin/constant/config.constant';
import { DoiTuongThucHien, WorkingDocument, db } from '@/admin/db/db';
import { doiTuongThucHienRepository } from '@/admin/repository/DoiTuongThucHienRepository';
import { linhVucRepository } from '@/admin/repository/LinhVucRepository';
import { thanhPhanHoSoTTHCRepository } from '@/admin/repository/ThanhPhanHoSoTTHCRepository';
import { thuTucHCRepository } from '@/admin/repository/ThuTucHCRepository';
import authService from '@/admin/services/authService';
import { chuyenDoiApiService } from '@/admin/services/chuyenDoiService';
import { dataSyncService } from '@/admin/services/dataSyncService';
import { LinhVuc } from '@/admin/services/linhVucService';
import {
    TEMPLATE_SPECIAL_FIELDS_EVENT,
    TEMPLATE_SPECIAL_FIELDS_STORAGE_KEY,
    templateSpecialFieldsService
} from '@/admin/services/templateSpecialFieldsService';
import { ThanhPhanHoSoTTHC } from '@/admin/services/thanhPhanHoSoService';
import { ThuTucHanhChinh } from '@/admin/services/thuTucHanhChinh';
import { formatDDMMYYYY } from '@/admin/utils/formatDate';
import Utils from '@/admin/utils/utils';

/* =========================
   Types & utils (pure)
   ========================= */

interface ProcessingData {
    [key: string]: any;
}

interface FillOptions {
    successMessage?: string;
    onFilled?: () => void;
}

interface PlaceholderSelectionOptions {
    cleanup?: boolean;
    restrictToSelection?: boolean;
}

const arePlaceholderSummariesEqual = (
    a: PlaceholderSummary[],
    b: PlaceholderSummary[]
): boolean => {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
        const sa = a[i];
        const sb = b[i];
        if (sa.baseKey !== sb.baseKey) return false;
        if (sa.variants.length !== sb.variants.length) return false;
        for (let j = 0; j < sa.variants.length; j += 1) {
            if (sa.variants[j] !== sb.variants[j]) return false;
        }
    }
    return true;
};

interface MauDon {
    tenGiayTo: string | null;
    tenFile: string;
    duongDan: string;
    isFromIndexedDB?: boolean;
    isApiTemplate?: boolean;
    duongDanTepDinhKem?: string;
    tenThanhPhan?: string;
    soBanChinh?: string;
    soBanSao?: string;
    ghiChu?: string | null;
    thanhPhanHoSoTTHCID?: string;
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

const createFilterOptionsFromIndexDB = (
    thuTucHcList: ThuTucHanhChinh[],
    linhVucList: LinhVuc[]
): FilterOptions => {
    const linhVucSet = new Set<string>();
    const doiTuongSet = new Set<string>();
    const capThucHienSet = new Set<string>();
    const thuTucByLinhVuc: { [linhVuc: string]: string[] } = {};

    thuTucHcList.forEach(thuTucHC => {
        let linhVucName = '';

        if (thuTucHC.linhVuc?.tenLinhVuc) {
            linhVucName = thuTucHC.linhVuc.tenLinhVuc;
        } else {
            const lv = linhVucList.find(x => x.maLinhVuc === thuTucHC.maLinhVuc);
            linhVucName = lv?.tenLinhVuc || thuTucHC.maLinhVuc;
        }

        if (linhVucName && thuTucHC.tenThuTucHanhChinh) {
            const tenLinhVuc = linhVucName.trim();
            const tenThuTuc = thuTucHC.tenThuTucHanhChinh.trim();
            linhVucSet.add(tenLinhVuc);
            if (!thuTucByLinhVuc[tenLinhVuc]) thuTucByLinhVuc[tenLinhVuc] = [];
            if (!thuTucByLinhVuc[tenLinhVuc].includes(tenThuTuc))
                thuTucByLinhVuc[tenLinhVuc].push(tenThuTuc);
        }

        normalizeDoiTuongList(thuTucHC.doiTuongThucHien).forEach(dt => doiTuongSet.add(dt));
        const capHanhChinh = thuTucHC.maCapHanhChinh ? String(thuTucHC.maCapHanhChinh).trim() : '';
        if (capHanhChinh) capThucHienSet.add(capHanhChinh);
    });

    Object.keys(thuTucByLinhVuc).forEach(lv => thuTucByLinhVuc[lv].sort());

    return {
        linhVuc: Array.from(linhVucSet).sort(),
        doiTuong: Array.from(doiTuongSet).sort(),
        capThucHien: Array.from(capThucHienSet).sort(),
        thuTucByLinhVuc
    };
};

const createLinhVucFilterOptions = (linhVucList: LinhVuc[]): string[] => {
    const names = linhVucList.map(lv => lv.tenLinhVuc).filter(Boolean);
    return Array.from(new Set(names)).sort();
};

const normalizeDoiTuongList = (raw: string | undefined | null): string[] => {
    if (!raw) return [];
    const trimmed = String(raw).trim();
    if (!trimmed) return [];

    try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map(item => String(item).trim()).filter(Boolean);
    } catch {
        /* not a JSON array -> continue fallback */
    }

    return trimmed
        .split(/[;,]/)
        .map(item => item.replace(/^"|"$/g, '').trim())
        .filter(Boolean);
};

const filterThuTucHanhChinh = (
    thuTucHcList: ThuTucHanhChinh[],
    filters: FilterState,
    linhVucList: LinhVuc[]
): ThuTucHanhChinh[] =>
    thuTucHcList.filter(thuTucHC => {
        if (filters.searchText) {
            const searchLower = filters.searchText.toLowerCase();
            const lv = linhVucList.find(x => x.maLinhVuc === thuTucHC.maLinhVuc);
            const searchableText = [
                thuTucHC.tenThuTucHanhChinh,
                thuTucHC.maThuTucHanhChinh,
                lv?.tenLinhVuc || thuTucHC.maLinhVuc,
                thuTucHC.doiTuongThucHien,
                thuTucHC.moTa
            ]
                .join(' ')
                .toLowerCase();

            if (!searchLower.split(' ').every(word => searchableText.includes(word))) return false;
        }

        if (
            filters.doiTuong &&
            !normalizeDoiTuongList(thuTucHC.doiTuongThucHien).includes(filters.doiTuong)
        )
            return false;

        if (filters.linhVuc) {
            let thuTucLinhVucName = '';
            if (thuTucHC.linhVuc?.tenLinhVuc) {
                thuTucLinhVucName = thuTucHC.linhVuc.tenLinhVuc;
            } else {
                const lv = linhVucList.find(x => x.maLinhVuc === thuTucHC.maLinhVuc);
                thuTucLinhVucName = lv?.tenLinhVuc || thuTucHC.maLinhVuc;
            }
            if (thuTucLinhVucName !== filters.linhVuc) return false;
        }

        if (filters.capThucHien) {
            const cap = thuTucHC.maCapHanhChinh ? String(thuTucHC.maCapHanhChinh) : '';
            if (!cap.includes(filters.capThucHien)) return false;
        }

        return true;
    });

const LEGACY_FIELD_COUNT = 7;

const LEGACY_HEADER_ALIASES: Record<string, string> = {
    cccd: 'cccd',
    so_cccd: 'cccd',
    sohochieu: 'cccd',
    'so_cccd/cccd': 'cccd',
    can_cuoc: 'cccd',
    can_cuoc_cong_dan: 'cccd',
    cmnd: 'cmnd',
    so_cmnd: 'cmnd',
    chung_minh_nhan_dan: 'cmnd',
    ho_ten: 'hoTen',
    hoten: 'hoTen',
    ho_va_ten: 'hoTen',
    hovaten: 'hoTen',
    ten: 'hoTen',
    'ho-ten': 'hoTen',
    ngay_sinh: 'ngaySinh',
    ngaysinh: 'ngaySinh',
    'ngay-sinh': 'ngaySinh',
    ngay_sinh_ddmmyyyy: 'ngaySinh',
    gioi_tinh: 'gioiTinh',
    gioitinh: 'gioiTinh',
    gioi: 'gioiTinh',
    dia_chi: 'diaChi',
    diachi: 'diaChi',
    dia_chi_thuong_tru: 'diaChi',
    noi_cu_tru: 'diaChi',
    dia_chi_thuong_tru_day_du: 'diaChi',
    dia_chi_tam_tru: 'diaChi',
    diachi_full: 'diaChi',
    ngay_cap: 'ngayCap',
    ngaycap: 'ngayCap',
    ngay_cap_the: 'ngayCap',
    ngay_cap_cccd: 'ngayCap'
};

const isObjectRecord = (value: unknown): value is Record<string, any> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeDateIfNeeded = (value: unknown): unknown => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (/^\d{8}$/.test(trimmed)) {
        const formatted = formatDDMMYYYY(trimmed);
        return formatted || trimmed;
    }
    return value;
};

const parseLegacyDelimitedInput = (input: string): Record<string, string> => {
    const createRecordFromParts = (parts: string[]): Record<string, string> => {
        const [
            cccd = '',
            cmnd = '',
            hoTen = '',
            ngaySinh = '',
            gioiTinh = '',
            diaChi = '',
            ngayCap = ''
        ] = parts;
        return { cccd, cmnd, hoTen, ngaySinh, gioiTinh, diaChi, ngayCap };
    };

    const normalizeHeaderKey = (raw: string): string | null => {
        if (!raw) return null;
        const normalized = raw
            .normalize('NFKC')
            .trim()
            .toLowerCase()
            .replace(/[-\s]+/g, '_');
        return LEGACY_HEADER_ALIASES[normalized] ?? null;
    };

    const assignWithAlias = (record: Record<string, string>, key: string | null, value: string) => {
        if (!key) return;
        record[key] = value;
        if (key === 'diaChi') {
            record.noi_cu_tru = value;
            record.dia_chi = value;
        }
        if (key === 'hoTen') record.ho_ten = value;
        if (key === 'ngaySinh') record.ngay_sinh = value;
        if (key === 'gioiTinh') record.gioi_tinh = value;
        if (key === 'ngayCap') record.ngay_cap = value;
        if (key === 'cccd') record.so_cccd = value;
        if (key === 'cmnd') record.so_cmnd = value;
    };

    const normalizedInput = input.replace(/[\r\n\u2028\u2029]+/g, '\n');
    const candidateLines = normalizedInput
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);

    const defaults = createRecordFromParts([]);

    const buildFromHeader = (
        valuesLine: string,
        headerLine: string
    ): Record<string, string> | null => {
        const headers = headerLine.split('|').map(part => normalizeHeaderKey(part));
        const recognized = headers.filter(Boolean);
        if (recognized.length < 2) return null;
        const values = valuesLine.split('|').map(part => part.trim());
        const record: Record<string, string> = { ...defaults };
        headers.forEach((header, index) => {
            if (!header) return;
            assignWithAlias(record, header, values[index] ?? '');
        });
        return record;
    };

    if (candidateLines.length >= 2) {
        for (let i = 0; i < candidateLines.length; i += 1) {
            for (let j = 0; j < candidateLines.length; j += 1) {
                if (i === j) continue;
                const record = buildFromHeader(candidateLines[i], candidateLines[j]);
                if (record) return record;
            }
        }
    }

    const pipeParts = normalizedInput.split('|').map(part => part.trim());
    if (pipeParts.length >= LEGACY_FIELD_COUNT) return createRecordFromParts(pipeParts);

    const commaParts = normalizedInput.split(',').map(part => part.trim());
    if (commaParts.length >= LEGACY_FIELD_COUNT) return createRecordFromParts(commaParts);

    return { ...defaults, raw: input };
};

const parseScanInputValue = (input: string): Record<string, any> => {
    const trimmed = input.trim();
    if (!trimmed) return {};

    try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return { data: parsed };
        if (isObjectRecord(parsed)) return parsed;
        return { value: parsed };
    } catch {
        const sanitized = trimmed.replace(/,\s*([}\]])/g, '$1');
        if (sanitized !== trimmed) {
            try {
                const reparsed = JSON.parse(sanitized);
                if (Array.isArray(reparsed)) return { data: reparsed };
                if (isObjectRecord(reparsed)) return reparsed;
                return { value: reparsed };
            } catch {
                /* noop */
            }
        }
        return parseLegacyDelimitedInput(trimmed);
    }
};

const buildProcessingPayload = (
    source: string | Record<string, any>
): { raw: any; processingData: ProcessingData | null } => {
    let rawValue: any = source;

    if (typeof source === 'string') rawValue = parseScanInputValue(source);
    else if (Array.isArray(source)) rawValue = { data: source };
    else if (!isObjectRecord(source)) rawValue = { value: source };

    if (!isObjectRecord(rawValue)) return { raw: rawValue, processingData: null };

    const normalized = { ...rawValue };
    if (normalized.ngaySinh) normalized.ngaySinh = normalizeDateIfNeeded(normalized.ngaySinh);
    if (normalized.ngayCap) normalized.ngayCap = normalizeDateIfNeeded(normalized.ngayCap);
    if (normalized.ngay_sinh) normalized.ngay_sinh = normalizeDateIfNeeded(normalized.ngay_sinh);
    if (normalized.ngay_cap) normalized.ngay_cap = normalizeDateIfNeeded(normalized.ngay_cap);

    const processingData = Utils.convertScannedInfoToProcessingData(normalized) as ProcessingData;
    return { raw: rawValue, processingData };
};

/* =========================
   Socket hook (isolated)
   ========================= */

const useSocketConnection = (apiUrl: string) => {
    const [socketStatus, setSocketStatus] = useState<
        'connected' | 'disconnected' | 'connecting' | 'error' | 'disabled'
    >('disconnected');
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const socketRef = useRef<Socket | null>(null);

    const connect = useCallback(() => {
        if (!apiUrl || apiUrl.trim() === '') {
            console.warn('⚠️ Socket URL is not configured, disabling socket connection');
            setSocketStatus('disabled');
            return;
        }
        if (socketRef.current?.connected) return;

        setSocketStatus('connecting');
        try {
            const token = authService.getToken() ?? '';
            const urlWithQuery = `${apiUrl.replace(/\/$/, '')}?token=${encodeURIComponent(token)}`;
            socketRef.current = io(urlWithQuery, {
                transports: ['polling', 'websocket'],
                timeout: 10000,
                reconnection: true,
                reconnectionAttempts: ConfigConstant.SOCKET_RECONNECT_ATTEMPTS,
                reconnectionDelay: ConfigConstant.SOCKET_RECONNECT_DELAY,
                auth: { token },
                autoConnect: true
            });

            socketRef.current.on('connect', () => {
                console.log('✅ Socket connected successfully, id=', socketRef.current?.id);
                setSocketStatus('connected');
                setReconnectAttempts(0);
                if (token) socketRef.current?.emit('authenticate', { token });
            });

            socketRef.current.on('disconnect', reason => {
                console.log('🔌 Socket disconnected:', reason);
                setSocketStatus('disconnected');
            });

            socketRef.current.on('connect_error', error => {
                console.error('❌ Socket connection error:', error);
                setSocketStatus('error');
                setReconnectAttempts(prev => prev + 1);
            });

            socketRef.current.on('reconnect', attemptNumber => {
                console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
                setSocketStatus('connected');
                setReconnectAttempts(0);
            });

            socketRef.current.on('reconnect_failed', () => {
                console.error('❌ Socket reconnection failed');
                setSocketStatus('error');
            });
        } catch (error) {
            console.error('❌ Failed to initialize socket:', error);
            setSocketStatus('error');
        }
    }, [apiUrl]);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        setSocketStatus('disconnected');
    }, []);

    const on = useCallback((event: string, callback: (...args: any[]) => void) => {
        if (socketRef.current) socketRef.current.on(event, callback);
    }, []);

    const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
        if (socketRef.current) socketRef.current.off(event, callback);
    }, []);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return { socketStatus, reconnectAttempts, connect, disconnect, on, off };
};

/* =========================
   Component
   ========================= */

function TemplateFillerComponent() {
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        linhVuc: [],
        doiTuong: [],
        capThucHien: [],
        thuTucByLinhVuc: {}
    });
    const [linhVucList, setLinhVucList] = useState<LinhVuc[]>([]);
    const [thuTucHcList, setThuTucHcList] = useState<ThuTucHanhChinh[]>([]);
    const [filteredThuTucHcList, setFilteredThuTucHcList] = useState<ThuTucHanhChinh[]>([]);
    const [linhVucLoading, setLinhVucLoading] = useState(false);

    const [isDataSynced, setIsDataSynced] = useState(false);
    const [showSyncPanel, setShowSyncPanel] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);

    const [doiTuongDict, setDoiTuongDict] = useState<Record<string, string>>({});

    const [offlineFilesState, setOfflineFilesState] = useState({
        downloadedFiles: {} as { [thanhPhanHoSoTTHCID: string]: boolean },
        totalDownloaded: 0,
        totalSize: 0
    });

    const { socketStatus, on, off } = useSocketConnection(ConfigConstant.SOCKET_URL);

    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'info' | 'warning';
    }>({ open: false, message: '', severity: 'info' });
    const [scanInput, setScanInput] = useState('');
    const [isProcessingFill, setIsProcessingFill] = useState(false);
    const [queuedProcessingData, setQueuedProcessingData] = useState<ProcessingData | null>(null);
    const [isGeneratingPrint, setIsGeneratingPrint] = useState(false);
    const [pdfPreviewState, setPdfPreviewState] = useState<{ open: boolean; url: string | null }>({
        open: false,
        url: null
    });
    const [specialFieldOverrides, setSpecialFieldOverrides] = useState<Record<string, string>>({});

    const refreshSpecialFieldOverrides = useCallback(() => {
        const stored = templateSpecialFieldsService.load();
        const map: Record<string, string> = {};
        stored.forEach(field => {
            if (!field.placeholder) return;
            map[field.placeholder] = field.value;
        });
        setSpecialFieldOverrides(map);
    }, []);

    useEffect(() => {
        refreshSpecialFieldOverrides();
        const handleStorage = (event: StorageEvent) => {
            if (event.key === TEMPLATE_SPECIAL_FIELDS_STORAGE_KEY) {
                refreshSpecialFieldOverrides();
            }
        };
        const handleCustomUpdate = () => refreshSpecialFieldOverrides();

        window.addEventListener('storage', handleStorage);
        window.addEventListener(TEMPLATE_SPECIAL_FIELDS_EVENT, handleCustomUpdate);

        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener(TEMPLATE_SPECIAL_FIELDS_EVENT, handleCustomUpdate);
        };
    }, [refreshSpecialFieldOverrides]);

    // Working documents
    const [workingDocsState, setWorkingDocsState] = useState({
        workingDocsListByCode: {} as { [maTTHC: string]: WorkingDocument[] },
        isLoading: false
    });

    const refreshWorkingDocuments = useCallback(async () => {
        try {
            setWorkingDocsState(prev => ({ ...prev, isLoading: true }));
            const allWorking = await db.workingDocumentsV2.orderBy('updatedAt').reverse().toArray();
            const listByCode: { [maTTHC: string]: WorkingDocument[] } = {};
            allWorking.forEach(doc => {
                if (!doc.maTTHC) return;
                if (!listByCode[doc.maTTHC]) listByCode[doc.maTTHC] = [];
                listByCode[doc.maTTHC].push(doc);
            });
            setWorkingDocsState({ workingDocsListByCode: listByCode, isLoading: false });
        } catch (e) {
            console.error('❌ Failed to refresh working documents:', e);
            setWorkingDocsState(prev => ({ ...prev, isLoading: false }));
        }
    }, []);

    useEffect(() => {
        refreshWorkingDocuments();
    }, [refreshWorkingDocuments]);

    const getWorkingDocumentsForMaTTHC = useCallback(
        (maTTHC: string): WorkingDocument[] => workingDocsState.workingDocsListByCode[maTTHC] || [],
        [workingDocsState.workingDocsListByCode]
    );

    // Modal chọn mẫu
    const [templateSelectionModal, setTemplateSelectionModal] = useState({
        open: false,
        record: null as EnhancedTTHCRecord | null
    });

    // Preview state
    const [previewState, setPreviewState] = useState<{
        url: string | null;
        fileName: string;
        fileType?: string;
        blob?: Blob | null;
        loading: boolean;
        isTemplate: boolean;
    }>({
        url: null,
        fileName: '',
        fileType: undefined,
        blob: null,
        loading: false,
        isTemplate: false
    });

    const [placeholderIndexSelection, setPlaceholderIndexSelection] =
        useState<PlaceholderIndexChoice>('default');
    const [placeholderSummary, setPlaceholderSummary] = useState<PlaceholderSummary[]>([]);
    const [placeholderSummaryInitialized, setPlaceholderSummaryInitialized] = useState(false);
    const [placeholderSummaryLocked, setPlaceholderSummaryLocked] = useState(false);

    const handlePlaceholderSummaryChange = useCallback(
        (summary: PlaceholderSummary[]) => {
            setPlaceholderSummaryInitialized(true);
            setPlaceholderSummary(prev => {
                // If summary is locked (after first fill), don't update
                if (placeholderSummaryLocked && prev.length > 0) {
                    return prev;
                }

                if (!previewState.isTemplate && prev.length > 0 && summary.length === 0)
                    return prev;
                return arePlaceholderSummariesEqual(prev, summary) ? prev : summary;
            });
        },
        [previewState.isTemplate, placeholderSummaryLocked]
    );

    const availablePlaceholderIndexes = useMemo(() => {
        const indexes = new Set<number>();
        placeholderSummary.forEach(group => {
            group.variants.forEach(key => {
                const match = key.match(/_(\d+)$/);
                if (match) indexes.add(Number(match[1]));
            });
        });
        return Array.from(indexes).sort((a, b) => a - b);
    }, [placeholderSummary]);

    const placeholderKeySet = useMemo(() => {
        const keys = new Set<string>();
        placeholderSummary.forEach(group => {
            if (group.baseKey) keys.add(group.baseKey);
            group.variants.forEach(key => keys.add(key));
        });
        return keys;
    }, [placeholderSummary]);

    const [placeholderSelectionDialogOpen, setPlaceholderSelectionDialogOpen] = useState(false);
    const [pendingPlaceholderData, setPendingPlaceholderData] = useState<{
        data: ProcessingData;
        options?: FillOptions;
    } | null>(null);

    const currentFillDataRef = useRef<ProcessingData>({});
    const templateBlobRef = useRef<Blob | null>(null);

    const resetPlaceholderSelectionState = useCallback(() => {
        setPlaceholderIndexSelection('default');
        setPlaceholderSummary([]);
        setPlaceholderSummaryInitialized(false);
        setPlaceholderSummaryLocked(false); // Unlock when resetting
        setPendingPlaceholderData(null);
        setPlaceholderSelectionDialogOpen(false);
        currentFillDataRef.current = {};
        templateBlobRef.current = null;
    }, []);

    // Object URLs cleanup
    const previewUrlRef = useRef<string | null>(null);
    const previewLoadRequestRef = useRef(0);
    const pdfPreviewUrlRef = useRef<string | null>(null);
    const pdfIframeRef = useRef<HTMLIFrameElement | null>(null);

    useEffect(() => {
        if (!placeholderSelectionDialogOpen) return;
        const hasMultipleVariants = placeholderSummary.some(group => group.variants.length > 1);
        if (!hasMultipleVariants) {
            setPlaceholderSelectionDialogOpen(false);
            setPendingPlaceholderData(null);
        }
    }, [placeholderSelectionDialogOpen, placeholderSummary]);

    const clearPreviewObjectUrl = useCallback(() => {
        if (previewUrlRef.current) {
            try {
                URL.revokeObjectURL(previewUrlRef.current);
            } catch {
                /* noop */
            }
            previewUrlRef.current = null;
        }
    }, []);

    const setPreviewFromUrl = useCallback(
        (url: string, fileName: string, options?: { fileType?: string }) => {
            const ext = (options?.fileType || fileName.split('.').pop() || '').toLowerCase();
            const requestId = ++previewLoadRequestRef.current;
            clearPreviewObjectUrl();
            templateBlobRef.current = null;

            const normalizedExt = ext || undefined;
            const setFallbackPreview = () => {
                if (previewLoadRequestRef.current !== requestId) return;
                setPreviewState({
                    url,
                    fileName,
                    fileType: normalizedExt,
                    blob: null,
                    loading: false,
                    isTemplate: false
                });
            };

            const needsConversion = ['doc', 'dot', 'docm'].includes(ext);

            if (needsConversion) {
                setPreviewState({
                    url: null,
                    fileName,
                    fileType: normalizedExt,
                    blob: null,
                    loading: true,
                    isTemplate: true
                });

                (async () => {
                    try {
                        const converted = await thanhPhanHoSoTTHCRepository.convertRemoteFileToDocx(
                            url,
                            fileName
                        );
                        if (previewLoadRequestRef.current !== requestId) return;

                        if (converted) {
                            clearPreviewObjectUrl();
                            const objectUrl = URL.createObjectURL(converted.blob);
                            previewUrlRef.current = objectUrl;
                            setPreviewState({
                                url: objectUrl,
                                fileName: converted.fileName,
                                fileType: 'docx',
                                blob: converted.blob,
                                loading: false,
                                isTemplate: true
                            });
                            return;
                        }

                        setFallbackPreview();
                        setSnackbar({
                            open: true,
                            severity: 'error',
                            message:
                                'Không thể chuyển đổi tài liệu .doc sang .docx để xem trước. Vui lòng tải xuống tài liệu gốc.'
                        });
                    } catch (error) {
                        if (previewLoadRequestRef.current !== requestId) return;
                        console.error('❌ Failed to convert template for preview:', error);
                        setFallbackPreview();
                        setSnackbar({
                            open: true,
                            severity: 'error',
                            message:
                                'Không thể chuyển đổi tài liệu để xem trước. Vui lòng thử lại hoặc tải xuống.'
                        });
                    }
                })();
                return;
            }

            setPreviewState({
                url,
                fileName,
                fileType: normalizedExt,
                blob: null,
                loading: false,
                isTemplate: true
            });
        },
        [clearPreviewObjectUrl, setSnackbar]
    );

    const setPreviewFromBlob = useCallback(
        (blob: Blob, fileName: string, options?: { isTemplate?: boolean }) => {
            previewLoadRequestRef.current += 1;
            clearPreviewObjectUrl();
            const objectUrl = URL.createObjectURL(blob);
            previewUrlRef.current = objectUrl;
            const ext = (fileName.split('.').pop() || '').toLowerCase();
            setPreviewState({
                url: objectUrl,
                fileName,
                fileType: ext,
                blob,
                loading: false,
                isTemplate: Boolean(options?.isTemplate)
            });
            if (options?.isTemplate) templateBlobRef.current = blob;
        },
        [clearPreviewObjectUrl]
    );

    const ensureWorkingBlob = useCallback(async (): Promise<{
        blob: Blob | null;
        error?: 'missing' | 'fetch_failed';
    }> => {
        if (previewState.blob) return { blob: previewState.blob };

        const md =
            templateSelectionModal.record?.selectedMauDon ||
            templateSelectionModal.record?.danhSachMauDon?.[0];

        if (previewState.url) {
            try {
                const response = await fetch(previewState.url);
                if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);
                const fetchedBlob = await response.blob();
                templateBlobRef.current = fetchedBlob;
                setPreviewState(prev => ({ ...prev, blob: fetchedBlob }));
                return { blob: fetchedBlob };
            } catch (error) {
                console.error('❌ Failed to fetch preview blob for filling:', error);
            }
        }

        if (md?.thanhPhanHoSoTTHCID) {
            try {
                const storedBlob = await thanhPhanHoSoTTHCRepository.getFileBlobForUse(
                    md.thanhPhanHoSoTTHCID
                );
                if (storedBlob) {
                    const name = md.tenFile || previewState.fileName || 'template.docx';
                    setPreviewFromBlob(storedBlob, name, { isTemplate: true });
                    return { blob: storedBlob };
                }
            } catch (error) {
                console.error('❌ Failed to load blob from repository:', error);
            }
        }

        if (!previewState.url) return { blob: null, error: 'missing' };
        return { blob: null, error: 'fetch_failed' };
    }, [
        previewState.blob,
        previewState.fileName,
        previewState.url,
        setPreviewFromBlob,
        templateSelectionModal.record
    ]);

    const applyPlaceholderSelection = useCallback(
        (
            data: ProcessingData,
            selectionOverride?: PlaceholderIndexChoice,
            options?: PlaceholderSelectionOptions
        ): ProcessingData => {
            const selection = selectionOverride ?? placeholderIndexSelection;
            if (!placeholderSummary.length) return data;

            const cleanup = options?.cleanup ?? false;
            const restrictToSelection = options?.restrictToSelection ?? false;
            const result: ProcessingData = restrictToSelection ? {} : { ...data };

            placeholderSummary.forEach(group => {
                if (!group.variants.length) return;

                const expectedSuffixKey =
                    typeof selection === 'number' ? `${group.baseKey}_${selection}` : group.baseKey;

                let targetKey: string | undefined;
                if (selection === 'default') {
                    targetKey =
                        group.variants.find(key => key === group.baseKey) ||
                        group.baseKey ||
                        group.variants[0];
                } else {
                    targetKey =
                        group.variants.find(key => key === expectedSuffixKey) ||
                        group.variants.find(key => {
                            const m = key.match(/_(\d+)$/);
                            return m && Number(m[1]) === selection;
                        }) ||
                        expectedSuffixKey;
                }
                if (!targetKey) return;

                const candidateKeys: string[] = [];
                if (typeof selection === 'number') candidateKeys.push(expectedSuffixKey);
                candidateKeys.push(group.baseKey);
                group.variants.forEach(key => {
                    if (!candidateKeys.includes(key)) candidateKeys.push(key);
                });

                const resolvedValue = candidateKeys.reduce<unknown>((acc, key) => {
                    if (typeof acc !== 'undefined') return acc;
                    return typeof data[key] !== 'undefined' ? data[key] : acc;
                }, undefined);

                if (typeof resolvedValue !== 'undefined') result[targetKey] = resolvedValue;

                if (restrictToSelection) {
                    const ensurePlaceholderText = (key: string | undefined) => {
                        if (!key || key === targetKey) return;
                        if (typeof result[key] !== 'undefined') return;
                        result[key] = `{${key}}`;
                    };
                    group.variants.forEach(variantKey => ensurePlaceholderText(variantKey));
                    ensurePlaceholderText(group.baseKey);
                }

                if (
                    cleanup &&
                    !restrictToSelection &&
                    typeof selection === 'number' &&
                    group.baseKey &&
                    group.baseKey !== targetKey
                ) {
                    delete result[group.baseKey];
                }
            });

            return result;
        },
        [placeholderIndexSelection, placeholderSummary]
    );
    const ADDRESS_KEYS = useMemo(
        () =>
            [
                'diaChi',
                'dia_chi',
                'noi_cu_tru',
                'noiCuTru',
                'diaChiThuongTru',
                'thuongTru',
                'tam_tru',
                'tamTru',
                'address'
            ] as const,
        []
    );

    const normalizeAddressFields = useCallback(
        async (data: ProcessingData): Promise<ProcessingData> => {
            const out: ProcessingData = { ...data };

            await Promise.all(
                ADDRESS_KEYS.map(async key => {
                    const val = out[key as keyof ProcessingData];
                    if (typeof val !== 'string' || !val.trim()) return;

                    try {
                        const resp = await chuyenDoiApiService.chuyenDoiDiaBan(val.trim());
                        if (resp.success && resp.data?.Succeeded && resp.data.Result) {
                            out[`${String(key)}_raw`] = val;
                            out[String(key)] = resp.data.Result;
                            if (key === 'diaChi' && !out['dia_chi'])
                                out['dia_chi'] = resp.data.Result;
                            if (key === 'noiCuTru' && !out['noi_cu_tru'])
                                out['noi_cu_tru'] = resp.data.Result;
                        }
                    } catch (e) {
                        console.warn('⚠️ Chuẩn hoá địa chỉ thất bại cho', key, e);
                    }
                })
            );

            return out;
        },
        [ADDRESS_KEYS]
    );

    const applySpecialFieldOverrides = useCallback(
        (data: ProcessingData): ProcessingData => {
            if (!Object.keys(specialFieldOverrides).length) return data;
            const out: ProcessingData = { ...data };
            Object.entries(specialFieldOverrides).forEach(([rawKey, value]) => {
                const key = rawKey.trim();
                if (!key) return;
                const existing = out[key];
                if (typeof existing === 'undefined' || existing === null) {
                    out[key] = value;
                    return;
                }
                if (typeof existing === 'string' && existing.trim() === '') {
                    out[key] = value;
                }
            });
            return out;
        },
        [specialFieldOverrides]
    );
    // const performFill = useCallback(
    //     async (
    //         processingData: ProcessingData,
    //         options?: FillOptions,
    //         selectionOverride?: PlaceholderIndexChoice
    //     ) => {
    //         if (isProcessingFill) return false;

    //         setIsProcessingFill(true);
    //         try {
    //             const { blob: workingBlob, error: workingBlobError } = await ensureWorkingBlob();
    //             if (!workingBlob) {
    //                 setSnackbar({
    //                     open: true,
    //                     message:
    //                         workingBlobError === 'fetch_failed'
    //                             ? 'Không thể chuẩn bị tài liệu để chèn dữ liệu'
    //                             : 'Chưa có tài liệu để chèn dữ liệu',
    //                     severity: workingBlobError === 'fetch_failed' ? 'error' : 'warning'
    //                 });
    //                 return false;
    //             }

    //             const adjusted = applyPlaceholderSelection(processingData, selectionOverride);
    //             const prepared = prepareTemplateData(adjusted);

    //             const scopedUpdates = applyPlaceholderSelection(prepared, selectionOverride, {
    //                 restrictToSelection: true
    //             });
    //             Object.keys(scopedUpdates).forEach(key => {
    //                 const value = scopedUpdates[key];
    //                 if (
    //                     typeof currentFillDataRef.current[key] !== 'undefined' &&
    //                     value === `{${key}}`
    //                 ) {
    //                     delete scopedUpdates[key];
    //                 }
    //             });

    //             const globalUpdates: ProcessingData = {};
    //             Object.entries(prepared).forEach(([key, value]) => {
    //                 if (placeholderKeySet.has(key)) return;
    //                 if (typeof value === 'undefined') return;
    //                 globalUpdates[key] = value;
    //             });

    //             const mergedData: ProcessingData = {
    //                 ...currentFillDataRef.current,
    //                 ...globalUpdates,
    //                 ...scopedUpdates
    //             };
    //             const templateBlob = templateBlobRef.current ?? workingBlob;
    //             const arrayBuffer = await templateBlob.arrayBuffer();
    //             const filledBlob = await processWordTemplate(arrayBuffer, mergedData);

    //             currentFillDataRef.current = mergedData;
    //             setPreviewFromBlob(filledBlob, previewState.fileName || 'document.docx');

    //             setSnackbar({
    //                 open: true,
    //                 message: options?.successMessage ?? 'Đã chèn dữ liệu vào tài liệu',
    //                 severity: 'success'
    //             });
    //             options?.onFilled?.();
    //             return true;
    //         } catch (error: any) {
    //             console.error('Fill error:', error);
    //             setSnackbar({
    //                 open: true,
    //                 message: error?.message || 'Lỗi khi chèn dữ liệu',
    //                 severity: 'error'
    //             });
    //             return false;
    //         } finally {
    //             setIsProcessingFill(false);
    //         }
    //     },
    //     [
    //         ensureWorkingBlob,
    //         isProcessingFill,
    //         applyPlaceholderSelection,
    //         previewState.fileName,
    //         placeholderKeySet,
    //         setPreviewFromBlob
    //     ]
    // );
    const performFill = useCallback(
        async (
            processingData: ProcessingData,
            options?: FillOptions,
            selectionOverride?: PlaceholderIndexChoice
        ) => {
            if (isProcessingFill) return false;

            setIsProcessingFill(true);
            try {
                const { blob: workingBlob, error: workingBlobError } = await ensureWorkingBlob();
                if (!workingBlob) {
                    const message =
                        workingBlobError === 'fetch_failed'
                            ? 'Không thể chuẩn bị tài liệu để chèn dữ liệu'
                            : 'Chưa có tài liệu để chèn dữ liệu';
                    setSnackbar({
                        open: true,
                        message,
                        severity: workingBlobError === 'fetch_failed' ? 'error' : 'warning'
                    });
                    return false;
                }

                const withSpecialFields = applySpecialFieldOverrides(processingData);
                const withNormalizedAddr = await normalizeAddressFields(withSpecialFields);
                const adjusted = applyPlaceholderSelection(withNormalizedAddr, selectionOverride);
                const prepared = prepareTemplateData(adjusted);
                const scopedUpdates = applyPlaceholderSelection(prepared, selectionOverride, {
                    restrictToSelection: true
                });

                Object.keys(scopedUpdates).forEach(key => {
                    const value = scopedUpdates[key];
                    if (
                        typeof currentFillDataRef.current[key] !== 'undefined' &&
                        value === `{${key}}`
                    ) {
                        delete scopedUpdates[key];
                    }
                });

                const globalUpdates: ProcessingData = {};
                Object.entries(prepared).forEach(([key, value]) => {
                    if (placeholderKeySet.has(key)) return;
                    if (typeof value === 'undefined') return;
                    globalUpdates[key] = value;
                });

                const mergedData: ProcessingData = {
                    ...currentFillDataRef.current,
                    ...globalUpdates,
                    ...scopedUpdates
                };

                const templateBlob = templateBlobRef.current ?? workingBlob;
                const arrayBuffer = await templateBlob.arrayBuffer();
                const filledBlob = await processWordTemplate(arrayBuffer, mergedData);

                currentFillDataRef.current = mergedData;
                setPreviewFromBlob(filledBlob, previewState.fileName || 'document.docx');

                setSnackbar({
                    open: true,
                    message: options?.successMessage ?? 'Đã chèn dữ liệu vào tài liệu',
                    severity: 'success'
                });

                // Lock placeholder summary after first fill to prevent rescanning
                setPlaceholderSummaryLocked(true);

                options?.onFilled?.();
                return true;
            } catch (error: any) {
                console.error('Fill error:', error);
                setSnackbar({
                    open: true,
                    message: error?.message || 'Lỗi khi chèn dữ liệu',
                    severity: 'error'
                });
                return false;
            } finally {
                setIsProcessingFill(false);
            }
        },
        [
            ensureWorkingBlob,
            isProcessingFill,
            applyPlaceholderSelection,
            applySpecialFieldOverrides,
            normalizeAddressFields,
            previewState.fileName,
            placeholderKeySet,
            setPreviewFromBlob,
            setSnackbar
        ]
    );
    const fillDocumentWithProcessingData = useCallback(
        async (processingData: ProcessingData | null, options?: FillOptions) => {
            if (!processingData) return false;

            if (isProcessingFill) {
                setQueuedProcessingData(processingData);
                setSnackbar({
                    open: true,
                    message: 'Đang chèn dữ liệu trước đó, sẽ xử lý tiếp ngay sau khi xong.',
                    severity: 'info'
                });
                return false;
            }

            if (!placeholderSummaryInitialized) {
                setPendingPlaceholderData({ data: processingData, options });
                return false;
            }

            if (placeholderSummary.some(group => group.variants.length > 1)) {
                setPendingPlaceholderData({ data: processingData, options });

                // Force close dialog first to ensure React re-renders when opening
                setPlaceholderSelectionDialogOpen(false);

                // Use microtask to open in next tick, ensuring state has updated
                Promise.resolve().then(() => {
                    setPlaceholderSelectionDialogOpen(true);
                    setSnackbar({
                        open: true,
                        message: 'Chọn đối tượng để chèn dữ liệu',
                        severity: 'info'
                    });
                });

                return false;
            }

            return await performFill(processingData, options);
        },
        [isProcessingFill, placeholderSummaryInitialized, placeholderSummary, performFill]
    );

    // Khi có lượt quét đang chờ và đã rảnh, mở dialog chọn (nếu cần) thay vì tự chèn
    useEffect(() => {
        if (!queuedProcessingData) return;
        if (isProcessingFill) return;
        if (pendingPlaceholderData) return;
        if (placeholderSelectionDialogOpen) return;

        const needsChoice = placeholderSummary.some(group => group.variants.length > 1);
        if (needsChoice) {
            setPendingPlaceholderData({ data: queuedProcessingData, options: undefined });
            setPlaceholderSelectionDialogOpen(true);
            setSnackbar({
                open: true,
                message: 'Chọn đối tượng để chèn dữ liệu',
                severity: 'info'
            });
            return;
        }

        (async () => {
            const success = await fillDocumentWithProcessingData(queuedProcessingData, {
                successMessage: 'Đã chèn dữ liệu từ lượt quét chờ'
            });
            if (success) setQueuedProcessingData(null);
        })();
    }, [
        queuedProcessingData,
        isProcessingFill,
        pendingPlaceholderData,
        placeholderSelectionDialogOpen,
        placeholderSummary,
        fillDocumentWithProcessingData
    ]);

    const applyPendingPlaceholderSelection = useCallback(
        async (selection: PlaceholderIndexChoice) => {
            if (!pendingPlaceholderData) {
                setPlaceholderSelectionDialogOpen(false);
                return;
            }
            const { data, options } = pendingPlaceholderData;
            const success = await performFill(data, options, selection);
            if (success) {
                setPendingPlaceholderData(null);
                setQueuedProcessingData(null);
                setPlaceholderSelectionDialogOpen(false);
            }
        },
        [pendingPlaceholderData, performFill]
    );

    const handlePlaceholderSelectionChoice = useCallback(
        (choice: PlaceholderIndexChoice) => {
            setPlaceholderIndexSelection(choice);
            void applyPendingPlaceholderSelection(choice);
        },
        [applyPendingPlaceholderSelection]
    );

    const handlePlaceholderSelectionConfirm = useCallback(async () => {
        await applyPendingPlaceholderSelection(placeholderIndexSelection);
    }, [applyPendingPlaceholderSelection, placeholderIndexSelection]);

    const handlePlaceholderSelectionCancel = useCallback(() => {
        setPendingPlaceholderData(null);
        setQueuedProcessingData(null);
        setPlaceholderSelectionDialogOpen(false);
    }, []);

    useEffect(() => {
        if (!pendingPlaceholderData || !placeholderSummaryInitialized) return;

        const needsChoice = placeholderSummary.some(group => group.variants.length > 1);

        if (needsChoice) {
            const dialogWasClosed = !placeholderSelectionDialogOpen;
            setPlaceholderSelectionDialogOpen(true);
            if (dialogWasClosed) {
                setSnackbar({
                    open: true,
                    message: 'Chọn đối tượng để chèn dữ liệu',
                    severity: 'info'
                });
            }
            return;
        }

        const { data, options } = pendingPlaceholderData;
        setPendingPlaceholderData(null);
        setPlaceholderSelectionDialogOpen(false);
        (async () => {
            const success = await performFill(data, options);
            if (success) setQueuedProcessingData(null);
        })();
    }, [
        pendingPlaceholderData,
        placeholderSummaryInitialized,
        placeholderSummary,
        placeholderSelectionDialogOpen,
        performFill
    ]);

    useEffect(
        () => () => {
            clearPreviewObjectUrl();
        },
        [clearPreviewObjectUrl]
    );

    // Load preview when modal opens
    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!templateSelectionModal.open || !templateSelectionModal.record) return;
            const md = templateSelectionModal.record.danhSachMauDon?.[0];
            if (!md?.thanhPhanHoSoTTHCID) return;
            try {
                setPreviewState(prev => ({ ...prev, loading: true }));
                const url = await thanhPhanHoSoTTHCRepository.getFileUrlForUse(
                    md.thanhPhanHoSoTTHCID,
                    md.duongDanTepDinhKem
                );
                let blob: Blob | null = null;
                if (!url)
                    blob = await thanhPhanHoSoTTHCRepository.getFileBlobForUse(
                        md.thanhPhanHoSoTTHCID
                    );

                if (!cancelled) {
                    if (url) setPreviewFromUrl(url, md.tenFile || 'template.docx');
                    else if (blob)
                        setPreviewFromBlob(blob, md.tenFile || 'template.docx', {
                            isTemplate: true
                        });
                    else setPreviewState(prev => ({ ...prev, loading: false }));
                }
            } catch {
                if (!cancelled) setPreviewState(prev => ({ ...prev, loading: false }));
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [
        templateSelectionModal.open,
        templateSelectionModal.record,
        setPreviewFromBlob,
        setPreviewFromUrl
    ]);

    // Load đối tượng thực hiện dictionary
    useEffect(() => {
        (async () => {
            const items = await doiTuongThucHienRepository.getAll();
            setDoiTuongDict(
                Object.fromEntries(
                    items.map((i: DoiTuongThucHien) => [
                        i.maDoiTuongThucHien,
                        i.tenDoiTuongThucHien
                    ])
                )
            );
        })();
    }, []);

    const loadLinhVucList = useCallback(async () => {
        setLinhVucLoading(true);
        try {
            const data = await linhVucRepository.getLinhVucList();
            setLinhVucList(data);
        } catch (err) {
            console.error('Lỗi khi tải lĩnh vực:', err);
            setSnackbar({
                open: true,
                message: 'Không thể tải danh sách lĩnh vực',
                severity: 'error'
            });
        } finally {
            setLinhVucLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLinhVucList();
    }, [loadLinhVucList]);

    const memoizedFilterOptions = useMemo(() => {
        if (thuTucHcList.length === 0)
            return { linhVuc: [], doiTuong: [], capThucHien: [], thuTucByLinhVuc: {} };

        const options = createFilterOptionsFromIndexDB(thuTucHcList, linhVucList);
        const linhVucOptions =
            linhVucList.length > 0 ? createLinhVucFilterOptions(linhVucList) : options.linhVuc;
        return { ...options, linhVuc: linhVucOptions };
    }, [thuTucHcList, linhVucList]);

    useEffect(() => {
        setFilterOptions(memoizedFilterOptions);
    }, [memoizedFilterOptions]);

    const filtersInitial: FilterState = useMemo(
        () => ({
            searchText: '',
            linhVuc: '',
            doiTuong: '',
            capThucHien: '',
            availability: 'all'
        }),
        []
    );
    const [filters, setFilters] = useState<FilterState>(filtersInitial);

    const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);
    const handleClearFilters = useCallback(() => setFilters(filtersInitial), [filtersInitial]);

    const memoizedFilteredData = useMemo(
        () => filterThuTucHanhChinh(thuTucHcList, filters, linhVucList),
        [thuTucHcList, filters, linhVucList]
    );
    useEffect(() => setFilteredThuTucHcList(memoizedFilteredData), [memoizedFilteredData]);

    const refreshOfflineFiles = useCallback(async () => {
        try {
            const stats = await thanhPhanHoSoTTHCRepository.getStorageStats();
            const allFiles = await thanhPhanHoSoTTHCRepository.getAllLocalFiles();
            const downloadedFiles: { [thanhPhanHoSoTTHCID: string]: boolean } = {};
            allFiles.forEach(file => {
                downloadedFiles[file.thanhPhanHoSoTTHCID] = true;
            });
            setOfflineFilesState({
                downloadedFiles,
                totalDownloaded: stats.totalFiles,
                totalSize: stats.totalSize
            });
        } catch (error) {
            console.error('❌ Failed to refresh offline files:', error);
        }
    }, []);

    useEffect(() => {
        refreshOfflineFiles();
    }, [refreshOfflineFiles]);

    const loadThuTucHanhChinh = useCallback(async () => {
        setDataLoading(true);
        try {
            const synced = await dataSyncService.isDataSynced();
            setIsDataSynced(synced);
            if (synced) {
                const data = await db.thuTucHanhChinh.toArray();
                setThuTucHcList(data);
                setSnackbar({
                    open: true,
                    message: `Đã tải ${data.length} thủ tục hành chính`,
                    severity: 'success'
                });
            } else {
                const data = await thuTucHCRepository.getAllThuTucHCApi();
                setThuTucHcList(data);
                setSnackbar({
                    open: true,
                    message: `Đã tải ${data.length} thủ tục hành chính từ API`,
                    severity: 'success'
                });
            }
        } catch (err) {
            console.error('Lỗi khi tải thủ tục hành chính:', err);
            setSnackbar({
                open: true,
                message: 'Không thể tải dữ liệu thủ tục hành chính',
                severity: 'error'
            });
        } finally {
            setDataLoading(false);
        }
    }, []);

    useEffect(() => {
        loadThuTucHanhChinh();
    }, [loadThuTucHanhChinh]);

    const handleSyncComplete = useCallback(async () => {
        await Promise.all([loadThuTucHanhChinh(), loadLinhVucList()]);
        setShowSyncPanel(false);
    }, [loadThuTucHanhChinh, loadLinhVucList]);

    const handleApiTemplateSelect = useCallback(
        async (templateData: { record: ThuTucHanhChinh; template: any }) => {
            try {
                const { record, template } = templateData;
                const selectedMauDon: MauDon = {
                    tenFile: template.tenTepDinhKem,
                    tenGiayTo: template.tenThanhPhanHoSoTTHC,
                    tenThanhPhan: template.tenThanhPhanHoSoTTHC,
                    soBanChinh: template.soBanChinh,
                    soBanSao: template.soBanSao,
                    ghiChu: template.ghiChu,
                    duongDanTepDinhKem: template.duongDanTepDinhKem,
                    isApiTemplate: true,
                    thanhPhanHoSoTTHCID: template.thanhPhanHoSoTTHCID,
                    duongDan: 'API Template'
                };
                const modalRecord: EnhancedTTHCRecord = {
                    stt: 0,
                    maTTHC: record.maThuTucHanhChinh,
                    tenTTHC: record.tenThuTucHanhChinh,
                    linhVuc: record.maLinhVuc,
                    doiTuong: record.doiTuongThucHien,
                    qdCongBo: '',
                    coQuanCongKhai: '',
                    capThucHien: record.maCapHanhChinh,
                    tinhTrang: '',
                    danhSachMauDon: [selectedMauDon],
                    selectedMauDon
                };
                resetPlaceholderSelectionState();
                setTemplateSelectionModal({ open: true, record: modalRecord });
            } catch (error) {
                console.error('❌ Error opening template:', error);
                setSnackbar({ open: true, message: 'Lỗi khi mở mẫu', severity: 'error' });
            }
        },
        [resetPlaceholderSelectionState]
    );

    const templateStats = useMemo(() => {
        const total = filteredThuTucHcList.length;
        return {
            available: total,
            total,
            offlineFiles: offlineFilesState.totalDownloaded,
            offlineSize: offlineFilesState.totalSize
        };
    }, [filteredThuTucHcList, offlineFilesState]);

    const handleSnackbarClose = useCallback(
        () => setSnackbar(prev => ({ ...prev, open: false })),
        []
    );

    // SOCKET: nhận data
    useEffect(() => {
        const handleDataReceived = (payload: any) => {
            if (socketStatus !== 'connected') {
                console.log('⚠️ Socket not connected, ignoring data:', socketStatus);
                return;
            }

            const { raw, processingData } = buildProcessingPayload(payload);
            if (!processingData) {
                console.warn('⚠️ Unable to build ProcessingData from socket payload:', payload);
                setSnackbar({
                    open: true,
                    message: 'Không thể xử lý dữ liệu từ NTS DocumentAI',
                    severity: 'error'
                });
                return;
            }

            const displayValue = (() => {
                try {
                    return JSON.stringify(raw, null, 2);
                } catch {
                    try {
                        return JSON.stringify(processingData, null, 2);
                    } catch {
                        return String(payload);
                    }
                }
            })();

            setScanInput(displayValue);
            setQueuedProcessingData(processingData);

            if (!templateSelectionModal.open) {
                setSnackbar({
                    open: true,
                    message: 'Đã nhận dữ liệu từ NTS DocumentAI. Mở mẫu đơn để chèn dữ liệu.',
                    severity: 'info'
                });
            }
        };

        on('data_received', handleDataReceived);
        return () => {
            off('data_received', handleDataReceived);
        };
    }, [on, off, socketStatus, templateSelectionModal.open]);

    // Auto-fill khi modal/preview sẵn sàng
    useEffect(() => {
        if (!templateSelectionModal.open) return;
        if (!queuedProcessingData) return;
        if (isProcessingFill) return;
        if (previewState.loading) return;
        if (!previewState.blob && !previewState.url) return;

        (async () => {
            const success = await fillDocumentWithProcessingData(queuedProcessingData, {
                successMessage: 'Đã chèn dữ liệu từ NTS DocumentAI',
                onFilled: () => setQueuedProcessingData(null)
            });
            if (success) setQueuedProcessingData(null);
        })();
    }, [
        templateSelectionModal.open,
        queuedProcessingData,
        previewState.loading,
        previewState.blob,
        previewState.url,
        isProcessingFill,
        fillDocumentWithProcessingData
    ]);

    // pipe '|' -> object socket style
    const pipeToSocketJson = (s: string) => {
        const [
            a = '',
            b = '',
            hoTen = '',
            ngaySinh = '',
            gioiTinh = '',
            diaChi = '',
            ngayCap = ''
        ] = s.split('|').map(x => x.trim());

        const is12 = (x: string) => /^\d{12}$/.test(x);
        const is9 = (x: string) => /^\d{9}$/.test(x);

        const cmnd = is9(a) ? a : is9(b) ? b : a;
        const cccd = is12(b) ? b : is12(a) ? a : b;

        const payload = { cccd, cmnd, hoTen, ngaySinh, gioiTinh, diaChi, ngayCap };
        return {
            ...payload,
            ho_ten: hoTen,
            ngay_sinh: ngaySinh,
            gioi_tinh: gioiTinh,
            dia_chi: diaChi,
            ngay_cap: ngayCap,
            so_cccd: cccd,
            so_cmnd: cmnd
        };
    };

    const fillFromHandheldScan = useCallback(
        async (raw: string | Record<string, any>) => {
            const source: string | Record<string, any> =
                typeof raw === 'string' && raw.includes('|') ? pipeToSocketJson(raw) : raw;

            const { processingData } = buildProcessingPayload(source);
            if (!processingData) {
                setSnackbar({
                    open: true,
                    message: 'Máy scan: không thể phân tích dữ liệu',
                    severity: 'error'
                });
                return false;
            }

            if (
                !templateSelectionModal.open ||
                previewState.loading ||
                (!previewState.blob && !previewState.url)
            ) {
                setQueuedProcessingData(processingData);
                setSnackbar({
                    open: true,
                    message: 'Đã nhận dữ liệu từ máy scan. Sẽ chèn khi tài liệu sẵn sàng.',
                    severity: 'info'
                });
                return true;
            }

            return await fillDocumentWithProcessingData(processingData, {
                successMessage: 'Đã chèn dữ liệu từ máy scan cầm tay'
            });
        },
        [
            fillDocumentWithProcessingData,
            previewState.blob,
            previewState.url,
            previewState.loading,
            templateSelectionModal.open
        ]
    );

    // Phân tích & fill từ ô nhập (hoặc normalized từ modal con)
    const handleAnalyzeAndFill = useCallback(
        async (args: {
            normalized: string;
            placeholderIndex: PlaceholderIndexChoice;
            record: any;
        }) => {
            const source = args?.normalized ?? scanInput;
            if (!source || (typeof source === 'string' && !source.trim())) {
                setSnackbar({
                    open: true,
                    message: 'Vui lòng nhập dữ liệu cần phân tích',
                    severity: 'warning'
                });
                return;
            }

            const { processingData } = buildProcessingPayload(source);
            if (!processingData) {
                setSnackbar({
                    open: true,
                    message: 'Không thể phân tích dữ liệu đầu vào',
                    severity: 'error'
                });
                return;
            }

            await fillDocumentWithProcessingData(processingData, {
                onFilled: () => setScanInput('')
            });
        },
        [scanInput, fillDocumentWithProcessingData]
    );

    const closePdfPreview = useCallback(() => {
        if (pdfPreviewUrlRef.current) {
            try {
                URL.revokeObjectURL(pdfPreviewUrlRef.current);
            } catch {
                /* noop */
            }
            pdfPreviewUrlRef.current = null;
        }
        pdfIframeRef.current = null;
        setPdfPreviewState({ open: false, url: null });
    }, []);

    const handleTestInsertNoiCuTru = useCallback(async () => {
        const sample = { noi_cu_tru: '123 Đường ABC, Phường DEF, Quận GHI, TP. Hồ Chí Minh' };
        try {
            setScanInput(JSON.stringify(sample, null, 2));
        } catch {
            setScanInput(
                '{ "noi_cu_tru": "123 Đường ABC, Phường DEF, Quận GHI, TP. Hồ Chí Minh" }'
            );
        }
        await fillDocumentWithProcessingData(Utils.convertScannedInfoToProcessingData(sample), {
            successMessage: 'Đã chèn thử địa chỉ vào {noi_cu_tru}'
        });
    }, [fillDocumentWithProcessingData]);

    const [changeTemplateModal, setChangeTemplateModal] = useState<{
        open: boolean;
        loading: boolean;
        templates: ThanhPhanHoSoTTHC[];
        error?: string;
    }>({ open: false, loading: false, templates: [], error: undefined });

    const handleChangeTemplate = useCallback(async () => {
        const currentRecord = templateSelectionModal.record;
        if (!currentRecord) {
            setSnackbar({
                open: true,
                message: 'Không xác định được thủ tục để đổi mẫu',
                severity: 'warning'
            });
            return;
        }

        setChangeTemplateModal({ open: true, loading: true, templates: [], error: undefined });
        try {
            const templates = await thanhPhanHoSoTTHCRepository.getThanhPhanHoSoByMaTTHC(
                currentRecord.maTTHC
            );
            setChangeTemplateModal({
                open: true,
                loading: false,
                templates,
                error: templates.length ? undefined : 'Không tìm thấy mẫu nào cho thủ tục này'
            });
        } catch (error) {
            console.error('❌ Failed to load templates for change:', error);
            setChangeTemplateModal({
                open: true,
                loading: false,
                templates: [],
                error: 'Không thể tải danh sách mẫu'
            });
        }
    }, [templateSelectionModal.record]);

    const handlePrintPdfPreview = useCallback(() => {
        if (!pdfPreviewState.url || !pdfIframeRef.current) {
            setSnackbar({
                open: true,
                message: 'Không tìm thấy bản PDF để in',
                severity: 'warning'
            });
            return;
        }
        try {
            pdfIframeRef.current.contentWindow?.focus();
            pdfIframeRef.current.contentWindow?.print();
        } catch (error) {
            console.error('❌ Unable to trigger print from PDF preview:', error);
            setSnackbar({
                open: true,
                message: 'Không thể gửi lệnh in cho bản PDF',
                severity: 'error'
            });
        }
    }, [pdfPreviewState.url]);

    const handleTemplateChangeSelect = useCallback(
        async (template: ThanhPhanHoSoTTHC) => {
            if (!templateSelectionModal.record) return;

            const selectedMauDon: MauDon = {
                tenFile: template.tenTepDinhKem,
                tenGiayTo: template.tenThanhPhanHoSoTTHC,
                tenThanhPhan: template.tenThanhPhanHoSoTTHC,
                soBanChinh: template.soBanChinh,
                soBanSao: template.soBanSao,
                ghiChu: template.ghiChu,
                duongDanTepDinhKem: template.duongDanTepDinhKem,
                isApiTemplate: true,
                thanhPhanHoSoTTHCID: template.thanhPhanHoSoTTHCID,
                duongDan: 'API Template'
            };

            setTemplateSelectionModal(prev => {
                if (!prev.record) return prev;
                return {
                    ...prev,
                    record: { ...prev.record, danhSachMauDon: [selectedMauDon], selectedMauDon }
                };
            });

            setChangeTemplateModal({
                open: false,
                loading: false,
                templates: [],
                error: undefined
            });
            resetPlaceholderSelectionState();

            try {
                setPreviewState(prev => ({ ...prev, loading: true }));
                const url = await thanhPhanHoSoTTHCRepository.getFileUrlForUse(
                    template.thanhPhanHoSoTTHCID,
                    template.duongDanTepDinhKem
                );
                if (url) {
                    setPreviewFromUrl(url, template.tenTepDinhKem || 'template.docx');
                    return;
                }
                const blob = await thanhPhanHoSoTTHCRepository.getFileBlobForUse(
                    template.thanhPhanHoSoTTHCID
                );
                if (blob)
                    setPreviewFromBlob(blob, template.tenTepDinhKem || 'template.docx', {
                        isTemplate: true
                    });
                else setPreviewState(prev => ({ ...prev, loading: false }));
            } catch (error) {
                console.error('❌ Failed to apply selected template:', error);
                setPreviewState(prev => ({ ...prev, loading: false }));
                setSnackbar({
                    open: true,
                    message: 'Không thể tải mẫu được chọn',
                    severity: 'error'
                });
            }
        },
        [
            resetPlaceholderSelectionState,
            setPreviewFromBlob,
            setPreviewFromUrl,
            templateSelectionModal.record
        ]
    );

    const handleCloseChangeTemplateModal = useCallback(
        () => setChangeTemplateModal(prev => ({ ...prev, open: false })),
        []
    );

    const handlePrintDocument = useCallback(async () => {
        if (isGeneratingPrint) return;
        const { blob: workingBlob, error } = await ensureWorkingBlob();
        if (!workingBlob || error) {
            setSnackbar({
                open: true,
                message:
                    error === 'missing'
                        ? 'Chưa có tài liệu để in'
                        : 'Không thể chuẩn bị tài liệu để in',
                severity: error === 'missing' ? 'warning' : 'error'
            });
            return;
        }

        setIsGeneratingPrint(true);
        try {
            const pdfBlob = await thanhPhanHoSoTTHCRepository.renderPdfFromBlob(workingBlob);
            if (!pdfBlob) throw new Error('Không nhận được PDF từ máy chủ');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            if (pdfPreviewUrlRef.current) {
                try {
                    URL.revokeObjectURL(pdfPreviewUrlRef.current);
                } catch {
                    /* noop */
                }
            }
            pdfPreviewUrlRef.current = pdfUrl;
            setPdfPreviewState({ open: true, url: pdfUrl });
            setSnackbar({
                open: true,
                message: 'Đã tạo bản PDF. Vui lòng sử dụng trình xem để in.',
                severity: 'info'
            });
        } catch (err: any) {
            console.error('❌ Failed to generate PDF for printing:', err);
            setSnackbar({
                open: true,
                message: err?.message || 'Không thể tạo PDF để in',
                severity: 'error'
            });
        } finally {
            setIsGeneratingPrint(false);
        }
    }, [ensureWorkingBlob, isGeneratingPrint]);

    /* =========================
     Render
     ========================= */

    return (
        <>
            <Box
                sx={{
                    width: '100%',
                    minHeight: '100vh',
                    background: '#f7f8fa',
                    p: { xs: 0.75, sm: 0.75, md: 0.75 }
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.5,
                        p: 1,
                        borderRadius: 1,
                        boxShadow: '0 3px 12px rgba(0,0,0,0.05)',
                        backdropFilter: 'blur(10px)',
                        background: 'rgba(255,255,255,0.9)',
                        border: '1px solid rgba(0,0,0,0.03)',
                        transition: 'all 0.3s ease',
                        mb: 0.75
                    }}
                >
                    <Button
                        size="small"
                        variant={isDataSynced ? 'contained' : 'outlined'}
                        color={isDataSynced ? 'success' : 'primary'}
                        onClick={() => setShowSyncPanel(!showSyncPanel)}
                        sx={{ ml: 'auto', minWidth: 110 }}
                    >
                        {isDataSynced ? '✅ Đã đồng bộ' : '🔄 Đồng bộ dữ liệu'}
                    </Button>

                    <TextField
                        size="small"
                        value={filters.searchText}
                        onChange={e => handleFilterChange('searchText', e.target.value)}
                        placeholder="Tìm kiếm thủ tục, mã, lĩnh vực..."
                        variant="outlined"
                        sx={{ minWidth: 220, flex: 1 }}
                    />

                    <Autocomplete
                        size="small"
                        options={['', ...filterOptions.linhVuc]}
                        value={filters.linhVuc}
                        onChange={(event, newValue) =>
                            handleFilterChange('linhVuc', newValue || '')
                        }
                        getOptionLabel={option => (option ? option : 'Tất cả')}
                        renderInput={params => (
                            <TextField
                                {...params}
                                label={`Lĩnh vực (${filterOptions.linhVuc.length})`}
                                placeholder={linhVucLoading ? 'Đang tải...' : 'Chọn lĩnh vực'}
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: <>{params.InputProps.endAdornment}</>
                                }}
                            />
                        )}
                        sx={{ minWidth: 200 }}
                    />

                    <Autocomplete
                        size="small"
                        options={['', ...filterOptions.doiTuong]}
                        value={filters.doiTuong}
                        onChange={(e, newValue) => handleFilterChange('doiTuong', newValue || '')}
                        getOptionLabel={option =>
                            option
                                ? doiTuongDict[option] ||
                                  option.replace(/^"|"$/g, '').replace(/\[|\]/g, '').trim()
                                : 'Tất cả'
                        }
                        renderInput={params => (
                            <TextField
                                {...params}
                                label="Đối tượng thực hiện"
                                placeholder="Chọn đối tượng..."
                            />
                        )}
                        sx={{ minWidth: 200 }}
                    />
                </Box>

                {showSyncPanel && <DataSyncPanel onSyncComplete={handleSyncComplete} />}

                <Card
                    sx={{
                        borderRadius: 1,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                        backdropFilter: 'blur(10px)',
                        background: 'rgba(255,255,255,0.95)',
                        border: '1px solid rgba(0,0,0,0.03)',
                        transition: 'all 0.3s ease',
                        height: 'calc(100vh - 96px)'
                    }}
                >
                    <CardHeader
                        title={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Danh sách mẫu đơn
                                </Typography>
                                {templateStats.offlineFiles > 0 && (
                                    <Chip
                                        icon={<Download />}
                                        label={`${templateStats.offlineFiles}  (${(templateStats.offlineSize / 1024 / 1024).toFixed(1)} MB)`}
                                        color="success"
                                        size="small"
                                        sx={{ fontWeight: 600 }}
                                    />
                                )}
                            </Box>
                        }
                        sx={{
                            py: 0.5,
                            px: 1.5,
                            '& .MuiCardHeader-title': { fontSize: '1.05rem', fontWeight: 600 }
                        }}
                    />
                    <CardContent
                        sx={{ height: 'calc(100% - 40px)', display: 'flex', gap: 1, px: 1, py: 1 }}
                    >
                        {dataLoading ? (
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    width: '100%'
                                }}
                            >
                                <CircularProgress />
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
                                    '&::-webkit-scrollbar': { width: '8px' },
                                    '&::-webkit-scrollbar-track': {
                                        background: '#f1f1f1',
                                        borderRadius: '4px'
                                    },
                                    '&::-webkit-scrollbar-thumb': {
                                        background: '#c1c1c1',
                                        borderRadius: '4px',
                                        '&:hover': { background: '#a8a8a8' }
                                    }
                                }}
                            >
                                {filteredThuTucHcList.map((data, index) => (
                                    <ApiTemplateCard
                                        key={`${data.thuTucHanhChinhID}-${index}`}
                                        record={data}
                                        linhVucList={linhVucList}
                                        doiTuongDict={doiTuongDict}
                                        onSelect={() => {}}
                                        onTemplateSelect={handleApiTemplateSelect}
                                    />
                                ))}
                                {filteredThuTucHcList.length === 0 && (
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
                                        <Box sx={{ mb: 3 }}>
                                            <Typography
                                                variant="h5"
                                                color="text.secondary"
                                                sx={{ mb: 2, fontWeight: 600 }}
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
                                        </Box>
                                    </Paper>
                                )}
                            </Box>
                        )}
                    </CardContent>
                </Card>

                {templateSelectionModal.open && templateSelectionModal.record && (
                    <SyncfusionEditorModal
                        open={templateSelectionModal.open}
                        onClose={() => {
                            setTemplateSelectionModal({ open: false, record: null });
                            clearPreviewObjectUrl();
                            closePdfPreview();
                            handleCloseChangeTemplateModal();
                            resetPlaceholderSelectionState();
                            setPreviewState({
                                url: null,
                                fileName: '',
                                fileType: undefined,
                                blob: null,
                                loading: false,
                                isTemplate: false
                            });
                        }}
                        record={templateSelectionModal.record as any}
                        linhVucList={linhVucList}
                        socketStatus={socketStatus}
                        preview={previewState as any}
                        selectedPlaceholderIndex={placeholderIndexSelection}
                        onPlaceholderIndexChange={value => setPlaceholderIndexSelection(value)}
                        onPlaceholderSummaryChange={handlePlaceholderSummaryChange}
                        onDownloadCurrent={async () => {
                            const md = templateSelectionModal.record?.danhSachMauDon?.[0] as any;
                            if (md?.thanhPhanHoSoTTHCID) {
                                try {
                                    setSnackbar({
                                        open: true,
                                        message: 'Đang tải tệp tin gốc...',
                                        severity: 'info'
                                    });
                                    const blob = await thanhPhanHoSoTTHCRepository.getFileBlobForUse(
                                        md.thanhPhanHoSoTTHCID
                                    );
                                    if (blob) {
                                        saveAs(blob, md.tenFile || 'template.docx');
                                        setSnackbar({
                                            open: true,
                                            message: 'Tải tệp tin gốc thành công',
                                            severity: 'success'
                                        });
                                        return;
                                    }
                                } catch (error) {
                                    console.error('❌ Failed to download original template:', error);
                                }
                            }

                            // Fallback to current preview if original template fetch fails
                            const fileName = previewState.fileName || 'document.docx';
                            if (previewState.blob) {
                                saveAs(previewState.blob, fileName);
                                return;
                            }
                            if (previewState.url) {
                                try {
                                    const response = await fetch(previewState.url);
                                    if (!response.ok) throw new Error('Download failed');
                                    const blob = await response.blob();
                                    saveAs(blob, fileName);
                                } catch (error) {
                                    console.error('❌ Failed to download current preview:', error);
                                    setSnackbar({
                                        open: true,
                                        message: 'Không thể tải xuống tài liệu',
                                        severity: 'error'
                                    });
                                }
                            }
                        }}
                        onPreviewApiTemplate={async () => {
                            const md = templateSelectionModal.record!.danhSachMauDon?.[0] as any;
                            if (!md?.thanhPhanHoSoTTHCID) return;
                            try {
                                setPreviewState(prev => ({ ...prev, loading: true }));
                                resetPlaceholderSelectionState();
                                const url = await thanhPhanHoSoTTHCRepository.getFileUrlForUse(
                                    md.thanhPhanHoSoTTHCID,
                                    md.duongDanTepDinhKem
                                );
                                if (url) {
                                    setPreviewFromUrl(url, md.tenFile || 'template.docx');
                                    return;
                                }
                                const blob = await thanhPhanHoSoTTHCRepository.getFileBlobForUse(
                                    md.thanhPhanHoSoTTHCID
                                );
                                if (blob)
                                    setPreviewFromBlob(blob, md.tenFile || 'template.docx', {
                                        isTemplate: true
                                    });
                                else setPreviewState(prev => ({ ...prev, loading: false }));
                            } catch (error) {
                                console.error('❌ Failed to preview API template:', error);
                                setPreviewState(prev => ({ ...prev, loading: false }));
                                setSnackbar({
                                    open: true,
                                    message: 'Không thể tải mẫu API',
                                    severity: 'error'
                                });
                            }
                        }}
                        workingDocs={getWorkingDocumentsForMaTTHC(
                            templateSelectionModal.record.maTTHC
                        )}
                        onPreviewWorkingDoc={wd => {
                            resetPlaceholderSelectionState();
                            setPreviewFromBlob(wd.blob, wd.fileName || 'working.docx', {
                                isTemplate: true
                            });
                        }}
                        onDownloadWorkingDoc={wd => saveAs(wd.blob, wd.fileName || 'working.docx')}
                        scanInput={scanInput}
                        setScanInput={setScanInput}
                        onAnalyzeAndFill={handleAnalyzeAndFill}
                        onHandheldScan={fillFromHandheldScan}
                        onTestInsertNoiCuTru={handleTestInsertNoiCuTru}
                        isProcessingFill={isProcessingFill}
                        onPrintDocument={handlePrintDocument}
                        isGeneratingPrint={isGeneratingPrint}
                        onChangeTemplate={handleChangeTemplate}
                        onResetDocument={async () => {
                            const md = templateSelectionModal.record!.danhSachMauDon?.[0] as any;
                            if (!md?.thanhPhanHoSoTTHCID) return;
                            try {
                                setPreviewState(prev => ({ ...prev, loading: true }));
                                resetPlaceholderSelectionState();
                                const url = await thanhPhanHoSoTTHCRepository.getFileUrlForUse(
                                    md.thanhPhanHoSoTTHCID,
                                    md.duongDanTepDinhKem
                                );
                                if (url) {
                                    setPreviewFromUrl(url, md.tenFile || 'template.docx');
                                    return;
                                }
                                const blob = await thanhPhanHoSoTTHCRepository.getFileBlobForUse(
                                    md.thanhPhanHoSoTTHCID
                                );
                                if (blob)
                                    setPreviewFromBlob(blob, md.tenFile || 'template.docx', {
                                        isTemplate: true
                                    });
                                else setPreviewState(prev => ({ ...prev, loading: false }));
                            } catch (error) {
                                console.error('❌ Failed to reset document preview:', error);
                                setPreviewState(prev => ({ ...prev, loading: false }));
                                setSnackbar({
                                    open: true,
                                    message: 'Không thể tải lại mẫu mặc định',
                                    severity: 'error'
                                });
                            }
                        }}
                    />
                )}

                {/* Dialog chọn đối tượng (khi có biến thể _1, _2, ...) */}
                <Dialog
                    open={placeholderSelectionDialogOpen}
                    onClose={() => {
                        setPlaceholderSelectionDialogOpen(false);
                        setPendingPlaceholderData(null);
                    }}
                >
                    <DialogTitle>Chọn đối tượng để chèn dữ liệu</DialogTitle>
                    <DialogContent dividers>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            Tài liệu có nhiều nhóm placeholder. Vui lòng chọn đối tượng cần chèn dữ
                            liệu.
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Button
                                variant={
                                    placeholderIndexSelection === 'default'
                                        ? 'contained'
                                        : 'outlined'
                                }
                                onClick={() => handlePlaceholderSelectionChoice('default')}
                                sx={{ justifyContent: 'flex-start' }}
                            >
                                Đối tượng (Mặc định)
                            </Button>
                            {availablePlaceholderIndexes.map(index => (
                                <Button
                                    key={index}
                                    variant={
                                        placeholderIndexSelection === index
                                            ? 'contained'
                                            : 'outlined'
                                    }
                                    onClick={() => handlePlaceholderSelectionChoice(index)}
                                    sx={{ justifyContent: 'flex-start' }}
                                >
                                    {`Đối tượng ${index} (hậu tố _${index})`}
                                </Button>
                            ))}
                            {availablePlaceholderIndexes.length === 0 && (
                                <Typography variant="body2" color="text.secondary">
                                    Không phát hiện đối tượng khác để lựa chọn.
                                </Typography>
                            )}
                            {placeholderSummary.length > 0 && (
                                <Box sx={{ mt: 1 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Danh sách placeholder:
                                    </Typography>
                                    {placeholderSummary.map(group => (
                                        <Typography
                                            key={group.baseKey}
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ display: 'block' }}
                                        >
                                            {`${group.baseKey} → ${group.variants.join(', ')}`}
                                        </Typography>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handlePlaceholderSelectionCancel}>Đóng</Button>
                        <Button
                            variant="contained"
                            onClick={handlePlaceholderSelectionConfirm}
                            disabled={!pendingPlaceholderData}
                        >
                            Chèn dữ liệu
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Snackbar & PDF preview */}
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

                <Dialog
                    open={pdfPreviewState.open}
                    onClose={closePdfPreview}
                    fullWidth
                    maxWidth={false}
                    sx={{
                        zIndex: theme => theme.zIndex.modal + 1,
                        '& .MuiDialog-paper': {
                            borderRadius: { xs: 0, sm: 2 },
                            boxShadow: '0 25px 50px rgba(25, 118, 210, 0.15)',
                            overflow: 'hidden',
                            m: { xs: 0, sm: 2 },
                            width: { xs: '100vw', sm: 'auto' },
                            height: { xs: '100vh', sm: 'auto' },
                            maxWidth: { xs: '100vw', sm: '95vw' },
                            maxHeight: { xs: '100vh', sm: '95vh' }
                        }
                    }}
                >
                    <DialogTitle
                        sx={{
                            background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: { xs: 1, sm: 1.5 },
                            py: { xs: 1.5, sm: 2 },
                            px: { xs: 2, sm: 3 },
                            boxShadow: '0 2px 10px rgba(25, 118, 210, 0.3)',
                            position: 'relative'
                        }}
                    >
                        <PictureAsPdf sx={{ fontSize: 28 }} />
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                                Xem trước tài liệu PDF
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 400 }}>
                                Kiểm tra nội dung trước khi in ấn
                            </Typography>
                        </Box>
                        <IconButton
                            onClick={closePdfPreview}
                            sx={{
                                position: 'absolute',
                                right: 16,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'white',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                backdropFilter: 'blur(10px)',
                                '&:hover': {
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    transform: 'translateY(-50%) scale(1.05)'
                                },
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Close />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent
                        dividers
                        sx={{
                            height: { xs: 'calc(100vh - 140px)', sm: '80vh' },
                            p: 0,
                            backgroundColor: '#f8f9fa',
                            position: 'relative'
                        }}
                    >
                        {pdfPreviewState.url ? (
                            <Box
                                sx={{
                                    height: '100%',
                                    width: '100%',
                                    position: 'relative',
                                    backgroundColor: 'white',
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)'
                                }}
                            >
                                <iframe
                                    ref={pdfIframeRef}
                                    src={pdfPreviewState.url}
                                    title="PDF Preview"
                                    style={{
                                        border: 'none',
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: '4px'
                                    }}
                                    allow="clipboard-write"
                                />
                                {/* Overlay toolbar for additional actions */}
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 16,
                                        right: 16,
                                        display: 'flex',
                                        gap: 1,
                                        opacity: 0,
                                        transition: 'opacity 0.3s ease',
                                        '&:hover': { opacity: 1 }
                                    }}
                                >
                                    <IconButton
                                        onClick={handlePrintPdfPreview}
                                        sx={{
                                            backgroundColor: 'rgba(255,255,255,0.9)',
                                            backdropFilter: 'blur(10px)',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                            '&:hover': {
                                                backgroundColor: 'rgba(255,255,255,1)',
                                                transform: 'scale(1.05)'
                                            },
                                            transition: 'all 0.2s ease'
                                        }}
                                        size="small"
                                    >
                                        <Print />
                                    </IconButton>
                                </Box>
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'text.secondary',
                                    backgroundColor: 'white',
                                    borderRadius: 1,
                                    m: { xs: 1, sm: 2 },
                                    p: { xs: 2, sm: 0 },
                                    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)'
                                }}
                            >
                                <PictureAsPdf
                                    sx={{ fontSize: { xs: 48, sm: 64 }, mb: 2, opacity: 0.5 }}
                                />
                                <Typography
                                    variant="h6"
                                    sx={{
                                        mb: 1,
                                        fontWeight: 500,
                                        fontSize: { xs: '1.1rem', sm: '1.25rem' },
                                        textAlign: 'center'
                                    }}
                                >
                                    Không tìm thấy bản PDF
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        textAlign: 'center',
                                        maxWidth: { xs: 280, sm: 300 },
                                        px: { xs: 1, sm: 0 },
                                        fontSize: { xs: '0.875rem', sm: '0.875rem' }
                                    }}
                                >
                                    Tài liệu PDF chưa được tạo hoặc có lỗi trong quá trình xử lý.
                                    Vui lòng thử lại hoặc kiểm tra kết nối mạng.
                                </Typography>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions
                        sx={{
                            px: { xs: 2, sm: 3 },
                            py: { xs: 1.5, sm: 2 },
                            backgroundColor: '#f8f9fa',
                            borderTop: '1px solid rgba(0,0,0,0.08)',
                            gap: 1,
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'stretch', sm: 'center' }
                        }}
                    >
                        <Box sx={{ flex: 1, mb: { xs: 1, sm: 0 }, order: { xs: 2, sm: 1 } }}>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: { xs: 'none', sm: 'block' } }}
                            >
                                💡 Mẹo: Sử dụng Ctrl+P (Cmd+P trên Mac) để in nhanh
                            </Typography>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: { xs: 'block', sm: 'none' }, textAlign: 'center' }}
                            >
                                💡 Sử dụng nút In để in tài liệu
                            </Typography>
                        </Box>
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 1,
                                order: { xs: 1, sm: 2 },
                                flexDirection: { xs: 'column', sm: 'row' },
                                width: { xs: '100%', sm: 'auto' }
                            }}
                        >
                            <Button
                                onClick={handlePrintPdfPreview}
                                disabled={!pdfPreviewState.url}
                                variant="contained"
                                startIcon={<Print />}
                                sx={{
                                    borderRadius: 2,
                                    px: 3,
                                    py: 1.5,
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)',
                                    boxShadow: '0 4px 15px rgba(25, 118, 210, 0.3)',
                                    '&:hover': {
                                        background:
                                            'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
                                        transform: 'translateY(-1px)',
                                        boxShadow: '0 6px 20px rgba(25, 118, 210, 0.4)'
                                    },
                                    '&:disabled': {
                                        background: '#e0e0e0',
                                        color: '#9e9e9e'
                                    },
                                    transition: 'all 0.2s ease',
                                    minHeight: { xs: 48, sm: 'auto' }
                                }}
                            >
                                In tài liệu
                            </Button>
                            <Button
                                onClick={closePdfPreview}
                                variant="outlined"
                                startIcon={<Close />}
                                sx={{
                                    borderRadius: 2,
                                    px: 3,
                                    py: 1.5,
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    borderColor: 'rgba(0,0,0,0.23)',
                                    '&:hover': {
                                        borderColor: 'rgba(0,0,0,0.5)',
                                        backgroundColor: 'rgba(0,0,0,0.04)',
                                        transform: 'translateY(-1px)'
                                    },
                                    transition: 'all 0.2s ease',
                                    minHeight: { xs: 48, sm: 'auto' }
                                }}
                            >
                                Đóng
                            </Button>
                        </Box>
                    </DialogActions>
                </Dialog>

                {/* Modal đổi mẫu */}
                <Dialog
                    open={changeTemplateModal.open}
                    onClose={handleCloseChangeTemplateModal}
                    fullWidth
                    maxWidth="md"
                >
                    <DialogTitle>Chọn mẫu khác</DialogTitle>
                    <DialogContent dividers>
                        {changeTemplateModal.loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : changeTemplateModal.error ? (
                            <Alert severity="warning">{changeTemplateModal.error}</Alert>
                        ) : changeTemplateModal.templates.length === 0 ? (
                            <Alert severity="info">Không có mẫu nào khả dụng cho thủ tục này</Alert>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {changeTemplateModal.templates.map(template => (
                                    <Card key={template.thanhPhanHoSoTTHCID} variant="outlined">
                                        <CardContent>
                                            <Typography
                                                variant="subtitle1"
                                                sx={{ fontWeight: 600 }}
                                            >
                                                {template.tenThanhPhanHoSoTTHC}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ mb: 1 }}
                                            >
                                                Tệp: {template.tenTepDinhKem}
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    onClick={() =>
                                                        handleTemplateChangeSelect(template)
                                                    }
                                                >
                                                    Chọn mẫu này
                                                </Button>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                ))}
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseChangeTemplateModal}>Đóng</Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </>
    );
}

export const Route = createLazyFileRoute('/template-filler/')({
    component: TemplateFillerComponent
});
