import React, { useCallback, useRef, useState } from 'react';

// --- ICON ---
import {
    Close,
    Download,
    Edit as EditIcon,
    Info as InfoIcon,
    Print as PrintIcon,
    RestartAlt as RestartAltIcon
} from '@mui/icons-material';
import AdfScannerIcon from '@mui/icons-material/AdfScanner';
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
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Snackbar,
    TextField,
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
import { DocumentEditorContainerComponent } from '@syncfusion/ej2-react-documenteditor';
import '@syncfusion/ej2-react-documenteditor/styles/material.css';
import '@syncfusion/ej2-splitbuttons/styles/material.css';

import { ConfigConstant } from '@/admin/constant/config.constant';
import { WorkingDocument } from '@/admin/db/db';
import { LinhVuc } from '@/admin/services/linhVucService';
import { getCurrentDateParts } from '@/admin/utils/formatDate';

// Types
interface MauDon {
    tenGiayTo: string | null;
    tenFile: string;
    duongDan: string;
    isFromIndexedDB?: boolean;
    workingDocument?: WorkingDocument;
    isApiTemplate?: boolean;
    duongDanTepDinhKem?: string;
    tenThanhPhan?: string;
    soBanChinh?: string;
    soBanSao?: string;
    ghiChu?: string | null;
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

interface ProcessingData {
    [key: string]: any;
}

interface TemplateEditorState {
    selectedRecord: EnhancedTTHCRecord | null;
    showEditorModal: boolean;
    syncfusionLoading: boolean;
    syncfusionDocumentReady: boolean;
    socketStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
}

interface ScanState {
    inputMode: 'ntsoft' | 'scanner';
    inputText: string;
    extractedData: ProcessingData | null;
    isProcessing: boolean;
}

interface TargetState {
    availableTargets: string[];
    selectedTarget: string;
    usedTargets: string[];
    originalSfdt: string | null;
}

interface SyncfusionEditorModalProps {
    editorState: TemplateEditorState;
    scanState: ScanState;
    targetState: TargetState;
    linhVucList: LinhVuc[];
    socketStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
    onClose: () => void;
    onDownload: () => void;
    onPrint: () => void;
    onTargetChange: (target: string) => void;
    onInputModeChange: (mode: 'ntsoft' | 'scanner') => void;
    onInputTextChange: (text: string) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onTemplateSelectionOpen: () => void;
    onResetDocument: () => void;
    sfContainerRef: React.RefObject<DocumentEditorContainerComponent | null>;
}

export const SyncfusionEditorModal: React.FC<SyncfusionEditorModalProps> = ({
    editorState,
    scanState,
    targetState,
    linhVucList,
    socketStatus,
    onClose,
    onDownload,
    onPrint,
    onTargetChange,
    onInputModeChange,
    onInputTextChange,
    onKeyDown,
    onTemplateSelectionOpen,
    onResetDocument,
    sfContainerRef
}) => {
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'info' | 'warning';
    }>({
        open: false,
        message: '',
        severity: 'info'
    });

