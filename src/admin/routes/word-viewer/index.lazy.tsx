import React, { useEffect, useMemo, useRef, useState } from 'react';

import { renderAsync } from 'docx-preview';

import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Divider,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    TextField,
    Typography
} from '@mui/material';
import { createLazyFileRoute } from '@tanstack/react-router';

import { WordDocumentViewer } from '../../components/WordDocumentViewer';
import documentService, { FieldMapping } from '../../services/documentService';
import wordToImageService from '../../services/wordToImageService';

// Danh sách template có sẵn trong `public/templates/`
const KNOWN_TEMPLATES = [
    '1.TKngkkhaisinh.docx',
    '14. TK đăng ký lại khai sinh.docx',
    '17.TKthaydoicaichinhbosunghotichxadinhlaidantoc.docx',
    '18.TKyeucaubansaotrichluchotich.docx',
    '19.TKcpGiyXNTTHN.docx',
    '3.TKngkkhait.docx',
    '6.TKngknhnCMC.docx',
    'Mẫu số 02_84ND2020.docx',
    'Mẫu số 03_84ND2020.docx',
    'Mauso1hkdGiynghngkhkinhdoanh.docx',
    'MAUSO21.docx',
    'Mus01 ( xác định lại khuyết tật).docx',
    'Mus01 (đề nghị hưởng trợ cấp hưu trí xã hội).docx',
    'Mus01.docx',
    'Mus02.docx',
    'Mus04.docx',
    'Mus1.docx',
    'Mus15DKLD.docx',
    'Mus1a.docx',
    'Mus1b.docx',
    'Mus1c.docx',
    'Mus1d.docx',
    'Phụ lục 03.docx'
];

async function listAvailableTemplates(): Promise<string[]> {
    const results: string[] = [];
    await Promise.all(
        KNOWN_TEMPLATES.map(async name => {
            try {
                const res = await fetch(`/templates/${name}`, { method: 'HEAD' });
                if (res.ok) results.push(name);
            } catch {
                // ignore missing
            }
        })
    );
    return results;
}

