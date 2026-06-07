import { ReactElement, useEffect, useMemo, useState } from 'react';

import { useSnackbar } from 'notistack';

import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    IconButton,
    TextField,
    Typography
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { createLazyFileRoute } from '@tanstack/react-router';

import {
    TemplateSpecialFieldSetting,
    templateSpecialFieldsService
} from '@/admin/services/templateSpecialFieldsService';

interface SpecialFieldFormRow {
    id: string;
    placeholder: string;
    value: string;
    note: string;
}

const DEFAULT_SPECIAL_FIELDS: Array<Omit<SpecialFieldFormRow, 'id'>> = [
    { placeholder: 'ten_don_vi', value: '', note: 'Tên đơn vị' },
    { placeholder: 'noi_dang_ky', value: '....................', note: 'Nơi đăng ký' },
    { placeholder: 'dan_toc', value: '', note: 'Dân tộc' },
    { placeholder: 'quoc_tich', value: '', note: 'Quốc tịch' }
];

const genId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `sf-${crypto.randomUUID()}`;
    return `sf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizePlaceholder = (raw: string) => {
    let s = raw.trim();
    // cho phép user paste "{key}" -> tự loại bỏ ngoặc
    if (s.startsWith('{') && s.endsWith('}')) s = s.slice(1, -1).trim();
    return s;
};

const createSpecialFieldRow = (
    initial?: Partial<Omit<SpecialFieldFormRow, 'id'>>
): SpecialFieldFormRow => ({
    id: genId(),
    placeholder: initial?.placeholder ?? '',
    value: initial?.value ?? '',
    note: initial?.note ?? ''
});

const mergeWithDefaults = (stored: TemplateSpecialFieldSetting[]) => {
    const map = new Map<string, TemplateSpecialFieldSetting>();

    // defaults trước
    for (const d of DEFAULT_SPECIAL_FIELDS) {
        const key = normalizePlaceholder(d.placeholder);
        if (!key) continue;
        map.set(key, {
            placeholder: key,
            value: d.value ?? '',
            note: d.note?.trim()
        });
    }

    // stored đè lên defaults
    for (const s of stored) {
        const key = normalizePlaceholder(s.placeholder);
        if (!key) continue;
        map.set(key, {
            placeholder: key,
            value: s.value ?? '',
            note: s.note?.trim()
        });
    }

    return Array.from(map.values());
};

function Settings(): ReactElement {
    const [specialFields, setSpecialFields] = useState<SpecialFieldFormRow[]>([
        createSpecialFieldRow()
    ]);
    const [specialFieldsDirty, setSpecialFieldsDirty] = useState(false);
    const [specialFieldsSaved, setSpecialFieldsSaved] = useState(false);

    useEffect(() => {
        const stored = templateSpecialFieldsService.load();
        const merged = mergeWithDefaults(stored);

        setSpecialFields(
            merged.length > 0
                ? merged.map(f =>
                      createSpecialFieldRow({
                          placeholder: f.placeholder,
                          value: f.value,
                          note: f.note ?? ''
                      })
                  )
                : DEFAULT_SPECIAL_FIELDS.length > 0
                  ? DEFAULT_SPECIAL_FIELDS.map(d =>
                        createSpecialFieldRow({
                            placeholder: normalizePlaceholder(d.placeholder),
                            value: d.value,
                            note: d.note
                        })
                    )
                  : [createSpecialFieldRow()]
        );

        setSpecialFieldsDirty(false);
        setSpecialFieldsSaved(false);
    }, []);

    const markSpecialFieldsDirty = () => {
        setSpecialFieldsDirty(true);
        setSpecialFieldsSaved(false);
    };

    const handleSpecialFieldChange = (
        id: string,
        key: keyof Omit<SpecialFieldFormRow, 'id'>,
        value: string
    ) => {
        setSpecialFields(prev =>
            prev.map(field =>
                field.id === id
                    ? {
                          ...field,
                          [key]: key === 'placeholder' ? value : value
                      }
                    : field
            )
        );
        markSpecialFieldsDirty();
    };

    const handleAddSpecialField = () => {
        setSpecialFields(prev => [...prev, createSpecialFieldRow()]);
        markSpecialFieldsDirty();
    };

    const handleRemoveSpecialField = (id: string) => {
        setSpecialFields(prev => {
            const next = prev.filter(field => field.id !== id);
            return next.length > 0 ? next : [createSpecialFieldRow()];
        });
        markSpecialFieldsDirty();
    };

    const hasInvalidPlaceholder = useMemo(() => {
        return specialFields.some(f => !normalizePlaceholder(f.placeholder));
    }, [specialFields]);

    const handleSaveSpecialFields = () => {
        const payload: TemplateSpecialFieldSetting[] = specialFields
            .map(field => ({
                placeholder: normalizePlaceholder(field.placeholder),
                value: field.value,
                note: field.note.trim()
            }))
            .filter(field => field.placeholder.length > 0)
            .map(field =>
                field.note
                    ? { placeholder: field.placeholder, value: field.value, note: field.note }
                    : { placeholder: field.placeholder, value: field.value }
            );

        templateSpecialFieldsService.save(payload);
        setSpecialFieldsDirty(false);
        setSpecialFieldsSaved(true);
        window.setTimeout(() => setSpecialFieldsSaved(false), 3000);
    };

    const { enqueueSnackbar } = useSnackbar();

    const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = event => {
            try {
                const parsed = JSON.parse(event.target?.result as string);
                if (!Array.isArray(parsed)) {
                    throw new Error('Định dạng tệp không hợp lệ. Phải là một mảng JSON.');
                }

                const newRows: SpecialFieldFormRow[] = [];
                for (const item of parsed) {
                    if (typeof item === 'object' && item !== null) {
                        const placeholder = normalizePlaceholder(
                            item.placeholder || item.key || ''
                        );
                        if (placeholder) {
                            newRows.push(
                                createSpecialFieldRow({
                                    placeholder,
                                    value: String(item.value ?? ''),
                                    note: String(item.note ?? '')
                                })
                            );
                        }
                    }
                }

                if (newRows.length === 0) {
                    enqueueSnackbar('Không tìm thấy trường đặc biệt hợp lệ nào trong tệp.', {
                        variant: 'warning'
                    });
                    return;
                }

                setSpecialFields(prev => {
                    const merged = [...prev];
                    newRows.forEach(newRow => {
                        const existingIdx = merged.findIndex(
                            r =>
                                normalizePlaceholder(r.placeholder) ===
                                normalizePlaceholder(newRow.placeholder)
                        );
                        if (existingIdx >= 0) {
                            merged[existingIdx] = {
                                ...merged[existingIdx],
                                value: newRow.value,
                                note: newRow.note || merged[existingIdx].note
                            };
                        } else {
                            merged.push(newRow);
                        }
                    });

                    // Remove initial empty row if it's untouched
                    if (
                        merged.length > 1 &&
                        merged[0].placeholder === '' &&
                        merged[0].value === ''
                    ) {
                        merged.shift();
                    }
                    return merged;
                });

                enqueueSnackbar(`Đã nhập thành công ${newRows.length} trường đặc biệt.`, {
                    variant: 'success'
                });
                setSpecialFieldsDirty(true);
            } catch (err: any) {
                enqueueSnackbar(err?.message || 'Có lỗi xảy ra khi đọc tệp JSON.', {
                    variant: 'error'
                });
            } finally {
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleExportJSON = () => {
        const payload = specialFields
            .map(field => ({
                placeholder: normalizePlaceholder(field.placeholder),
                value: field.value,
                note: field.note.trim()
            }))
            .filter(field => field.placeholder.length > 0);

        if (payload.length === 0) {
            enqueueSnackbar('Không có trường đặc biệt nào để xuất.', { variant: 'warning' });
            return;
        }

        const dataStr =
            'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', 'truong_dac_biet.json');
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();

        enqueueSnackbar('Đã xuất thành công tệp JSON.', { variant: 'success' });
    };

    const cardBaseSx = {
        boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)',
        backdropFilter: 'blur(8px)',
        background: 'rgba(255,255,255,0.97)',
        border: '1px solid rgba(15,23,42,0.06)'
    };

    return (
        <Box
            sx={{
                width: '100%',
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #eef2ff 0%, #f8fbff 35%, #ffffff 100%)'
            }}
        >
            <Box
                sx={{
                    maxWidth: '100%',
                    mx: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2.5
                }}
            >
                <Grid spacing={2}>
                    <Grid>
                        <Card sx={cardBaseSx}>
                            <CardHeader
                                title="Trường đặc biệt trong mẫu"
                                subheader="Hệ thống sẽ tự bổ sung các giá trị này vào placeholder tương ứng"
                                sx={{
                                    '& .MuiCardHeader-title': { fontSize: 20, fontWeight: 500 },
                                    '& .MuiCardHeader-subheader': { fontSize: 14 }
                                }}
                            />
                            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {specialFieldsSaved && (
                                    <Alert severity="success" sx={{ borderRadius: 1 }}>
                                        Đã lưu thiết lập trường đặc biệt.
                                    </Alert>
                                )}

                                {specialFieldsDirty && hasInvalidPlaceholder && (
                                    <Alert severity="warning" sx={{ borderRadius: 1 }}>
                                        Có placeholder đang để trống. Vui lòng nhập đầy đủ trước khi
                                        lưu.
                                    </Alert>
                                )}

                                {specialFields.map(field => {
                                    const placeholderError =
                                        specialFieldsDirty &&
                                        !normalizePlaceholder(field.placeholder);

                                    return (
                                        <Box
                                            key={field.id}
                                            sx={{
                                                border: '1px dashed rgba(15,23,42,0.1)',
                                                borderRadius: 1.5,
                                                p: 2,
                                                display: 'flex',
                                                flexDirection: { xs: 'column', md: 'row' },
                                                gap: 1.5,
                                                backgroundColor: 'rgba(248,250,252,0.8)'
                                            }}
                                        >
                                            <TextField
                                                label="Tên placeholder"
                                                placeholder="Ví dụ: co_quan_giai_quyet"
                                                value={field.placeholder}
                                                onChange={e =>
                                                    handleSpecialFieldChange(
                                                        field.id,
                                                        'placeholder',
                                                        e.target.value
                                                    )
                                                }
                                                required
                                                error={placeholderError}
                                                helperText={
                                                    placeholderError
                                                        ? 'Nhập tên placeholder (không có dấu ngoặc nhọn)'
                                                        : undefined
                                                }
                                                sx={{ flex: 1 }}
                                            />

                                            <TextField
                                                label="Giá trị mặc định"
                                                placeholder="Nhập nội dung sẽ chèn vào mẫu"
                                                multiline
                                                minRows={1}
                                                value={field.value}
                                                onChange={e =>
                                                    handleSpecialFieldChange(
                                                        field.id,
                                                        'value',
                                                        e.target.value
                                                    )
                                                }
                                                sx={{ flex: 1 }}
                                            />

                                            <TextField
                                                label="Ghi chú (tuỳ chọn)"
                                                placeholder="Mô tả ngắn để dễ nhớ"
                                                value={field.note}
                                                onChange={e =>
                                                    handleSpecialFieldChange(
                                                        field.id,
                                                        'note',
                                                        e.target.value
                                                    )
                                                }
                                                sx={{ flex: 1 }}
                                            />

                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <IconButton
                                                    aria-label="Xoá trường"
                                                    onClick={() =>
                                                        handleRemoveSpecialField(field.id)
                                                    }
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Box>
                                        </Box>
                                    );
                                })}

                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Button
                                        variant="outlined"
                                        startIcon={<AddCircleOutlineIcon />}
                                        onClick={handleAddSpecialField}
                                    >
                                        Thêm trường
                                    </Button>

                                    <Button
                                        variant="outlined"
                                        component="label"
                                        startIcon={<UploadIcon />}
                                    >
                                        Nhập
                                        <input
                                            type="file"
                                            accept=".json"
                                            hidden
                                            onChange={handleImportJSON}
                                        />
                                    </Button>

                                    <Button
                                        variant="outlined"
                                        startIcon={<DownloadIcon />}
                                        onClick={handleExportJSON}
                                    >
                                        Xuất
                                    </Button>

                                    <Box sx={{ flexGrow: 1 }} />

                                    <Button
                                        variant="contained"
                                        onClick={handleSaveSpecialFields}
                                        disabled={!specialFieldsDirty || hasInvalidPlaceholder}
                                    >
                                        Lưu trường đặc biệt
                                    </Button>
                                </Box>

                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ mt: -1 }}
                                >
                                    Gợi ý: nhập tên placeholder giống trong file Word (ví dụ:{' '}
                                    {' {co_quan_giai_quyet} '} ➝ điền{' '}
                                    <code>co_quan_giai_quyet</code>). Bạn có thể paste cả{' '}
                                    <code>{'{key}'}</code>, hệ thống sẽ tự bỏ ngoặc.
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
}

export const Route = createLazyFileRoute('/settings/')({
    component: Settings
});