    const handleSnackbarClose = useCallback(() => {
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);

    return (
        <>
            <Dialog
                open={editorState.showEditorModal}
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
                <DialogTitle style={{ padding: 0, margin: 0 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingRight: 2,
                            paddingLeft: 2
                        }}
                    >
                        <Typography style={{ paddingLeft: 10 }} fontWeight={'bold'}>
                            NTS DocumentAI
                        </Typography>
                        <Box>
                            <IconButton onClick={onClose}>
                                <Close style={{ fontSize: 24 }} />
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
                            gap: { xs: 0.5, sm: 0.5 },
                            p: { xs: 0.5, sm: 0.5 }
                        }}
                    >
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
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography
                                        variant="body1"
                                        sx={{ fontWeight: 700, color: 'primary.main' }}
                                    >
                                        Mẫu đơn/tờ khai
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1 }}>
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
                                    <Button
                                        variant="outlined"
                                        onClick={onTemplateSelectionOpen}
                                        startIcon={<EditIcon />}
                                        sx={{
                                            borderRadius: 1,
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            '&:hover': {
                                                transform: 'translateY(-2px)',
                                                boxShadow: '0 4px 12px rgba(25,118,210,0.3)'
                                            },
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        Đổi mẫu
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        onClick={onDownload}
                                        startIcon={<Download />}
                                        disabled={!editorState.syncfusionDocumentReady}
                                        sx={{
                                            borderRadius: 1,
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            '&:hover': {
                                                transform: 'translateY(-2px)',
                                                boxShadow: '0 4px 12px rgba(25,118,210,0.3)'
                                            },
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        Tải xuống
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        onClick={onPrint}
                                        startIcon={<PrintIcon />}
                                        disabled={!editorState.syncfusionDocumentReady}
                                        sx={{
                                            borderRadius: 1,
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            '&:hover': {
                                                transform: 'translateY(-2px)',
                                                boxShadow: '0 4px 12px rgba(25,118,210,0.3)'
                                            },
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        In
                                    </Button>
                                    {/* Chọn đối tượng */}
                                    <FormControl size="small" sx={{ maxWidth: 120, minWidth: 120 }}>
                                        <InputLabel>Đối tượng</InputLabel>
                                        <Select
                                            size="small"
                                            value={targetState.selectedTarget}
                                            label="Đối tượng"
                                            variant="outlined"
                                            color="primary"
                                            onChange={e => onTargetChange(e.target.value)}
                                            disabled={targetState.availableTargets.length === 0}
                                        >
                                            <MenuItem value="">
                                                <em>Mặc định</em>
                                            </MenuItem>
                                            {targetState.availableTargets.map(target => (
                                                <MenuItem key={target} value={target}>
                                                    Đối tượng {target} (_{target})
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>
                            </Box>
                            <CardContent sx={{ height: '100%' }}>
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
                                    serviceUrl={ConfigConstant.SYNCFUSION_SERVICE_URL}
                                    enableToolbar={false}
                                    showPropertiesPane={false}
                                    height={'100%'}
                                    fileMenuItems={['Print']}
                                    enableLocalPaste={true}
                                />
                            </CardContent>
                        </Card>
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
                                <Box sx={{ mb: 4 }}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            gap: 1,
                                            mb: 3,
                                            p: 1,
                                            background: 'rgba(0,0,0,0.05)',
                                            borderRadius: 1
                                        }}
                                    >
                                        <Button
                                            variant={
                                                scanState.inputMode === 'ntsoft'
                                                    ? 'contained'
                                                    : 'outlined'
                                            }
                                            startIcon={<SmartphoneIcon />}
                                            size="medium"
                                            sx={{
                                                flex: 1,
                                                textTransform: 'none',
                                                borderRadius: 1.5,
                                                fontWeight: 600,
                                                ...(scanState.inputMode === 'ntsoft' && {
                                                    background:
                                                        'linear-gradient(45deg, #1976d2, #42a5f5)',
                                                    boxShadow: '0 4px 15px rgba(25,118,210,0.4)'
                                                })
                                            }}
                                            onClick={() => onInputModeChange('ntsoft')}
                                        >
                                            NTSoft AI
                                        </Button>
                                        <Button
                                            variant={
                                                scanState.inputMode === 'scanner'
                                                    ? 'contained'
                                                    : 'outlined'
                                            }
                                            startIcon={<AdfScannerIcon />}
                                            size="medium"
                                            sx={{
                                                flex: 1,
                                                textTransform: 'none',
                                                borderRadius: 1.5,
                                                fontWeight: 600,
                                                ...(scanState.inputMode === 'scanner' && {
                                                    background:
                                                        'linear-gradient(45deg, #9c27b0, #e91e63)',
                                                    boxShadow: '0 4px 15px rgba(156,39,176,0.4)'
                                                })
                                            }}
                                            onClick={() => onInputModeChange('scanner')}
                                        >
                                            Scanner
                                        </Button>
                                    </Box>
                                    {scanState.inputMode !== 'scanner' ? (
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
                                                    icon={<WifiIcon style={{ color: 'white' }} />}
                                                    label={
                                                        socketStatus === 'connected'
                                                            ? 'Đã kết nối'
                                                            : 'Mất kết nối'
                                                    }
                                                    variant="filled"
                                                    sx={{
                                                        backgroundColor:
                                                            socketStatus === 'connected'
                                                                ? 'success.main'
                                                                : 'error.main',
                                                        color: 'white',
                                                        fontWeight: 600,
                                                        animation:
                                                            socketStatus === 'connected'
                                                                ? 'pulse 2s infinite'
                                                                : 'none'
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
                                                    sx={{
                                                        lineHeight: 1.2,
                                                        fontStyle: 'italic'
                                                    }}
                                                >
                                                    1. Mở ứng dụng{' '}
                                                    <strong>NTSoft Document AI</strong>
                                                    <br />
                                                    2. Quét QR code CCCD/CMND
                                                    <br />
                                                    3. Dữ liệu sẽ tự động điền vào mẫu đơn
                                                </Typography>
                                            </Box>
                                        </Box>
                                    ) : (
                                        <Box
                                            sx={{
                                                borderRadius: 1,
                                                p: 2,
                                                border: '1px solid rgba(156,39,176,0.2)'
                                            }}
                                        >
                                            <Box sx={{ textAlign: 'center', mb: 2 }}>
                                                <Typography
                                                    variant="body1"
                                                    sx={{
                                                        fontWeight: 600,
                                                        color: 'secondary.main'
                                                    }}
                                                >
                                                    Hướng dẫn sử dụng
                                                </Typography>
                                            </Box>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{
                                                    lineHeight: 1.6,
                                                    fontStyle: 'italic',
                                                    textAlign: 'center'
                                                }}
                                            >
                                                1. Đặt con trỏ vào ô nhập liệu
                                                <br />
                                                2. Kết nối máy quét và quét
                                                <br />
                                                3. <strong>Dữ liệu</strong> sẽ tự động chèn vào
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                                {/* Input Section */}
                                {scanState.inputMode === 'scanner' && (
                                    <>
                                        <Box sx={{ mb: 4 }}>
                                            <TextField
                                                autoFocus
                                                multiline
                                                rows={5}
                                                fullWidth
                                                value={scanState.inputText}
                                                onKeyDown={onKeyDown}
                                                onChange={(
                                                    e: React.ChangeEvent<HTMLInputElement>
                                                ) => onInputTextChange(e.target.value)}
                                                placeholder=""
                                                variant="outlined"
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 1,
                                                        background:
                                                            'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
                                                    },
                                                    '& .MuiInputBase-input': {
                                                        fontSize: '0.9rem',
                                                        fontFamily:
                                                            'Monaco, "Lucida Console", monospace',
                                                        lineHeight: 1.6
                                                    }
                                                }}
                                            />
                                        </Box>
                                    </>
                                )}
                                <Box sx={{ my: 3 }}>
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
                                {/* Thông tin thủ tục Section */}
                                <Box>
                                    {[
                                        {
                                            label: 'Lĩnh vực',
                                            value:
                                                editorState.selectedRecord?.linhVuc ||
                                                '— Chưa chọn mẫu —',
                                            subValue: (() => {
                                                if (!editorState.selectedRecord?.linhVuc)
                                                    return null;
                                                const linhVuc = linhVucList.find(
                                                    lv =>
                                                        lv.tenLinhVuc ===
                                                        editorState.selectedRecord?.linhVuc
                                                );
                                                return linhVuc ? `Mã: ${linhVuc.maLinhVuc}` : null;
                                            })()
                                        },
                                        {
                                            label: 'Tên thủ tục',
                                            value:
                                                editorState.selectedRecord?.tenTTHC ||
                                                '— Chưa chọn mẫu —'
                                        },
                                        {
                                            label: 'Đối tượng thực hiện',
                                            value:
                                                editorState.selectedRecord?.doiTuong ||
                                                '— Chưa chọn mẫu —'
                                        },
                                        {
                                            label: 'Mã thủ tục',
                                            value:
                                                editorState.selectedRecord?.maTTHC ||
                                                '— Chưa chọn mẫu —'
                                        },
                                        {
                                            label: 'Cấp thực hiện',
                                            value:
                                                editorState.selectedRecord?.capThucHien ||
                                                '— Chưa chọn mẫu —'
                                        },
                                        {
                                            label: 'Quyết định công bố',
                                            value:
                                                editorState.selectedRecord?.qdCongBo ||
                                                '— Chưa chọn mẫu —'
                                        }
                                    ].map((field, index) => (
                                        <Box
                                            key={index}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'start',
                                                mb: 1
                                            }}
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
                            </CardContent>
                        </Card>
                    </Box>
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
        </>
    );
};