function WordViewer(): React.ReactElement {
    const [availableTemplates, setAvailableTemplates] = useState<string[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isRendering, setIsRendering] = useState<boolean>(false);
    const previewRef = useRef<HTMLDivElement>(null);
    const [templateFile, setTemplateFile] = useState<File | null>(null);
    const [templateImageUrl, setTemplateImageUrl] = useState<string | undefined>(undefined);
    const [availableDataFields, setAvailableDataFields] = useState<string[]>([]);
    const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
    const [filledPreviewUrl, setFilledPreviewUrl] = useState<string | null>(null);
    const [isFilling, setIsFilling] = useState<boolean>(false);
    const [scannerInput, setScannerInput] = useState<string>('');
    const [overrideData, setOverrideData] = useState<Record<string, any> | null>(null);
    const [generatedDocxBlob, setGeneratedDocxBlob] = useState<Blob | null>(null);
    const [isGeneratingDocx, setIsGeneratingDocx] = useState<boolean>(false);
    const [isFillingDocxWithMapping, setIsFillingDocxWithMapping] = useState<boolean>(false);

    // Helpers to normalize dates
    const ensureDmy = (s: string): string => {
        if (!s) return '';
        const trimmed = String(s).trim();
        if (trimmed.includes('/')) return trimmed;
        return trimmed; // giữ nguyên nếu scanner đã đúng định dạng
    };
    const getDay = (s: string): string => {
        const v = ensureDmy(s).split('/');
        return v[0] || '';
    };
    const getMonth = (s: string): string => {
        const v = ensureDmy(s).split('/');
        return v[1] || '';
    };
    const getYear = (s: string): string => {
        const v = ensureDmy(s).split('/');
        return v[2] || '';
    };
    const formatDate = (s: string): string => ensureDmy(s);

    // Parse scanner data in format: CCCD|CMND|Họ tên|Ngày sinh|Giới tính|Địa chỉ|Ngày cấp
    const parseScannerData = (data: string): Record<string, any> => {
        const parts = String(data).split('|');
        return {
            so_cccd: parts[0] || '',
            so_cmnd: parts[1] || '',
            ho_ten: parts[2] || '',
            ngay_sinh: formatDate(parts[3] || ''),
            ns_ngay: getDay(parts[3] || ''),
            ns_thang: getMonth(parts[3] || ''),
            ns_nam: getYear(parts[3] || ''),
            gioi_tinh: parts[4] || '',
            noi_cu_tru: parts[5] || '',
            ngay_cap: formatDate(parts[6] || ''),
            nc_ngay: getDay(parts[6] || ''),
            nc_thang: getMonth(parts[6] || ''),
            nc_nam: getYear(parts[6] || '')
        };
    };

    useEffect(() => {
        let isMounted = true;
        (async () => {
            const list = await listAvailableTemplates();
            if (!isMounted) return;
            setAvailableTemplates(list);
            if (list.length > 0) setSelectedTemplate(list[0]);
        })();
        return () => {
            isMounted = false;
        };
    }, []);

    const templatePath = useMemo(() => {
        return selectedTemplate ? `/templates/${selectedTemplate}` : '';
    }, [selectedTemplate]);

    // Render preview whenever template changes
    useEffect(() => {
        const render = async () => {
            if (!templatePath || !previewRef.current) return;
            setIsRendering(true);
            setError(null);
            previewRef.current.innerHTML = '';
            try {
                const res = await fetch(templatePath);
                if (!res.ok) throw new Error('Không thể tải file .docx');
                const buffer = await res.arrayBuffer();
                const blob = new Blob([buffer], {
                    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                });
                // Lưu lại thành File để dùng cho công cụ mapping
                const file = new File([blob], selectedTemplate || 'template.docx', {
                    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                });
                setTemplateFile(file);
                // Chuyển Word -> Image để dùng trong WordDocumentViewer
                try {
                    const imgUrl = await wordToImageService.convertWordToImage(file, {
                        width: 900,
                        height: 1200,
                        scale: 1
                    });
                    setTemplateImageUrl(imgUrl);
                } catch (e) {
                    // Không chặn tính năng preview docx nếu không tạo được image
                    setTemplateImageUrl(undefined);
                }
                await renderAsync(blob, previewRef.current, undefined, {
                    className: 'docx-preview-container'
                });
            } catch (e: any) {
                setError(e?.message || 'Không thể hiển thị tài liệu');
            } finally {
                setIsRendering(false);
            }
        };
        render();
    }, [templatePath]);

    // Load available data fields from extension storage and include required derived keys
    useEffect(() => {
        (async () => {
            try {
                const data = await documentService.getExtensionData();
                const baseKeys = Object.keys(data || {});
                const requiredKeys = [
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
                ];
                const merged = Array.from(new Set([...baseKeys, ...requiredKeys]));
                setAvailableDataFields(merged);
            } catch {
                setAvailableDataFields([]);
            }
        })();
    }, []);

    const handleGenerateFilledPreview = async () => {
        if (!templateImageUrl) return;
        setIsFilling(true);
        try {
            // Lấy dữ liệu hiện có từ extension storage
            const baseData = await documentService.getExtensionData();

            // Chuẩn hóa và bổ sung các alias trường theo yêu cầu
            const data: Record<string, any> = { ...baseData };
            const ngaySinh: string = data.ngay_sinh || data.ngaySinh || '';
            const ngayCap: string = data.ngay_cap || data.ngayCap || '';
            const splitDate = (s: string): [string, string, string] => {
                const parts = String(s).split('/');
                return [parts[0] || '', parts[1] || '', parts[2] || ''];
            };
            if (ngaySinh) {
                const [d, m, y] = splitDate(ngaySinh);
                data.ns_ngay = d;
                data.ns_thang = m;
                data.ns_nam = y;
            }
            if (ngayCap) {
                const [d, m, y] = splitDate(ngayCap);
                data.nc_ngay = d;
                data.nc_thang = m;
                data.nc_nam = y;
            }
            // Chuẩn hóa số giấy tờ
            data.so_cccd = data.so_cccd || data.cccd || data.so_CCCD || '';
            data.so_cmnd = data.so_cmnd || data.cmnd || data.so_CMND || '';
            data.ho_ten = data.ho_ten || data.hoTen || data.ten || '';
            data.noi_cu_tru = data.noi_cu_tru || data.dia_chi || data.diaChi || '';

            // Tải ảnh nền
            const baseImage = await new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = templateImageUrl;
            });

            const canvas = document.createElement('canvas');
            canvas.width = baseImage.width;
            canvas.height = baseImage.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas context not available');

            // Vẽ nền
            ctx.drawImage(baseImage, 0, 0);

            // Vẽ dữ liệu vào các vùng mapping
            ctx.font = '14px Arial';
            ctx.fillStyle = '#000000';
            ctx.textBaseline = 'top';

            fieldMappings.forEach(mapping => {
                const value = (data as any)[mapping.dataKey];
                if (value === undefined || value === null) return;

                // Nền mờ để chữ dễ đọc
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.fillRect(mapping.x, mapping.y, mapping.width, mapping.height);

                ctx.fillStyle = '#000';
                const text = String(value);

                // Cắt text nếu quá dài cho vùng
                const padding = 4;
                const maxWidth = Math.max(10, mapping.width - padding * 2);
                const words = text.split(' ');
                let line = '';
                let y = mapping.y + padding;
                const lineHeight = 18;
                for (let i = 0; i < words.length; i++) {
                    const testLine = line ? `${line} ${words[i]}` : words[i];
                    const metrics = ctx.measureText(testLine);
                    if (metrics.width > maxWidth && line) {
                        ctx.fillText(line, mapping.x + padding, y, maxWidth);
                        line = words[i];
                        y += lineHeight;
                        if (y > mapping.y + mapping.height - lineHeight) break;
                    } else {
                        line = testLine;
                    }
                }
                if (y <= mapping.y + mapping.height - lineHeight) {
                    ctx.fillText(line, mapping.x + padding, y, maxWidth);
                }
            });

            setFilledPreviewUrl(canvas.toDataURL('image/png'));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không thể tạo preview đã điền');
        } finally {
            setIsFilling(false);
        }
    };

    const handleFillDocxWithMapping = async () => {
        if (!templateFile || fieldMappings.length === 0) return;
        try {
            setIsFillingDocxWithMapping(true);
            // Lấy dữ liệu: ưu tiên overrideData từ scanner, fallback extension storage
            const base = overrideData || (await documentService.getExtensionData());

            // Chuẩn hóa alias giống logic ở preview ảnh
            const normalized: Record<string, any> = { ...base };
            const ngaySinh: string = normalized.ngay_sinh || normalized.ngaySinh || '';
            const ngayCap: string = normalized.ngay_cap || normalized.ngayCap || '';
            const splitDate = (s: string): [string, string, string] => {
                const parts = String(s).split('/');
                return [parts[0] || '', parts[1] || '', parts[2] || ''];
            };
            if (ngaySinh) {
                const [d, m, y] = splitDate(ngaySinh);
                normalized.ns_ngay = d;
                normalized.ns_thang = m;
                normalized.ns_nam = y;
            }
            if (ngayCap) {
                const [d, m, y] = splitDate(ngayCap);
                normalized.nc_ngay = d;
                normalized.nc_thang = m;
                normalized.nc_nam = y;
            }
            normalized.so_cccd = normalized.so_cccd || normalized.cccd || '';
            normalized.so_cmnd = normalized.so_cmnd || normalized.cmnd || '';
            normalized.ho_ten = normalized.ho_ten || normalized.hoTen || '';
            normalized.noi_cu_tru =
                normalized.noi_cu_tru || normalized.dia_chi || normalized.diaChi || '';

            // Tạo mappedData theo fieldMappings: fieldName là placeholder trong docx, dataKey là key dữ liệu
            const mappedData: Record<string, any> = {};
            fieldMappings.forEach(m => {
                const val = normalized[m.dataKey];
                if (val !== undefined) {
                    mappedData[m.fieldName] = val;
                }
            });

            const templateId = 'word-viewer-mapped';
            await documentService.loadTemplate(templateId, templateFile);
            const blob = await documentService.generateDocument(templateId, mappedData);
            setGeneratedDocxBlob(blob);

            // Render preview
            if (previewRef.current) {
                previewRef.current.innerHTML = '';
                await renderAsync(blob, previewRef.current, undefined, {
                    className: 'docx-preview-container'
                });
            }
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : 'Không thể điền tài liệu theo mapping (kiểm tra placeholders)'
            );
        } finally {
            setIsFillingDocxWithMapping(false);
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                Xem Word trên màn hình
            </Typography>
            <Card sx={{ mb: 2 }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, md: 6 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Chọn mẫu trong hệ thống</InputLabel>
                                <Select
                                    value={selectedTemplate}
                                    label="Chọn mẫu trong hệ thống"
                                    onChange={e => setSelectedTemplate(e.target.value)}
                                >
                                    {availableTemplates.map(t => (
                                        <MenuItem key={t} value={t}>
                                            {t}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid
                            size={{ xs: 12, md: 6 }}
                            sx={{
                                display: 'flex',
                                gap: 1,
                                justifyContent: { xs: 'flex-start', md: 'flex-end' }
                            }}
                        >
                            <Button
                                variant="outlined"
                                onClick={async () => {
                                    if (!previewRef.current) return;
                                    // Force re-render current template
                                    setSelectedTemplate(s => s);
                                }}
                            >
                                Làm mới
                            </Button>
                            <Button
                                variant="contained"
                                disabled={
                                    !templateImageUrl || fieldMappings.length === 0 || isFilling
                                }
                                onClick={handleGenerateFilledPreview}
                            >
                                Tạo preview đã điền
                            </Button>
                            <Button
                                variant="contained"
                                color="secondary"
                                disabled={fieldMappings.length === 0 || isFillingDocxWithMapping}
                                onClick={handleFillDocxWithMapping}
                            >
                                Điền DOCX theo mapping
                            </Button>
                            <Button
                                variant="outlined"
                                disabled={!generatedDocxBlob}
                                onClick={() => {
                                    if (!generatedDocxBlob) return;
                                    documentService.downloadDocument(
                                        generatedDocxBlob,
                                        'tai_lieu_da_dien.docx'
                                    );
                                }}
                            >
                                Tải DOCX
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Paper
                variant="outlined"
                sx={{ p: 2, minHeight: '70vh', bgcolor: 'grey.50', position: 'relative' }}
            >
                {isRendering && (
                    <Box sx={{ position: 'absolute', top: 8, right: 12 }}>
                        <Typography variant="body2" color="text.secondary">
                            Đang tải...
                        </Typography>
                    </Box>
                )}
                <div ref={previewRef} className="docx-preview-container" />
            </Paper>
            <Divider sx={{ mt: 2 }} />

            {/* Kênh nhập từ máy quét (scanner) + điền vào template với placeholders {} */}
            {templateFile && (
                <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Dữ liệu từ máy quét → điền vào placeholders {`{}`}
                    </Typography>
                    <Card sx={{ mb: 2 }}>
                        <CardContent>
                            <Grid container spacing={2} alignItems="center">
                                <Grid size={{ xs: 12, md: 8 }}>
                                    <TextField
                                        fullWidth
                                        label="Dữ liệu scanner (CCCD|CMND|Họ tên|Ngày sinh|Giới tính|Địa chỉ|Ngày cấp)"
                                        value={scannerInput}
                                        onChange={e => setScannerInput(e.target.value)}
                                        size="small"
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                        variant="outlined"
                                        onClick={() => {
                                            const parsed = parseScannerData(scannerInput.trim());
                                            setOverrideData(parsed);
                                        }}
                                    >
                                        Phân tích dữ liệu
                                    </Button>
                                    <Button
                                        variant="contained"
                                        disabled={!overrideData}
                                        onClick={async () => {
                                            if (!templateFile || !overrideData) return;
                                            try {
                                                setIsGeneratingDocx(true);
                                                // Tạo blob docx từ template + dữ liệu theo placeholders {}
                                                const templateId = 'word-viewer-inline';
                                                await documentService.loadTemplate(
                                                    templateId,
                                                    templateFile
                                                );
                                                const blob = await documentService.generateDocument(
                                                    templateId,
                                                    overrideData
                                                );
                                                setGeneratedDocxBlob(blob);
                                                // Hiển thị preview docx mới
                                                if (previewRef.current) {
                                                    previewRef.current.innerHTML = '';
                                                    await renderAsync(
                                                        blob,
                                                        previewRef.current,
                                                        undefined,
                                                        {
                                                            className: 'docx-preview-container'
                                                        }
                                                    );
                                                }
                                            } catch (e) {
                                                setError(
                                                    e instanceof Error
                                                        ? e.message
                                                        : 'Không thể tạo tài liệu đã điền'
                                                );
                                            } finally {
                                                setIsGeneratingDocx(false);
                                            }
                                        }}
                                    >
                                        Điền vào placeholders
                                    </Button>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    {overrideData && (
                        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Dữ liệu đã phân tích từ scanner
                            </Typography>
                            <Box
                                component="pre"
                                sx={{
                                    m: 0,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    fontFamily: 'monospace',
                                    fontSize: '0.8rem',
                                    bgcolor: 'grey.50',
                                    p: 1,
                                    borderRadius: 1
                                }}
                            >
                                {JSON.stringify(overrideData, null, 2)}
                            </Box>
                        </Paper>
                    )}

                    {generatedDocxBlob && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                variant="outlined"
                                onClick={() => {
                                    if (!generatedDocxBlob) return;
                                    documentService.downloadDocument(
                                        generatedDocxBlob,
                                        'tai_lieu_da_dien.docx'
                                    );
                                }}
                                disabled={isGeneratingDocx}
                            >
                                Tải file đã điền
                            </Button>
                        </Box>
                    )}
                </Box>
            )}

            {/* Khu vực mapping trực quan */}
            {templateFile && templateImageUrl && (
                <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Chế độ chèn dữ liệu trực quan (kéo chọn vùng)
                    </Typography>
                    <Paper sx={{ p: 2 }}>
                        <WordDocumentViewer
                            documentFile={templateFile}
                            documentImageUrl={templateImageUrl}
                            availableDataFields={availableDataFields}
                            onFieldMappingChange={setFieldMappings}
                            initialMappings={fieldMappings}
                        />
                    </Paper>

                    {filledPreviewUrl && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Preview sau khi điền
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                                <img
                                    src={filledPreviewUrl}
                                    alt="Filled preview"
                                    style={{ maxWidth: '100%' }}
                                />
                            </Paper>
                            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => {
                                        if (!filledPreviewUrl) return;
                                        const a = document.createElement('a');
                                        a.href = filledPreviewUrl;
                                        a.download = 'preview_da_dien.png';
                                        a.click();
                                    }}
                                >
                                    Tải ảnh preview
                                </Button>
                            </Box>
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );
}

export const Route = createLazyFileRoute('/word-viewer/')({
    component: WordViewer
});
