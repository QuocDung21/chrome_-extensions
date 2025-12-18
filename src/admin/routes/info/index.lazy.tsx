import { useEffect, useRef, useState } from 'react';

import {
    Add as AddIcon,
    Assessment as AssessmentIcon,
    Business as BusinessIcon,
    CheckCircle,
    CloudUpload as CloudUploadIcon,
    Code as CodeIcon,
    Delete as DeleteIcon,
    Description as DescriptionIcon,
    Download as DownloadIcon,
    Edit,
    Error as ErrorIcon,
    Info as InfoIcon,
    Link as LinkIcon,
    Print as PrintIcon,
    Settings as SettingsIcon,
    Wifi as WifiIcon
} from '@mui/icons-material';
import SaveIcon from '@mui/icons-material/Save';
import {
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Checkbox,
    Chip,
    Divider,
    Grid,
    IconButton,
    Link,
    MenuItem,
    Paper,
    Stack,
    Tab,
    Tabs,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography
} from '@mui/material';
import { useNavigate } from '@tanstack/react-router';
import { createLazyFileRoute } from '@tanstack/react-router';

import checkUrlExists from '@/utils/checkUrlExists';
import { getXPath } from '@/utils/getXPath';

// (Removed Syncfusion DocumentEditor imports and injection)

interface ServiceInfo {
    name: string;
    description: string;
    adminFunctions: number;
    softwareForms: number;
}

interface ServiceStep {
    step: string;
    url: string;
    status?: 'checking' | 'valid' | 'invalid' | 'unchecked';
    isEditing?: boolean;
}

interface InputElementInfo {
    index: number; // 1-based index
    tag: string;
    id: string;
    name: string;
    placeholder: string;
    value: string;
    label: string;
    type: string;
    className: string;
    disabled: boolean;
    readonly: boolean;
    required: boolean;
    inModal: boolean;
    xpath: string;
    cssSelector: string;
    vueAttributes?: Record<string, string>; // Vue.js specific attributes
}

interface FormInputInfo {
    type: string;
    name: string;
    id: string;
    placeholder: string;
}

interface FormElementInfo {
    index: number;
    action: string;
    method: string;
    inputs: FormInputInfo[];
}

const serviceInfo: ServiceInfo = {
    name: 'Dịch vụ công trực tuyến',
    description: 'Hệ thống hỗ trợ thực hiện các thủ tục hành chính và quản lý tài liệu điện tử',
    adminFunctions: 5,
    softwareForms: 5
};

const softwareSteps = [
    { step: '3.1', description: '' },
    { step: '3.2', description: '' },
    { step: '3.3', description: '' },
    { step: '3.4', description: '' },
    { step: '3.5', description: '' }
];

function findLabel(element: Element): string {
    if (element.id) {
        const label = element.ownerDocument?.querySelector(`label[for="${element.id}"]`);
        if (label) return label.textContent?.trim() || '';
    }
    const parentLabel = element.closest('label');
    if (parentLabel) return parentLabel.textContent?.trim() || '';
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
        const labelElement = element.ownerDocument?.getElementById(ariaLabelledBy);
        if (labelElement) return labelElement.textContent?.trim() || '';
    }
    const vueWrapper = element.closest('.v-input, .v-text-field, .el-form-item, .ant-form-item');
    if (vueWrapper) {
        const vueLabel = vueWrapper.querySelector(
            'label, .v-label, .el-form-item__label, .ant-form-item-label'
        );
        if (vueLabel) return vueLabel.textContent?.trim() || '';
    }

    // Try to find preceding label sibling
    let sibling = element.previousElementSibling;
    while (sibling) {
        if (sibling.tagName.toLowerCase() === 'label') {
            return sibling.textContent?.trim() || '';
        }
        sibling = sibling.previousElementSibling;
    }

    // Try to find label in parent container
    const parent = element.parentElement;
    if (parent) {
        const siblingLabel = parent.querySelector('label');
        if (siblingLabel) return siblingLabel.textContent?.trim() || '';
    }

    // Try to find placeholder as fallback
    const placeholder = element.getAttribute('placeholder');
    if (placeholder) return `[Placeholder: ${placeholder}]`;

    return '';
}

