import React, { useCallback } from 'react';

import { renderAsync } from 'docx-preview';
import PizZip from 'pizzip';
// thêm import
import { flushSync } from 'react-dom';

import AdfScannerIcon from '@mui/icons-material/AdfScanner';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import InfoIcon from '@mui/icons-material/Info';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import WifiIcon from '@mui/icons-material/Wifi';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    IconButton,
    MenuItem,
    Radio,
    RadioGroup,
    Snackbar,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';

import { WorkingDocument } from '@/admin/db/db';
import { LinhVuc } from '@/admin/services/linhVucService';

interface EnhancedTTHCRecord {
    stt: number;
    maTTHC: string;
    tenTTHC: string;
    qdCongBo?: string;
    doiTuong?: string;
    linhVuc?: string;
    coQuanCongKhai?: string;
    capThucHien?: string;
    tinhTrang?: string;
}

interface PreviewState {
    url: string | null;
    fileName: string;
    fileType?: string;
    blob?: Blob | null;
    loading: boolean;
}

interface SyncfusionEditorModalProps {
    open: boolean;
    onClose: () => void;
    record: EnhancedTTHCRecord | null;
    linhVucList: LinhVuc[];
    socketStatus?: 'connected' | 'disconnected' | 'connecting' | 'error' | 'disabled';
    preview: PreviewState;
    onDownloadCurrent: () => void | Promise<void>;
    onPreviewApiTemplate: () => void | Promise<void>;
    workingDocs: WorkingDocument[];
    onPreviewWorkingDoc: (wd: WorkingDocument) => void;
    onDownloadWorkingDoc: (wd: WorkingDocument) => void;
    scanInput: string;
    setScanInput: (text: string) => void;
    // trong interface props
    onHandheldScan?: (
        raw: string | Record<string, any>
    ) => Promise<boolean | void> | boolean | void;
    onAnalyzeAndFill: (args: {
        normalized: string;
        placeholderIndex: PlaceholderIndexChoice;
        record: EnhancedTTHCRecord | null;
    }) => void | Promise<void>;
    onTestInsertNoiCuTru?: () => void;
    isProcessingFill: boolean;
    onChangeTemplate?: () => void;
    onResetDocument?: () => void;
    onPrintDocument?: () => void;
    isGeneratingPrint?: boolean;
    selectedPlaceholderIndex?: PlaceholderIndexChoice;
    onPlaceholderIndexChange?: (index: PlaceholderIndexChoice) => void;
    onPlaceholderSummaryChange?: (summary: PlaceholderSummary[]) => void;
}

interface PlaceholderVariant {
    key: string;
    index?: number;
}

interface PlaceholderGroup {
    baseKey: string;
    variants: PlaceholderVariant[];
}

export type PlaceholderIndexChoice = number | 'default';

export interface PlaceholderSummary {
    baseKey: string;
    variants: string[];
}

type Canon = {
    cmnd?: string;
    cccd?: string;
    fullName?: string; // ho_ten
    dob?: string; // ddMMyyyy
    gender?: string; // Nam/Nữ/Male/Female…
    address?: string;
    issueDate?: string; // ddMMyyyy
};

const SCAN_AUTO_SUBMIT_PIPE_THRESHOLD = 6;

const ALIAS_TO_CANON: Record<string, keyof Canon> = {
    cmnd: 'cmnd',
    cccd: 'cccd',
    ho_ten: 'fullName',
    hoTen: 'fullName',
    ho: 'fullName',
    ten: 'fullName',
    ngay_sinh: 'dob',
    ngaySinh: 'dob',
    gioi_tinh: 'gender',
    gioiTinh: 'gender',
    dia_chi: 'address',
    diaChi: 'address',
    ngay_cap: 'issueDate',
    ngayCap: 'issueDate'
};

const normDate = (raw?: string) => {
    if (!raw) return undefined;
    const s = raw.replace(/[^\d]/g, '');
    if (s.length === 8) return s; // ddMMyyyy
    const m = raw.match(/(\d{1,2})[^\d](\d{1,2})[^\d](\d{2,4})/);
    if (m) {
        const dd = m[1].padStart(2, '0');
        const mm = m[2].padStart(2, '0');
        const yyyy = m[3].length === 2 ? (Number(m[3]) > 30 ? '19' + m[3] : '20' + m[3]) : m[3];
        return `${dd}${mm}${yyyy}`;
    }
    return s;
};

