import React, { useMemo, useState } from 'react';

import {
    Category as CategoryIcon,
    Clear as ClearIcon,
    Description as DocumentIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import {
    Box,
    Card,
    CardContent,
    Chip,
    Divider,
    FormControl,
    Grid,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';

import { TemplateFile } from './templateUtils';

interface TemplateSelectorProps {
    templates: TemplateFile[];
    selectedTemplate: TemplateFile | null;
    onTemplateSelect: (template: TemplateFile) => void;
    disabled?: boolean;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
    templates,
    selectedTemplate,
    onTemplateSelect,
    disabled = false
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Get unique categories
    const categories = useMemo(() => {
        const cats = new Set(templates.map(t => t.category || 'Khác'));
        return Array.from(cats).sort();
    }, [templates]);

    // Filter templates based on search and category
    const filteredTemplates = useMemo(() => {
        return templates.filter(template => {
            const matchesSearch =
                template.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                template.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory =
                selectedCategory === 'all' || template.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [templates, searchTerm, selectedCategory]);

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    const handleCategoryChange = (event: any) => {
        setSelectedCategory(event.target.value);
    };

    const clearSearch = () => {
        setSearchTerm('');
    };

    const handleTemplateClick = (template: TemplateFile) => {
        onTemplateSelect(template);
    };

    return (
        <Box>
            {/* Search and Filter Controls */}
            <Box sx={{ mb: 3 }}>
                <Grid container spacing={2}>
                    <Grid>
                        <TextField
                            fullWidth
                            placeholder="Tìm kiếm mẫu đơn..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            disabled={disabled}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                                endAdornment: searchTerm && (
                                    <InputAdornment position="end">
                                        <IconButton
                                            size="small"
                                            onClick={clearSearch}
                                            disabled={disabled}
                                        >
                                            <ClearIcon />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                    </Grid>
                    <Grid>
                        <FormControl fullWidth disabled={disabled}>
                            <InputLabel>Danh mục</InputLabel>
                            <Select
                                value={selectedCategory}
                                label="Danh mục"
                                onChange={handleCategoryChange}
                            >
                                <MenuItem value="all">Tất cả</MenuItem>
                                {categories.map(category => (
                                    <MenuItem key={category} value={category}>
                                        {category}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Box>

            {/* Template Grid */}
            {filteredTemplates.length > 0 ? (
                <Grid container spacing={2}>
                    {filteredTemplates.map(template => (
                        <Grid key={template.path}>
                            <Card
                                sx={{
                                    cursor: disabled ? 'default' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    border: selectedTemplate?.path === template.path ? 2 : 1,
                                    borderColor:
                                        selectedTemplate?.path === template.path
                                            ? 'primary.main'
                                            : 'divider',
                                    backgroundColor:
                                        selectedTemplate?.path === template.path
                                            ? 'primary.50'
                                            : 'background.paper',
                                    '&:hover': disabled
                                        ? {}
                                        : {
                                              transform: 'translateY(-2px)',
                                              boxShadow: 4,
                                              borderColor: 'primary.main'
                                          }
                                }}
                                onClick={() => !disabled && handleTemplateClick(template)}
                            >
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                                        <DocumentIcon color="primary" sx={{ mr: 1, mt: 0.5 }} />
                                        <Box sx={{ flex: 1 }}>
                                            <Typography
                                                variant="h6"
                                                component="div"
                                                sx={{
                                                    fontWeight: 600,
                                                    mb: 1,
                                                    lineHeight: 1.3
                                                }}
                                            >
                                                {template.label}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ mb: 2 }}
                                            >
                                                {template.description}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {template.category && (
                                            <Chip
                                                icon={<CategoryIcon />}
                                                label={template.category}
                                                size="small"
                                                variant="outlined"
                                                color="primary"
                                            />
                                        )}
                                        {template.tags?.map(tag => (
                                            <Chip
                                                key={tag}
                                                label={tag}
                                                size="small"
                                                variant="outlined"
                                            />
                                        ))}
                                    </Box>

                                    {selectedTemplate?.path === template.path && (
                                        <Box
                                            sx={{
                                                mt: 2,
                                                pt: 2,
                                                borderTop: 1,
                                                borderColor: 'divider'
                                            }}
                                        >
                                            <Chip
                                                label="Đã chọn"
                                                color="success"
                                                size="small"
                                                sx={{ fontWeight: 600 }}
                                            />
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <Box
                    sx={{
                        textAlign: 'center',
                        py: 4,
                        color: 'text.secondary'
                    }}
                >
                    <DocumentIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6" gutterBottom>
                        Không tìm thấy mẫu đơn
                    </Typography>
                    <Typography variant="body2">
                        {searchTerm || selectedCategory !== 'all'
                            ? 'Thử thay đổi từ khóa tìm kiếm hoặc danh mục'
                            : 'Không có mẫu đơn nào được cấu hình'}
                    </Typography>
                </Box>
            )}

            {/* Selected Template Info */}
            {selectedTemplate && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.50', borderRadius: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        Mẫu đã chọn:
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {selectedTemplate.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {selectedTemplate.description}
                    </Typography>
                </Box>
            )}
        </Box>
    );
};