function getCssSelector(element: Element): string {
    if (element.id) return `#${element.id}`;

    const parts = [];
    let current: Element | null = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
        let selector = current.tagName.toLowerCase();

        if (current.className) {
            const classes = current.className.split(' ').filter(c => c.trim());
            if (classes.length > 0) {
                selector += '.' + classes.join('.');
            }
        }

        parts.unshift(selector);
        current = current.parentElement;

        if (parts.length > 3) break; // Limit depth
    }

    return parts.join(' > ');
}

// Helper function to get Vue.js specific attributes
function getVueAttributes(element: Element): Record<string, string> {
    const vueAttrs: Record<string, string> = {};

    // Get all attributes
    for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        const name = attr.name;
        const value = attr.value;

        // Check for Vue.js directives and data attributes
        if (
            name.startsWith('v-') ||
            name.startsWith('@') ||
            name.startsWith(':') ||
            name.startsWith('data-v-') ||
            name === 'v-model' ||
            name.includes('vue')
        ) {
            vueAttrs[name] = value;
        }
    }

    return vueAttrs;
}

// Helper function to get current value including Vue.js reactive values
function getCurrentValue(element: Element): string {
    // Try to get the current value from the element
    const htmlElement = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

    // For input/textarea/select elements, get the current value
    if (htmlElement.value !== undefined) {
        return htmlElement.value;
    }

    // Fallback to attribute value
    return element.getAttribute('value') || '';
}