const normGender = (g?: string) => {
    if (!g) return undefined;
    const t = g.trim().toLowerCase();
    if (['m', 'male', 'nam', '1'].includes(t)) return 'Nam';
    if (['f', 'female', 'nu', 'nữ', '0'].includes(t)) return 'Nữ';
    return g;
};

export const SyncfusionEditorModal: React.FC<SyncfusionEditorModalProps> = ({
    open,
    onClose,
    record,
    linhVucList,
    socketStatus = 'disabled',
    preview,
    onDownloadCurrent,
    onPreviewApiTemplate,
    workingDocs,
    onPreviewWorkingDoc,
    onDownloadWorkingDoc,
    scanInput,
    setScanInput,
    onTestInsertNoiCuTru,
    isProcessingFill,
    onChangeTemplate,
    onResetDocument,
    onPrintDocument,
    isGeneratingPrint = false,
    selectedPlaceholderIndex: externalPlaceholderIndex,
    onPlaceholderIndexChange,
    onPlaceholderSummaryChange,
    onAnalyzeAndFill,
    onHandheldScan
}) => {
    const [snackbar, setSnackbar] = React.useState({
        open: false,
        message: '',
        severity: 'info' as 'success' | 'error' | 'warning' | 'info'
    });
    const handleSnackbarClose = () => setSnackbar(prev => ({ ...prev, open: false }));

    // input mode tabs
    const [inputMode, setInputMode] = React.useState<'ntsoft' | 'scanner'>('ntsoft');
    const scanInputRef = React.useRef<HTMLInputElement | null>(null);

    // print CSS once
    React.useEffect(() => {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.media = 'print';
        style.textContent =
            '@media print { body * { visibility: hidden !important; } #docviewer-print-root, #docviewer-print-root * { visibility: visible !important; } #docviewer-print-root { position: absolute; left: 0; top: 0; right: 0; } }';
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    // auto-focus when open / switch to scanner tab
    React.useEffect(() => {
        if (!open) return;
        const t = setTimeout(() => {
            if (inputMode === 'scanner' && scanInputRef.current) {
                scanInputRef.current.focus();
                const v = scanInputRef.current.value;
                scanInputRef.current.selectionStart = v.length;
                scanInputRef.current.selectionEnd = v.length;
            }
        }, 150);
        return () => clearTimeout(t);
    }, [open, inputMode]);

    const mapDoiTuong = (raw?: string | null) => {
        if (!raw) return '— Chưa chọn mẫu —';
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.join(', ');
        } catch {
            /* empty */
        }
        return raw;
    };

    // ===== DOCX previewer =====
    const DocxPreviewArea: React.FC<{
        url?: string | null;
        blob?: Blob | null;
        fileName?: string;
    }> = ({ url, blob, fileName }) => {
        const containerRef = React.useRef<HTMLDivElement | null>(null);
        const [loading, setLoading] = React.useState(false);
        const [error, setError] = React.useState<string | null>(null);

        React.useEffect(() => {
            let cancelled = false;
            const renderDocument = async () => {
                if (!containerRef.current) return;
                const container = containerRef.current;
                container.innerHTML = '';

                if (!url && !blob) {
                    setError(null);
                    setLoading(false);
                    return;
                }

                setLoading(true);
                setError(null);
                try {
                    let arrayBuffer: ArrayBuffer | null = null;
                    if (blob) arrayBuffer = await blob.arrayBuffer();
                    else if (url) {
                        const response = await fetch(url);
                        if (!response.ok)
                            throw new Error(`Không thể tải tài liệu (${response.status})`);
                        arrayBuffer = await response.arrayBuffer();
                    }
                    if (cancelled || !arrayBuffer) return;

                    container.innerHTML = '';
                    await renderAsync(arrayBuffer, container, undefined, {
                        inWrapper: false,
                        className: 'docx-preview',
                        ignoreFonts: true
                    });
                } catch (err) {
                    if (!cancelled) {
                        console.error('❌ Unable to render docx preview:', err);
                        setError(
                            'Không thể hiển thị tệp DOCX. Bạn có thể tải xuống hoặc mở bản in PDF.'
                        );
                    }
                } finally {
                    if (!cancelled) setLoading(false);
                }
            };
            renderDocument();
            return () => {
                cancelled = true;
            };
        }, [url, blob, fileName]);

        return (
            <Box sx={{ position: 'relative', width: '100%', height: '100%', overflow: 'auto' }}>
                {loading && (
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(255,255,255,0.8)',
                            zIndex: 1
                        }}
                    >
                        <CircularProgress />
                    </Box>
                )}
                {error && (
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'error.main',
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            zIndex: 1,
                            p: 2,
                            textAlign: 'center'
                        }}
                    >
                        {error}
                    </Box>
                )}
                <Box
                    ref={containerRef}
                    sx={{
                        minHeight: '100%',
                        '& .docx-preview': { width: '100%', maxWidth: '100%', margin: '0 auto' }
                    }}
                    data-filename={fileName}
                />
            </Box>
        );
    };

    // ===== Placeholder scan from DOCX =====
    const placeholderScanRequestRef = React.useRef(0);
    const [placeholderState, setPlaceholderState] = React.useState<{
        loading: boolean;
        groups: PlaceholderGroup[];
        error?: string;
    }>({ loading: false, groups: [], error: undefined });
    const [selectedPlaceholderIndex, setSelectedPlaceholderIndex] =
        React.useState<PlaceholderIndexChoice>(externalPlaceholderIndex ?? 'default');
    const scanSubmitTimeoutRef = React.useRef<number | null>(null);

    const updateSelectedIndex = React.useCallback(
        (value: PlaceholderIndexChoice) => {
            setSelectedPlaceholderIndex(value);
            onPlaceholderIndexChange?.(value);
        },
        [onPlaceholderIndexChange]
    );

    React.useEffect(
        () => () => {
            if (scanSubmitTimeoutRef.current) window.clearTimeout(scanSubmitTimeoutRef.current);
        },
        []
    );

    React.useEffect(() => {
        if (typeof externalPlaceholderIndex !== 'undefined')
            setSelectedPlaceholderIndex(externalPlaceholderIndex);
    }, [externalPlaceholderIndex]);

    React.useEffect(() => {
        if (!open) {
            setPlaceholderState({ loading: false, groups: [], error: undefined });
            updateSelectedIndex('default');
            return;
        }

        const requestId = ++placeholderScanRequestRef.current;
        let cancelled = false;

        const extractPlaceholders = (arrayBuffer: ArrayBuffer): PlaceholderGroup[] => {
            const zip = new PizZip(arrayBuffer);
            const files = Object.keys(zip.files).filter(name =>
                /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/i.test(name)
            );

            const doublePattern = /\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g;
            const singlePattern = /\{\s*([A-Za-z0-9_.]+)\s*\}/g;
            const placeholders = new Set<string>();

            for (const fileName of files) {
                const file = zip.file(fileName);
                if (!file) continue;
                let content = '';
                try {
                    content = file.asText();
                } catch {
                    continue;
                }
                let match: RegExpExecArray | null;
                while ((match = doublePattern.exec(content))) {
                    if (match[1]) placeholders.add(match[1]);
                }
                while ((match = singlePattern.exec(content))) {
                    const rawMatch = match[0];
                    const start = match.index;
                    const end = start + rawMatch.length;
                    const prevChar = start > 0 ? content[start - 1] : '';
                    const nextChar = end < content.length ? content[end] : '';
                    if (prevChar === '{' || nextChar === '}') continue; // skip {{{ or }}}
                    if (match[1]) placeholders.add(match[1]);
                }
            }

            const groupsMap = new Map<string, PlaceholderVariant[]>();
            placeholders.forEach(rawKey => {
                const suffixMatch = rawKey.match(/^(.*?)(?:_(\d+))?$/);
                const baseKey = suffixMatch?.[1] || rawKey;
                const index = suffixMatch?.[2] ? Number(suffixMatch[2]) : undefined;
                const variants = groupsMap.get(baseKey) ?? [];
                variants.push({ key: rawKey, index });
                groupsMap.set(baseKey, variants);
            });

            const groups: PlaceholderGroup[] = Array.from(groupsMap.entries())
                .map(([baseKey, variants]) => {
                    const sorted = variants.sort((a, b) => {
                        const aIndex = typeof a.index === 'number' ? a.index : -1;
                        const bIndex = typeof b.index === 'number' ? b.index : -1;
                        if (aIndex === bIndex) return a.key.localeCompare(b.key);
                        return aIndex - bIndex;
                    });
                    return { baseKey, variants: sorted };
                })
                .filter(
                    group =>
                        group.variants.length > 1 ||
                        group.variants.some(v => typeof v.index === 'number')
                )
                .sort((a, b) => a.baseKey.localeCompare(b.baseKey));

            return groups;
        };

        const run = async () => {
            if (!preview.blob && !preview.url) {
                if (cancelled || placeholderScanRequestRef.current !== requestId) return;
                setPlaceholderState({ loading: false, groups: [], error: undefined });
                return;
            }

            setPlaceholderState(prev => ({ loading: true, groups: prev.groups, error: undefined }));

            try {
                const arrayBuffer = preview.blob
                    ? await preview.blob.arrayBuffer()
                    : await (async () => {
                          const response = await fetch(preview.url as string);
                          if (!response.ok) throw new Error('Failed to download template for scan');
                          return await response.arrayBuffer();
                      })();

                if (cancelled || placeholderScanRequestRef.current !== requestId) return;
                const groups = extractPlaceholders(arrayBuffer);
                setPlaceholderState({ loading: false, groups, error: undefined });
            } catch (error) {
                console.error('❌ Failed to scan placeholders from template:', error);
                if (cancelled || placeholderScanRequestRef.current !== requestId) return;
                setPlaceholderState({
                    loading: false,
                    groups: [],
                    error: 'Không thể đọc danh sách placeholder từ tài liệu'
                });
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, [open, preview.blob, preview.url, preview.fileName, updateSelectedIndex]);

    const placeholderIndexes = React.useMemo(() => {
        const indexes = new Set<number>();
        placeholderState.groups.forEach(group => {
            group.variants.forEach(variant => {
                if (typeof variant.index === 'number') indexes.add(variant.index);
            });
        });
        return Array.from(indexes).sort((a, b) => a - b);
    }, [placeholderState.groups]);

    React.useEffect(() => {
        if (!placeholderIndexes.length) {
            if (selectedPlaceholderIndex !== 'default') updateSelectedIndex('default');
            return;
        }
        if (
            selectedPlaceholderIndex !== 'default' &&
            !placeholderIndexes.includes(selectedPlaceholderIndex)
        ) {
            updateSelectedIndex(placeholderIndexes[0]);
        }
    }, [placeholderIndexes, selectedPlaceholderIndex, updateSelectedIndex]);

    const placeholderSummary = React.useMemo(
        () =>
            placeholderState.groups.map(group => ({
                baseKey: group.baseKey,
                variants: group.variants.map(v => v.key)
            })),
        [placeholderState.groups]
    );

    const lastSerializedSummaryRef = React.useRef('');
    React.useEffect(() => {
        const serialized = JSON.stringify(placeholderSummary);
        if (serialized === lastSerializedSummaryRef.current) return;
        lastSerializedSummaryRef.current = serialized;
        onPlaceholderSummaryChange?.(placeholderSummary);
    }, [placeholderSummary, onPlaceholderSummaryChange]);

    // ===== Scanner payload handling =====
    const parseScannerPayload = (text: string): { canon: Canon | null; error?: string } => {
        const cleaned = text
            .replace(/[\u2028\u2029\uFEFF]/g, '\n')
            .replace(/[“”]/g, '"')
            .replace(/[‘’]/g, "'")
            .trim();
        const lines = cleaned
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(Boolean);
        if (lines.length === 0) return { canon: null, error: 'Không có dữ liệu để phân tích.' };

        const looksLikeHeader = (l: string) => {
            const parts = l.split('|').map(s => s.trim().toLowerCase());
            const hit = parts.filter(p => ALIAS_TO_CANON[p as keyof typeof ALIAS_TO_CANON]).length;
            return hit >= 2;
        };

        let headerIdx = lines.findIndex(looksLikeHeader);
        let valuesIdx = -1;

        if (headerIdx >= 0) {
            valuesIdx = headerIdx === 0 ? 1 : headerIdx - 1; // header có thể ở trên hoặc dưới
        } else if (lines.length === 2) {
            headerIdx = looksLikeHeader(lines[1]) ? 1 : looksLikeHeader(lines[0]) ? 0 : -1;
            valuesIdx = headerIdx === 0 ? 1 : 0;
        } else if (lines.length === 1) {
            const defKeys = [
                'cmnd',
                'cccd',
                'ho_ten',
                'ngay_sinh',
                'gioi_tinh',
                'dia_chi',
                'ngay_cap'
            ];
            const vals = lines[0].split('|').map(s => s.trim());
            const canon: Canon = {};
            defKeys.forEach((k, i) => {
                const v = vals[i];
                if (v == null) return;
                const c = ALIAS_TO_CANON[k] as keyof Canon;
                (canon[c] as any) = v;
            });
            canon.dob = normDate(canon.dob);
            canon.issueDate = normDate(canon.issueDate);
            canon.gender = normGender(canon.gender);
            return { canon };
        } else {
            return {
                canon: null,
                error: 'Không xác định được dòng tiêu đề (header) của dữ liệu quét.'
            };
        }

        if (valuesIdx < 0 || valuesIdx >= lines.length || headerIdx < 0) {
            return { canon: null, error: 'Thiếu cặp dòng header/values hợp lệ.' };
        }

        const header = lines[headerIdx].split('|').map(s => s.trim());
        const values = lines[valuesIdx].split('|').map(s => s.trim());
        if (values.length < header.length)
            return { canon: null, error: 'Số cột dữ liệu ít hơn tiêu đề.' };

        const canon: Canon = {};
        header.forEach((h, i) => {
            const key = ALIAS_TO_CANON[h as keyof typeof ALIAS_TO_CANON];
            if (!key) return;
            const v = values[i];
            if (v == null) return;
            (canon[key] as any) = v;
        });

        canon.dob = normDate(canon.dob);
        canon.issueDate = normDate(canon.issueDate);
        canon.gender = normGender(canon.gender);
        return { canon };
    };

    const toPipe = (c: Canon) =>
        [
            c.cmnd ?? '',
            c.cccd ?? '',
            c.fullName ?? '',
            c.dob ?? '',
            c.gender ?? '',
            c.address ?? '',
            c.issueDate ?? ''
        ].join('|');

    // submit pipeline (with optional index confirmation)
    const [indexDialogOpen, setIndexDialogOpen] = React.useState(false);
    const [pendingNormalized, setPendingNormalized] = React.useState<string | null>(null);
    const [pendingIndexChoice, setPendingIndexChoice] =
        React.useState<PlaceholderIndexChoice>('default');

    // fill vào
    const proceedWithFill = React.useCallback(
        async (normalized: string) => {
            try {
                setScanInput(normalized);

                await onAnalyzeAndFill({
                    normalized,
                    placeholderIndex: selectedPlaceholderIndex,
                    record
                });

                setSnackbar({
                    open: true,
                    message: 'Đã điền vào mẫu từ máy quét.',
                    severity: 'success'
                });
            } catch (e) {
                console.error(e);
                setSnackbar({ open: true, message: 'Điền mẫu thất bại.', severity: 'error' });
            }
        },
        [onAnalyzeAndFill, setScanInput, selectedPlaceholderIndex, record]
    );
    const submitScannerPayload = React.useCallback(async () => {
        const { canon, error } = parseScannerPayload(scanInput);
        if (error) {
            setSnackbar({ open: true, message: String(error), severity: 'warning' });
            return;
        }
        if (!canon) {
            setSnackbar({
                open: true,
                message: 'Không đọc được dữ liệu quét.',
                severity: 'warning'
            });
            return;
        }
        const normalized = toPipe(canon);
        if (typeof onHandheldScan === 'function') {
            try {
                await onHandheldScan(normalized);
                return;
            } catch (e) {
                console.error('onHandheldScan error, fallback local fill:', e);
            }
        }
        await proceedWithFill(normalized);
    }, [scanInput, onHandheldScan, proceedWithFill, setSnackbar]);

    const confirmIndexAndFill = async () => {
        if (pendingIndexChoice !== undefined) {
            updateSelectedIndex(pendingIndexChoice);
        }
        setIndexDialogOpen(false);
        if (pendingNormalized) {
            await proceedWithFill(pendingNormalized);
            setPendingNormalized(null);
        }
    };

    // ===== UI =====
    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                fullWidth
                sx={{
                    '& .MuiDialog-paper': {
                        width: { xs: '100vw', sm: '100vw' },
                        height: { xs: '100vh', sm: '100vh' },
                        maxHeight: { xs: '100vh', sm: '100vh' },
                        maxWidth: { xs: '100vw', sm: '100vw' },
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
                <DialogTitle sx={{ p: 0, m: 0 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            pr: 2,
                            pl: 2
                        }}
                    >
                        <Typography sx={{ pl: 1 }} fontWeight={700}>
                            NTS DocumentAI
                        </Typography>
                        <IconButton onClick={onClose} aria-label="close">
                            <CloseIcon sx={{ fontSize: 24 }} />
                        </IconButton>
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
                            gap: { xs: 0.5, sm: 0.5 },
                            p: { xs: 0.5, sm: 0.5 }
                        }}
                    >
                        {/* Left: Preview */}
                        <Card
                            sx={{
                                position: 'relative',
                                height: { xs: '60%', lg: '100%' },
                                width: { xs: '100%', lg: '75%' },
                                borderRadius: { xs: 1, sm: 1 },
                                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                                background: 'rgba(255,255,255,0.95)',
                                overflow: 'hidden'
                            }}
                        >
                            <Box
                                sx={{
                                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                    borderBottom: '1px solid rgba(0,0,0,0.1)',
                                    p: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <Typography
                                    variant="body1"
                                    sx={{ fontWeight: 700, color: 'primary.main' }}
                                >
                                    Mẫu đơn/tờ khai
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    {onResetDocument && (
                                        <Tooltip title="Làm mới tài liệu về mặc định">
                                            <Button
                                                variant="outlined"
                                                color="secondary"
                                                size="small"
                                                onClick={onResetDocument}
                                                startIcon={<RestartAltIcon />}
                                                sx={{ textTransform: 'none' }}
                                            >
                                                Làm mới dữ liệu
                                            </Button>
                                        </Tooltip>
                                    )}
                                    {onChangeTemplate && (
                                        <Button
                                            variant="outlined"
                                            onClick={onChangeTemplate}
                                            startIcon={<EditIcon />}
                                            sx={{
                                                borderRadius: 1,
                                                textTransform: 'none',
                                                fontWeight: 600
                                            }}
                                        >
                                            Đổi mẫu
                                        </Button>
                                    )}
                                    <Button
                                        variant="outlined"
                                        onClick={onDownloadCurrent}
                                        startIcon={<DownloadIcon />}
                                        disabled={!preview.blob && !preview.url}
                                        sx={{
                                            borderRadius: 1,
                                            textTransform: 'none',
                                            fontWeight: 600
                                        }}
                                    >
                                        Tải xuống
                                    </Button>
                                    {onPrintDocument && (
                                        <Button
                                            variant="outlined"
                                            onClick={onPrintDocument}
                                            disabled={
                                                (!preview.url && !preview.blob) || isGeneratingPrint
                                            }
                                            sx={{
                                                borderRadius: 1,
                                                textTransform: 'none',
                                                fontWeight: 600
                                            }}
                                        >
                                            {isGeneratingPrint
                                                ? 'Đang chuẩn bị PDF…'
                                                : 'Xem bản in PDF'}
                                        </Button>
                                    )}
                                </Box>
                            </Box>
                            <CardContent sx={{ height: '100%', p: 0 }}>
                                {preview.loading && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            inset: 0,
                                            backgroundColor: 'rgba(255,255,255,0.8)',
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
                                {!preview.url && !preview.loading && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            inset: 0,
                                            backgroundColor: 'rgba(245,245,245,0.9)',
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
                                <div id="docviewer-print-root" style={{ height: '100%' }}>
                                    <DocxPreviewArea
                                        url={preview.url || undefined}
                                        blob={preview.blob || undefined}
                                        fileName={preview.fileName}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Right: Scanner & Info */}
                        <Card
                            sx={{
                                width: { xs: '100%', lg: '25%' },
                                height: { xs: '40%', lg: '100%' },
                                borderRadius: { xs: 1, sm: 2 },
                                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                overflow: 'hidden'
                            }}
                        >
                            <CardContent
                                sx={{ p: 1, height: 'calc(100% - 60px)', overflow: 'auto' }}
                            >
                                {/* Input mode header */}
                                <Box sx={{ mb: 3 }}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            gap: 1,
                                            mb: 2,
                                            p: 1,
                                            background: 'rgba(0,0,0,0.05)',
                                            borderRadius: 1
                                        }}
                                    >
                                        <Button
                                            variant={
                                                inputMode === 'ntsoft' ? 'contained' : 'outlined'
                                            }
                                            startIcon={<SmartphoneIcon />}
                                            size="medium"
                                            onClick={() => setInputMode('ntsoft')}
                                            sx={{
                                                flex: 1,
                                                textTransform: 'none',
                                                borderRadius: 1.5,
                                                fontWeight: 600
                                            }}
                                        >
                                            NTSoft AI
                                        </Button>
                                        <Button
                                            variant={
                                                inputMode === 'scanner' ? 'contained' : 'outlined'
                                            }
                                            startIcon={<AdfScannerIcon />}
                                            size="medium"
                                            onClick={() => setInputMode('scanner')}
                                            sx={{
                                                flex: 1,
                                                textTransform: 'none',
                                                borderRadius: 1.5,
                                                fontWeight: 600
                                            }}
                                        >
                                            Scanner
                                        </Button>
                                    </Box>
                                    <Box
                                        sx={{
                                            borderRadius: 1,
                                            p: 2,
                                            border: '1px solid rgba(25,118,210,0.2)'
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'center',
                                                mb: 2
                                            }}
                                        >
                                            <Chip
                                                icon={<WifiIcon sx={{ color: 'white' }} />}
                                                label={
                                                    socketStatus === 'connected'
                                                        ? 'Đã kết nối'
                                                        : socketStatus === 'disabled'
                                                          ? 'Tắt kết nối'
                                                          : socketStatus === 'connecting'
                                                            ? 'Đang kết nối...'
                                                            : 'Mất kết nối'
                                                }
                                                variant="filled"
                                                sx={{
                                                    backgroundColor:
                                                        socketStatus === 'connected'
                                                            ? 'success.main'
                                                            : socketStatus === 'disabled'
                                                              ? 'grey.500'
                                                              : socketStatus === 'connecting'
                                                                ? 'warning.main'
                                                                : 'error.main',
                                                    color: 'white',
                                                    fontWeight: 600
                                                }}
                                            />
                                        </Box>
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography
                                                variant="body1"
                                                sx={{
                                                    mb: 1,
                                                    fontWeight: 600,
                                                    color: 'primary.main'
                                                }}
                                            >
                                                Hướng dẫn sử dụng
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ lineHeight: 1.2, fontStyle: 'italic' }}
                                            >
                                                1. Mở ứng dụng <strong>NTSoft Document AI</strong>
                                                <br />
                                                2. Quét QR code CCCD/CMND
                                                <br />
                                                3. Dữ liệu sẽ tự động điền vào mẫu đơn
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>

                                {/* Scanner Input */}
                                <Box sx={{ mb: 3 }}>
                                    <TextField
                                        multiline
                                        rows={5}
                                        fullWidth
                                        value={scanInput}
                                        onChange={e => setScanInput(e.target.value)}
                                        // onKeyDown={() => handleScanInputKeyDown}
                                        // onPaste={onScannerPaste}
                                        inputRef={scanInputRef}
                                        placeholder="Dán/Quét: cmnd|cccd|Họ tên|Ngày sinh|Giới tính|Địa chỉ|Ngày cấp (có thể kèm dòng header)"
                                        variant="outlined"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 1,
                                                background:
                                                    'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
                                            },
                                            '& .MuiInputBase-input': {
                                                fontSize: '0.9rem',
                                                fontFamily: 'Monaco, "Lucida Console", monospace',
                                                lineHeight: 1.6
                                            }
                                        }}
                                    />
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'flex-end',
                                            mt: 1,
                                            gap: 1
                                        }}
                                    >
                                        <Button variant="outlined" onClick={() => setScanInput('')}>
                                            Xóa
                                        </Button>
                                        <Button
                                            variant="contained"
                                            onClick={() => void submitScannerPayload()}
                                            startIcon={<AdfScannerIcon />}
                                            disabled={!scanInput.trim()}
                                        >
                                            Điền vào mẫu
                                        </Button>
                                    </Box>
                                </Box>

                                {/* Info Section */}
                                <Box sx={{ my: 2 }}>
                                    <Divider
                                        sx={{
                                            borderColor: 'rgba(0,0,0,0.1)',
                                            '&::before, &::after': {
                                                borderColor: 'rgba(0,0,0,0.1)'
                                            }
                                        }}
                                    >
                                        <Chip
                                            label="Thông tin thủ tục"
                                            size="small"
                                            sx={{
                                                backgroundColor: 'primary.main',
                                                color: 'white',
                                                fontWeight: 600
                                            }}
                                        />
                                    </Divider>
                                </Box>
                                <Box>
                                    {[
                                        {
                                            label: 'Lĩnh vực',
                                            value: record?.linhVuc || '— Chưa chọn mẫu —',
                                            subValue: (() => {
                                                if (!record?.linhVuc) return null;
                                                const lv = linhVucList.find(
                                                    x => x.tenLinhVuc === record.linhVuc
                                                );
                                                return lv ? `Mã: ${lv.maLinhVuc}` : null;
                                            })()
                                        },
                                        {
                                            label: 'Tên thủ tục',
                                            value: record?.tenTTHC || '— Chưa chọn mẫu —'
                                        },
                                        {
                                            label: 'Đối tượng thực hiện',
                                            value: mapDoiTuong(record?.doiTuong)
                                        },
                                        {
                                            label: 'Mã thủ tục',
                                            value: record?.maTTHC || '— Chưa chọn mẫu —'
                                        }
                                    ].map((field, idx) => (
                                        <Box
                                            key={idx}
                                            sx={{ display: 'flex', alignItems: 'start', mb: 1 }}
                                        >
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: 'text.secondary',
                                                    minWidth: 160
                                                }}
                                            >
                                                {field.label}:
                                            </Typography>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color:
                                                            field.value &&
                                                            field.value !== '— Chưa chọn mẫu —'
                                                                ? 'text.primary'
                                                                : 'text.disabled',
                                                        fontStyle:
                                                            field.value &&
                                                            field.value !== '— Chưa chọn mẫu —'
                                                                ? 'normal'
                                                                : 'italic'
                                                    }}
                                                >
                                                    {field.value}
                                                </Typography>
                                                {field.subValue && (
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        sx={{ fontStyle: 'italic' }}
                                                    >
                                                        {field.subValue}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>

                                {/* Working docs */}
                                {workingDocs.length > 0 && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography
                                            variant="subtitle2"
                                            sx={{ fontWeight: 700, mb: 1 }}
                                        >
                                            Mẫu đã thiết lập ({workingDocs.length})
                                        </Typography>
                                        {workingDocs.map((wd, idx) => (
                                            <Card
                                                key={idx}
                                                variant="outlined"
                                                sx={{ p: 1.5, mb: 1.5 }}
                                            >
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between'
                                                    }}
                                                >
                                                    <Box>
                                                        <Typography sx={{ fontWeight: 600 }}>
                                                            {wd.fileName}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                        >
                                                            Cập nhật:{' '}
                                                            {new Date(wd.updatedAt).toLocaleString(
                                                                'vi-VN'
                                                            )}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                                        <Button
                                                            variant="outlined"
                                                            onClick={() => onPreviewWorkingDoc(wd)}
                                                        >
                                                            Xem trước
                                                        </Button>
                                                        <Button
                                                            variant="contained"
                                                            startIcon={<DownloadIcon />}
                                                            onClick={() => onDownloadWorkingDoc(wd)}
                                                        >
                                                            Tải bản tùy chỉnh
                                                        </Button>
                                                    </Box>
                                                </Box>
                                            </Card>
                                        ))}
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Box>
                </DialogContent>
            </Dialog>

            {/* Index selection dialog */}
            <Dialog
                open={indexDialogOpen}
                onClose={() => setIndexDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Chọn nhóm placeholder</DialogTitle>
                <DialogContent>
                    {placeholderIndexes.length === 0 ? (
                        <Typography variant="body2">
                            Không có biến thể đánh số. Sẽ dùng mặc định.
                        </Typography>
                    ) : (
                        <FormControl>
                            <RadioGroup
                                value={String(pendingIndexChoice)}
                                onChange={e => {
                                    const v = e.target.value;
                                    setPendingIndexChoice(v === 'default' ? 'default' : Number(v));
                                }}
                            >
                                <FormControlLabel
                                    value={'default'}
                                    control={<Radio />}
                                    label={'Mặc định'}
                                />
                                {placeholderIndexes.map(idx => (
                                    <FormControlLabel
                                        key={idx}
                                        value={String(idx)}
                                        control={<Radio />}
                                        label={`Index _${idx}`}
                                    />
                                ))}
                            </RadioGroup>
                        </FormControl>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIndexDialogOpen(false)}>Hủy</Button>
                    <Button variant="contained" onClick={() => void confirmIndexAndFill()}>
                        Xác nhận
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
        </>
    );
};

export default SyncfusionEditorModal;
