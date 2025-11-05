import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { saveAs } from 'file-saver';
import { Socket, io } from 'socket.io-client';

import { Download } from '@mui/icons-material';
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
import { dataSyncService } from '@/admin/services/dataSyncService';
import { LinhVuc } from '@/admin/services/linhVucService';
import { ThanhPhanHoSoTTHC } from '@/admin/services/thanhPhanHoSoService';
import { ThuTucHanhChinh } from '@/admin/services/thuTucHanhChinh';
import { formatDDMMYYYY } from '@/admin/utils/formatDate';
import Utils from '@/admin/utils/utils';

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

        if (thuTucHC.linhVuc && thuTucHC.linhVuc.tenLinhVuc) {
            linhVucName = thuTucHC.linhVuc.tenLinhVuc;
        } else {
            const linhVuc = linhVucList.find(lv => lv.maLinhVuc === thuTucHC.maLinhVuc);
            linhVucName = linhVuc?.tenLinhVuc || thuTucHC.maLinhVuc;
        }

        if (linhVucName && thuTucHC.tenThuTucHanhChinh) {
            const tenLinhVuc = linhVucName.trim();
            const tenThuTuc = thuTucHC.tenThuTucHanhChinh.trim();
            linhVucSet.add(tenLinhVuc);
            if (!thuTucByLinhVuc[tenLinhVuc]) thuTucByLinhVuc[tenLinhVuc] = [];
            if (!thuTucByLinhVuc[tenLinhVuc].includes(tenThuTuc))
                thuTucByLinhVuc[tenLinhVuc].push(tenThuTuc);
        }

        if (thuTucHC.doiTuongThucHien) {
            const dtList = thuTucHC.doiTuongThucHien
                .split(';')
                .map(dt => dt.trim())
                .filter(Boolean);
            dtList.forEach(dt => doiTuongSet.add(dt));
        }
        if (thuTucHC.maCapHanhChinh) {
            capThucHienSet.add(thuTucHC.maCapHanhChinh.trim());
        }
    });

    Object.keys(thuTucByLinhVuc).forEach(lv => thuTucByLinhVuc[lv].sort());

    return {
        linhVuc: Array.from(linhVucSet).sort(),
        doiTuong: Array.from(doiTuongSet).sort(),
        capThucHien: Array.from(capThucHienSet).sort(),
        thuTucByLinhVuc
    };
};

const createLinhVucFilterOptions = (linhVucList: LinhVuc[]): string[] =>
    linhVucList.map(lv => lv.tenLinhVuc).sort();

const filterThuTucHanhChinh = (
    thuTucHcList: ThuTucHanhChinh[],
    filters: FilterState,
    linhVucList: LinhVuc[]
): ThuTucHanhChinh[] => {
    return thuTucHcList.filter(thuTucHC => {
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
            if (!searchLower.split(' ').every(word => searchableText.includes(word))) return false;
        }

        if (filters.doiTuong) {
            const raw = thuTucHC.doiTuongThucHien || '';
            if (!raw.includes(filters.doiTuong)) return false;
        }

        if (filters.linhVuc) {
            let thuTucLinhVucName = '';
            if (thuTucHC.linhVuc && thuTucHC.linhVuc.tenLinhVuc) {
                thuTucLinhVucName = thuTucHC.linhVuc.tenLinhVuc;
            } else {
                const linhVuc = linhVucList.find(lv => lv.maLinhVuc === thuTucHC.maLinhVuc);
                thuTucLinhVucName = linhVuc?.tenLinhVuc || thuTucHC.maLinhVuc;
            }
            if (thuTucLinhVucName !== filters.linhVuc) return false;
        }

        if (filters.capThucHien && !thuTucHC.maCapHanhChinh.includes(filters.capThucHien))
            return false;

        return true;
    });
};

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
    if (pipeParts.length >= LEGACY_FIELD_COUNT) {
        return createRecordFromParts(pipeParts);
    }

    const commaParts = normalizedInput.split(',').map(part => part.trim());
    if (commaParts.length >= LEGACY_FIELD_COUNT) {
        return createRecordFromParts(commaParts);
    }

    return { ...defaults, raw: input };
};