function analyzeInputElements(doc: Document): InputElementInfo[] {
    const inputs: InputElementInfo[] = [];
    const inputSelectors = [
        // Standard HTML input elements
        'input',
        'textarea',
        'select',

        // Accessibility and role-based selectors
        '[contenteditable="true"]',
        '[role="textbox"]',
        '[role="combobox"]',
        '[role="searchbox"]',
        '[role="spinbutton"]',
        '[role="slider"]',

        // Test ID selectors
        '[data-testid*="input"]',
        '[data-testid*="field"]',
        '[data-testid*="form"]',

        // Vue.js specific selectors
        '[v-model]',
        '[data-v-model]',
        '[v-bind\\:value]',
        '[\\:value]',
        '[data-v-*][type]',

        // Vue component patterns
        '.v-input input',
        '.v-text-field input',
        '.v-textarea textarea',
        '.v-select input',
        '.el-input input',
        '.el-textarea textarea',
        '.ant-input',
        '.ant-select',

        // Common Vue UI library patterns
        '[class*="input"]',
        '[class*="field"]',
        '[class*="form-control"]',

        // Custom input patterns
        '[data-input]',
        '[data-field]',
        '[data-form-field]',

        // Vue directive patterns (escaped for CSS selector)
        '[v-on\\:input]',
        '[\\@input]',
        '[v-on\\:change]',
        '[\\@change]'
    ];

    const allElements: Element[] = [];
    const foundElements = new Set<Element>(); // Prevent duplicates

    inputSelectors.forEach(selector => {
        try {
            const elements = doc.querySelectorAll(selector);
            elements.forEach(el => {
                if (!foundElements.has(el)) {
                    foundElements.add(el);
                    allElements.push(el);
                }
            });
        } catch (e) {
            console.warn(`Error with selector ${selector}:`, e);
        }
    });

    // Remove duplicates while preserving order
    const uniqueElements: Element[] = [];
    const seen = new Set();
    allElements.forEach(element => {
        if (!seen.has(element)) {
            seen.add(element);
            uniqueElements.push(element);
        }
    });

    uniqueElements.forEach((element, index) => {
        try {
            // Check if element is in modal (including Vue.js modal patterns)
            const isInModal =
                element.closest(
                    '.modal, .popup, .overlay, .dialog, [role="dialog"], .v-dialog, .el-dialog, .ant-modal'
                ) !== null;

            // Find label
            const label = findLabel(element);

            // Get Vue.js specific attributes
            const vueAttributes = getVueAttributes(element);

            // Get current value (including Vue.js reactive value)
            const currentValue = getCurrentValue(element);

            inputs.push({
                index: index + 1,
                tag: element.tagName.toLowerCase(),
                id: (element as HTMLElement).id || '',
                name: element.getAttribute('name') || '',
                placeholder: element.getAttribute('placeholder') || '',
                value: currentValue,
                label: label,
                type: element.getAttribute('type') || '',
                className: element.className || '',
                disabled: element.hasAttribute('disabled') || element.hasAttribute('aria-disabled'),
                readonly: element.hasAttribute('readonly') || element.hasAttribute('aria-readonly'),
                required: element.hasAttribute('required') || element.hasAttribute('aria-required'),
                inModal: isInModal,
                xpath: getXPath(element),
                cssSelector: getCssSelector(element),
                vueAttributes: Object.keys(vueAttributes).length > 0 ? vueAttributes : undefined
            });
        } catch (e) {
            console.warn(`Error processing element ${index}:`, e);
        }
    });

    return inputs;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`
    };
}

function InfoPage() {
    const [tabValue, setTabValue] = useState(0);
    const [dataSource, setDataSource] = useState<'scanner' | 'socket'>('scanner');
    const [adminLinks, setAdminLinks] = useState<ServiceStep[]>([]);
    const [linkCounter, setLinkCounter] = useState(1);
    const [newUrl, setNewUrl] = useState('');
    const [urlError, setUrlError] = useState('');
    const [isCheckingUrl, setIsCheckingUrl] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingUrl, setEditingUrl] = useState('');

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    // Load persisted data source on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('word_mapper_data_source');
            if (saved === 'scanner' || saved === 'socket') {
                setDataSource(saved);
            }
        } catch {
            /* empty */
        }
    }, []);

    // Hàm kiểm tra định dạng URL
    const isValidUrl = (url: string): boolean => {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    };

    const handleAddAdminLink = async () => {
        if (linkCounter >= 6) return;

        const trimmedUrl = newUrl.trim();
        if (!trimmedUrl) return;

        // Reset error
        setUrlError('');

        // Kiểm tra định dạng URL
        if (!isValidUrl(trimmedUrl)) {
            setUrlError(
                'URL không đúng định dạng. Vui lòng nhập URL hợp lệ (http:// hoặc https://)'
            );
            return;
        }

        // Kiểm tra URL đã tồn tại trong danh sách chưa
        const isDuplicate = adminLinks.some(link => link.url === trimmedUrl);
        if (isDuplicate) {
            setUrlError('URL này đã tồn tại trong danh sách');
            return;
        }

        // Thêm URL vào danh sách
        const newLink: ServiceStep = {
            step: `2.${linkCounter}`,
            url: trimmedUrl
        };
        setAdminLinks(prev => [...prev, newLink]);
        setLinkCounter(prev => prev + 1);
        setNewUrl('');
    };

    const handleCheckLinks = async () => {
        if (adminLinks.length === 0) {
            alert('Chưa có đường dẫn nào để kiểm tra');
            return;
        }

        setIsCheckingUrl(true);

        // Cập nhật trạng thái checking cho tất cả links
        setAdminLinks(prev => prev.map(link => ({ ...link, status: 'checking' as const })));

        // Kiểm tra từng URL
        for (let i = 0; i < adminLinks.length; i++) {
            const link = adminLinks[i];
            const exists = await checkUrlExists(link.url);

            // Cập nhật trạng thái cho URL này
            setAdminLinks(prev =>
                prev.map((item, index) =>
                    index === i
                        ? { ...item, status: exists ? ('valid' as const) : ('invalid' as const) }
                        : item
                )
            );
        }

        setIsCheckingUrl(false);
    };

    const handleAnalyzeLinks = async () => {
        if (adminLinks.length === 0) {
            alert('Chưa có đường dẫn nào để phân tích');
            return;
        }

        setIsCheckingUrl(true);

        try {
            const analysisResults = [];

            for (const link of adminLinks) {
                try {
                    // Fetch page content
                    const response = await fetch(link.url, {
                        method: 'GET',
                        mode: 'cors'
                    });

                    if (response.ok) {
                        const html = await response.text();
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');

                        // Extract page information
                        const title = doc.querySelector('title')?.textContent || 'Không có tiêu đề';
                        const description =
                            doc
                                .querySelector('meta[name="description"]')
                                ?.getAttribute('content') || 'Không có mô tả';

                        // Count different types of elements
                        const forms = doc.querySelectorAll('form').length;
                        const inputs = doc.querySelectorAll('input').length;
                        const buttons = doc.querySelectorAll('button').length;
                        const links = doc.querySelectorAll('a').length;
                        const images = doc.querySelectorAll('img').length;
                        const scripts = doc.querySelectorAll('script').length;
                        const stylesheets = doc.querySelectorAll('link[rel="stylesheet"]').length;

                        // Count headings
                        const headings = {
                            h1: doc.querySelectorAll('h1').length,
                            h2: doc.querySelectorAll('h2').length,
                            h3: doc.querySelectorAll('h3').length,
                            h4: doc.querySelectorAll('h4').length,
                            h5: doc.querySelectorAll('h5').length,
                            h6: doc.querySelectorAll('h6').length
                        };

                        // Extract detailed input elements analysis
                        const inputElements = analyzeInputElements(doc);

                        // Extract all form elements details
                        const formElements = Array.from(doc.querySelectorAll('form')).map(
                            (form, index) => ({
                                index: index + 1,
                                action: form.getAttribute('action') || 'Không có action',
                                method: form.getAttribute('method') || 'GET',
                                inputs: Array.from(form.querySelectorAll('input')).map(input => ({
                                    type: input.type || 'text',
                                    name: input.name || 'Không có name',
                                    id: input.id || 'Không có id',
                                    placeholder: input.placeholder || 'Không có placeholder'
                                }))
                            })
                        );

                        // Extract all links
                        const linkElements = Array.from(doc.querySelectorAll('a')).map(
                            (link, index) => ({
                                index: index + 1,
                                href: link.href || 'Không có href',
                                text: link.textContent?.trim() || 'Không có text',
                                target: link.target || '_self'
                            })
                        );

                        const pageInfo = {
                            url: link.url,
                            title,
                            description,
                            forms,
                            inputs,
                            buttons,
                            links,
                            images,
                            scripts,
                            stylesheets,
                            headings,
                            formElements,
                            linkElements,
                            inputElements
                        };

                        analysisResults.push(pageInfo);
                    } else {
                        analysisResults.push({
                            url: link.url,
                            error: `HTTP ${response.status}: ${response.statusText}`
                        });
                    }
                } catch (error) {
                    analysisResults.push({
                        url: link.url,
                        error: (error as Error).message || 'Không thể truy cập trang'
                    });
                }
            }

            // Display detailed analysis
            displayAnalysisResults(analysisResults);
        } catch (error) {
            alert(`Lỗi khi phân tích: ${(error as Error).message}`);
        } finally {
            setIsCheckingUrl(false);
        }
    };

    const displayAnalysisResults = (results: any[]) => {
        let analysis = `=== PHÂN TÍCH CHI TIẾT ${results.length} ĐƯỜNG DẪN ===\n\n`;

        results.forEach((result, index) => {
            analysis += `${index + 1}. ${result.url}\n`;
            analysis += `${'='.repeat(50)}\n`;

            if (result.error) {
                analysis += `❌ LỖI: ${result.error}\n\n`;
                return;
            }

            analysis += `📄 Tiêu đề: ${result.title}\n`;
            analysis += `📝 Mô tả: ${result.description}\n\n`;

            analysis += `📊 THỐNG KÊ ELEMENTS:\n`;
            analysis += `• Forms: ${result.forms}\n`;
            analysis += `• Input fields: ${result.inputs}\n`;
            analysis += `• Buttons: ${result.buttons}\n`;
            analysis += `• Links: ${result.links}\n`;
            analysis += `• Images: ${result.images}\n`;
            analysis += `• Scripts: ${result.scripts}\n`;
            analysis += `• Stylesheets: ${result.stylesheets}\n\n`;

            analysis += `📋 HEADINGS:\n`;
            analysis += `• H1: ${result.headings.h1}\n`;
            analysis += `• H2: ${result.headings.h2}\n`;
            analysis += `• H3: ${result.headings.h3}\n`;
            analysis += `• H4: ${result.headings.h4}\n`;
            analysis += `• H5: ${result.headings.h5}\n`;
            analysis += `• H6: ${result.headings.h6}\n\n`;

            if (result.formElements && result.formElements.length > 0) {
                analysis += `📝 CHI TIẾT FORMS (${result.formElements.length}):\n`;
                result.formElements.forEach((form: FormElementInfo) => {
                    analysis += `  Form ${form.index}:\n`;
                    analysis += `    • Action: ${form.action}\n`;
                    analysis += `    • Method: ${form.method}\n`;
                    analysis += `    • Inputs (${form.inputs.length}):\n`;
                    form.inputs.forEach((input: FormInputInfo, idx: number) => {
                        analysis += `      ${idx + 1}. Type: ${input.type}, Name: ${input.name}, ID: ${input.id}\n`;
                    });
                    analysis += `\n`;
                });
            }

            if (result.linkElements && result.linkElements.length > 0) {
                analysis += `🔗 CHI TIẾT LINKS (Hiển thị 10 đầu tiên):\n`;

                result.linkElements.slice(0, 10).forEach((link: any) => {
                    analysis += `  ${link.index}. ${link.text} → ${link.href}\n`;
                });
                if (result.linkElements.length > 10) {
                    analysis += `  ... và ${result.linkElements.length - 10} links khác\n`;
                }
                analysis += `\n`;
            }

            if (result.inputElements && result.inputElements.length > 0) {
                analysis += `📝 CHI TIẾT INPUT ELEMENTS (${result.inputElements.length}):\n`;

                result.inputElements.forEach((input: any) => {
                    analysis += `  ${input.index}. ${input.tag.toUpperCase()}`;
                    if (input.type) analysis += ` [${input.type}]`;
                    analysis += `\n`;

                    if (input.label) analysis += `    • Label: ${input.label}\n`;
                    if (input.id) analysis += `    • ID: ${input.id}\n`;
                    if (input.name) analysis += `    • Name: ${input.name}\n`;
                    if (input.placeholder) analysis += `    • Placeholder: ${input.placeholder}\n`;
                    if (input.value) analysis += `    • Value: ${input.value}\n`;

                    const attributes = [];
                    if (input.disabled) attributes.push('disabled');
                    if (input.readonly) attributes.push('readonly');
                    if (input.required) attributes.push('required');
                    if (input.inModal) attributes.push('in-modal');
                    if (attributes.length > 0) {
                        analysis += `    • Attributes: ${attributes.join(', ')}\n`;
                    }

                    // Add Vue.js specific attributes if present
                    if (input.vueAttributes && Object.keys(input.vueAttributes).length > 0) {
                        analysis += `    • Vue.js Attributes:\n`;
                        Object.entries(input.vueAttributes).forEach(([key, value]) => {
                            analysis += `      - ${key}: ${value}\n`;
                        });
                    }

                    analysis += `    • XPath: ${input.xpath}\n`;
                    analysis += `    • CSS Selector: ${input.cssSelector}\n`;
                    analysis += `    • Element Index: ${input.index}\n`;
                    analysis += `\n`;
                });
            }

            analysis += `\n${'='.repeat(50)}\n\n`;
        });

        // Create a modal or new window to display results
        const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
        if (newWindow) {
            newWindow.document.write(`
                <html>
                    <head>
                        <title>Kết quả phân tích đường dẫn</title>
                        <style>
                            body { font-family: monospace; padding: 20px; line-height: 1.6; }
                            pre { white-space: pre-wrap; word-wrap: break-word; }
                        </style>
                    </head>
                    <body>
                        <h1>Kết quả phân tích đường dẫn</h1>
                        <pre>${analysis}</pre>
                        <button onclick="window.close()">Đóng</button>
                    </body>
                </html>
            `);
        }
    };

    const handleEditUrl = (index: number) => {
        setEditingIndex(index);
        setEditingUrl(adminLinks[index].url);
    };

    const handleSaveEdit = async (index: number) => {
        const trimmedUrl = editingUrl.trim();

        if (!isValidUrl(trimmedUrl)) {
            alert('URL không đúng định dạng. Vui lòng nhập URL hợp lệ (http:// hoặc https://)');
            return;
        }

        // Kiểm tra URL đã tồn tại trong danh sách chưa (trừ URL hiện tại)
        const isDuplicate = adminLinks.some((link, i) => i !== index && link.url === trimmedUrl);
        if (isDuplicate) {
            alert('URL này đã tồn tại trong danh sách');
            return;
        }

        // Cập nhật URL và reset trạng thái
        setAdminLinks(prev =>
            prev.map((item, i) =>
                i === index ? { ...item, url: trimmedUrl, status: 'unchecked' as const } : item
            )
        );

        setEditingIndex(null);
        setEditingUrl('');
    };

    const handleCancelEdit = () => {
        setEditingIndex(null);
        setEditingUrl('');
    };
    const navigate = useNavigate();

    // Tab: Thông tin gói dịch vụ
    const PackageInfoTab = () => (
        <Stack spacing={3}>
            <Card elevation={2}>
                <CardHeader
                    avatar={<InfoIcon color="primary" />}
                    title="Thiết lập"
                    sx={{ pb: 1 }}
                />
                <Divider />
                <CardContent>
                    <Stack spacing={3}>
                        {/* <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Tên gói dịch vụ
                            </Typography>
                            <Typography
                                variant="body1"
                                sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                            >
                                Chưa có thông tin
                            </Typography>
                        </Box> */}

                        <Box>
                            <Typography
                                variant="h6"
                                sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}
                            >
                                Thủ tục hành chính
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="body1">
                                        Số lượng thủ tục hành chính của phần mềm dịch vụ công
                                    </Typography>
                                    <Chip
                                        label={`${serviceInfo.adminFunctions} thủ tục`}
                                        color="primary"
                                        size="small"
                                        sx={{ mt: 1 }}
                                    />
                                </Box>
                                <Button
                                    disabled
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    sx={{
                                        bgcolor: 'success.main',
                                        '&:hover': { bgcolor: 'success.dark' }
                                    }}
                                    onClick={() => {
                                        navigate({ to: '/procedures' });
                                    }}
                                >
                                    Thiết mẫu mẫu
                                </Button>
                            </Box>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>
        </Stack>
    );

    return (
        <Box p={0}>
            {/* Tabs */}
            <Paper sx={{ width: '100%' }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    aria-label="info tabs"
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '1rem'
                        }
                    }}
                >
                    <Tab
                        icon={<BusinessIcon />}
                        iconPosition="start"
                        label="Thiết lập"
                        {...a11yProps(0)}
                    />
                    {/* <Tab
                        icon={<SettingsIcon />}
                        iconPosition="start"
                        label="Thiết lập dữ liệu đầu vào"
                        {...a11yProps(1)}
                    />
                    <Tab
                        icon={<CloudUploadIcon />}
                        iconPosition="start"
                        label="Thiết lập mẫu"
                        {...a11yProps(2)}
                    /> */}
                </Tabs>

                <TabPanel value={tabValue} index={0}>
                    <PackageInfoTab />
                </TabPanel>
                {/* <TabPanel value={tabValue} index={1}>
                    <DataSetupTab />
                </TabPanel>
                <TabPanel value={tabValue} index={2}>
                    <Box />
                </TabPanel> */}
            </Paper>
        </Box>
    );
}

export const Route = createLazyFileRoute('/info/')({
    component: InfoPage
});