const parseScanInputValue = (input: string): Record<string, any> => {
    const trimmed = input.trim();
    if (!trimmed) return {};

    try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
            return { data: parsed };
        }
        if (isObjectRecord(parsed)) return parsed;
        return { value: parsed };
    } catch {
        const sanitized = trimmed.replace(/,\s*([}\]])/g, '$1');
        if (sanitized !== trimmed) {
            try {
                const reparsed = JSON.parse(sanitized);
                if (Array.isArray(reparsed)) {
                    return { data: reparsed };
                }
                if (isObjectRecord(reparsed)) return reparsed;
                return { value: reparsed };
            } catch {
                /* fallthrough */
            }
        }
        return parseLegacyDelimitedInput(trimmed);
    }
};

const buildProcessingPayload = (
    source: string | Record<string, any>
): { raw: any; processingData: ProcessingData | null } => {
    let rawValue: any = source;

    if (typeof source === 'string') {
        rawValue = parseScanInputValue(source);
    } else if (Array.isArray(source)) {
        rawValue = { data: source };
    } else if (!isObjectRecord(source)) {
        rawValue = { value: source };
    }

    if (!isObjectRecord(rawValue)) {
        return { raw: rawValue, processingData: null };
    }

    const normalized = { ...rawValue };

    if (normalized.ngaySinh) normalized.ngaySinh = normalizeDateIfNeeded(normalized.ngaySinh);
    if (normalized.ngayCap) normalized.ngayCap = normalizeDateIfNeeded(normalized.ngayCap);
    if (normalized.ngay_sinh) normalized.ngay_sinh = normalizeDateIfNeeded(normalized.ngay_sinh);
    if (normalized.ngay_cap) normalized.ngay_cap = normalizeDateIfNeeded(normalized.ngay_cap);

    const processingData = Utils.convertScannedInfoToProcessingData(normalized) as ProcessingData;

    return { raw: rawValue, processingData };
};
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
                if (token) {
                    socketRef.current?.emit('authenticate', { token });
                }
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

    // Working documents state (IndexedDB)
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

    // Modal chọn mẫu (API + bản sao tùy chỉnh)
    const [templateSelectionModal, setTemplateSelectionModal] = useState({
        open: false,
        record: null as EnhancedTTHCRecord | null
    });
    // Preview state for react-doc-viewer
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
    const handlePlaceholderSummaryChange = useCallback(
        (summary: PlaceholderSummary[]) => {
            setPlaceholderSummaryInitialized(true);
            setPlaceholderSummary(prev => {
                if (!previewState.isTemplate && prev.length > 0 && summary.length === 0)
                    return prev;
                return arePlaceholderSummariesEqual(prev, summary) ? prev : summary;
            });
        },
        [previewState.isTemplate]
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
        setPendingPlaceholderData(null);
        setPlaceholderSelectionDialogOpen(false);
        currentFillDataRef.current = {};
        templateBlobRef.current = null;
    }, []);

    // Keep a ref to the current object URL so we can clean up when switching sources
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
    }, [placeholderSelectionDialogOpen, placeholderSummary, setPendingPlaceholderData]);

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
        [clearPreviewObjectUrl, setSnackbar, thanhPhanHoSoTTHCRepository]
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
            if (options?.isTemplate) {
                templateBlobRef.current = blob;
            }
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
        setPreviewState,
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
                            const match = key.match(/_(\d+)$/);
                            return match && Number(match[1]) === selection;
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
                    if (typeof key === 'undefined' || key === null) return acc;
                    if (typeof acc !== 'undefined') return acc;
                    return typeof data[key] !== 'undefined' ? data[key] : acc;
                }, undefined);

                if (typeof resolvedValue !== 'undefined') {
                    result[targetKey] = resolvedValue;
                }

                if (restrictToSelection) {
                    const ensurePlaceholderText = (key: string | undefined) => {
                        if (!key) return;
                        if (key === targetKey) return;
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

                const adjusted = applyPlaceholderSelection(processingData, selectionOverride);
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
            previewState.fileName,
            placeholderKeySet,
            setPreviewFromBlob,
            setSnackbar
        ]
    );

    const fillDocumentWithProcessingData = useCallback(
        async (processingData: ProcessingData | null, options?: FillOptions) => {
            if (!processingData) return false;
            if (isProcessingFill) return false;

            if (!placeholderSummaryInitialized) {
                setPendingPlaceholderData({ data: processingData, options });
                return false;
            }

            if (placeholderSummary.some(group => group.variants.length > 1)) {
                setPendingPlaceholderData({ data: processingData, options });
                setPlaceholderSelectionDialogOpen(true);
                setSnackbar({
                    open: true,
                    message: 'Chọn đối tượng để chèn dữ liệu',
                    severity: 'info'
                });
                return false;
            }

            return performFill(processingData, options);
        },
        [
            isProcessingFill,
            placeholderSummaryInitialized,
            placeholderSummary,
            performFill,
            setSnackbar,
            setPendingPlaceholderData,
            setPlaceholderSelectionDialogOpen
        ]
    );

    const handlePlaceholderSelectionChoice = useCallback(
        (choice: PlaceholderIndexChoice) => {
            setPlaceholderIndexSelection(choice);
            setPlaceholderSelectionDialogOpen(false);
            setPendingPlaceholderData(prev => {
                if (!prev) return null;
                void performFill(prev.data, prev.options, choice);
                return null;
            });
        },
        [performFill]
    );

    useEffect(() => {
        if (!pendingPlaceholderData) return;
        if (!placeholderSummaryInitialized) return;
        const needsChoice = placeholderSummary.some(group => group.variants.length > 1);
        if (needsChoice) {
            if (!placeholderSelectionDialogOpen) {
                setPlaceholderSelectionDialogOpen(true);
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
        performFill(data, options);
    }, [
        pendingPlaceholderData,
        placeholderSummaryInitialized,
        placeholderSummary,
        placeholderSelectionDialogOpen,
        performFill,
        setPendingPlaceholderData,
        setPlaceholderSelectionDialogOpen,
        setSnackbar
    ]);

    useEffect(() => {
        return () => {
            clearPreviewObjectUrl();
        };
    }, [clearPreviewObjectUrl]);

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
                if (!url) {
                    blob = await thanhPhanHoSoTTHCRepository.getFileBlobForUse(
                        md.thanhPhanHoSoTTHCID
                    );
                }
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

    const memoizedFilterOptions = useMemo(() => {
        if (thuTucHcList.length > 0 && linhVucList.length > 0) {
            const options = createFilterOptionsFromIndexDB(thuTucHcList, linhVucList);
            const linhVucOptions = createLinhVucFilterOptions(linhVucList);
            return {
                ...options,
                linhVuc: linhVucOptions
            };
        }
        return { linhVuc: [], doiTuong: [], capThucHien: [], thuTucByLinhVuc: {} };
    }, [thuTucHcList, linhVucList]);

    useEffect(() => {
        setFilterOptions(memoizedFilterOptions);
    }, [memoizedFilterOptions]);

    const filtersInitial: FilterState = {
        searchText: '',
        linhVuc: '',
        doiTuong: '',
        capThucHien: '',
        availability: 'all'
    };
    const [filters, setFilters] = useState<FilterState>(filtersInitial);

    const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);
    const handleClearFilters = useCallback(() => setFilters(filtersInitial), []);

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
        await loadThuTucHanhChinh();
        setShowSyncPanel(false);
    }, [loadThuTucHanhChinh]);

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
    }, [
        on,
        off,
        socketStatus,
        templateSelectionModal.open,
        setSnackbar,
        setScanInput,
        setQueuedProcessingData
    ]);

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
            if (success) {
                setQueuedProcessingData(null);
            }
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
            // Nếu raw là chuỗi có dấu "|" => convert sang object "kiểu socket"
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

            // Nếu modal/template chưa sẵn sàng, cứ queue (bạn đã có queuedProcessingData)
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
            buildProcessingPayload,
            fillDocumentWithProcessingData,
            previewState.blob,
            previewState.url,
            previewState.loading,
            templateSelectionModal.open,
            setSnackbar,
            setQueuedProcessingData
        ]
    );
    // const handleAnalyzeAndFill = useCallback(async () => {
    //     if (!scanInput.trim()) {
    //         setSnackbar({
    //             open: true,
    //             message: 'Vui lòng nhập dữ liệu cần phân tích',
    //             severity: 'warning'
    //         });
    //         return;
    //     }

    //     const { processingData } = buildProcessingPayload(scanInput);
    //     if (!processingData) {
    //         setSnackbar({
    //             open: true,
    //             message: 'Không thể phân tích dữ liệu đầu vào',
    //             severity: 'error'
    //         });
    //         return;
    //     }

    //     await fillDocumentWithProcessingData(processingData, {
    //         onFilled: () => setScanInput('')
    //     });
    // }, [scanInput, fillDocumentWithProcessingData, setSnackbar, setScanInput]);
    // Thay thế hàm cũ
    const handleAnalyzeAndFill = useCallback(
        async (args: {
            normalized: string;
            placeholderIndex: PlaceholderIndexChoice;
            record: any /* hoặc EnhancedTTHCRecord | null nếu bạn đã export type ở file này */;
        }) => {
            const source = args?.normalized ?? scanInput; // Ưu tiên normalized truyền xuống
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
                onFilled: () => setScanInput('') // có thể giữ để clear ô nhập
            });
        },
        [scanInput, fillDocumentWithProcessingData, setSnackbar, setScanInput]
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
    }, [fillDocumentWithProcessingData, setScanInput]);

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
    }, [templateSelectionModal.record, setSnackbar]);

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
    }, [pdfPreviewState.url, setSnackbar]);

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
                    record: {
                        ...prev.record,
                        danhSachMauDon: [selectedMauDon],
                        selectedMauDon
                    }
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
            setSnackbar,
            templateSelectionModal.record
        ]
    );

    const handleCloseChangeTemplateModal = useCallback(() => {
        setChangeTemplateModal(prev => ({ ...prev, open: false }));
    }, []);

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
            console.log('📄 Generated PDF blob', { size: pdfBlob.size, type: pdfBlob.type });
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
    }, [ensureWorkingBlob, isGeneratingPrint, setSnackbar]);

    return (
        <>
            <Box
                sx={{
                    width: '100%',
                    minHeight: '100vh',
                    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                    p: { xs: 1, sm: 1, md: 1 }
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
                    <Button
                        variant={isDataSynced ? 'contained' : 'outlined'}
                        color={isDataSynced ? 'success' : 'primary'}
                        onClick={() => setShowSyncPanel(!showSyncPanel)}
                        sx={{ ml: 'auto', minWidth: 120 }}
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
                        sx={{ minWidth: 220 }}
                    />

                    <Autocomplete
                        size="small"
                        options={['', ...filterOptions.doiTuong]}
                        value={filters.doiTuong}
                        onChange={(e, newValue) => handleFilterChange('doiTuong', newValue || '')}
                        renderInput={params => (
                            <TextField
                                {...params}
                                label="Đối tượng thực hiện"
                                placeholder="Chọn đối tượng..."
                            />
                        )}
                        sx={{ minWidth: 220 }}
                    />
                </Box>

                {showSyncPanel && <DataSyncPanel onSyncComplete={handleSyncComplete} />}

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
                            pb: 0,
                            '& .MuiCardHeader-title': { fontSize: '1.1rem', fontWeight: 600 }
                        }}
                    />
                    <CardContent sx={{ height: 'calc(100% - 40px)', display: 'flex', gap: 2 }}>
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
                            const fileName = previewState.fileName;
                            if (!fileName) return;
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
                                        message: 'Không thể tải xuống tài liệu hiện tại',
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
                            console.log('wd', wd.blob);
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
                                Đối tượng
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
                        <Button
                            onClick={() => {
                                setPendingPlaceholderData(null);
                                setPlaceholderSelectionDialogOpen(false);
                            }}
                        >
                            Đóng
                        </Button>
                    </DialogActions>
                </Dialog>

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
                    maxWidth="xl"
                    sx={{ zIndex: theme => theme.zIndex.modal + 1 }}
                >
                    <DialogTitle>Xem trước</DialogTitle>
                    <DialogContent dividers sx={{ height: '80vh', p: 0 }}>
                        {pdfPreviewState.url ? (
                            <Box sx={{ height: '100%', width: '100%' }}>
                                <iframe
                                    ref={pdfIframeRef}
                                    src={pdfPreviewState.url}
                                    title="PDF Preview"
                                    style={{ border: 'none', width: '100%', height: '100%' }}
                                    allow="clipboard-write"
                                />
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'text.secondary'
                                }}
                            >
                                Không tìm thấy bản PDF
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handlePrintPdfPreview} disabled={!pdfPreviewState.url}>
                            In
                        </Button>
                        <Button onClick={closePdfPreview}>Đóng</Button>
                    </DialogActions>
                </Dialog>

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
