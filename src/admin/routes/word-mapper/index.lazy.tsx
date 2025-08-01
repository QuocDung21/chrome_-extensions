// import { useCallback, useRef, useState } from 'react';
// import {
//     Add as AddIcon,
//     Delete as DeleteIcon,
//     Download as DownloadIcon,
//     PlayArrow as PlayArrowIcon,
//     Upload as UploadIcon,
//     Visibility as VisibilityIcon
// } from '@mui/icons-material';
// import {
//     Alert,
//     Box,
//     Button,
//     Card,
//     CardContent,
//     Chip,
//     CircularProgress,
//     IconButton,
//     Paper,
//     TextField,
//     Typography
// } from '@mui/material';
// import { documentService } from '../../services/documentService';
// interface PlaceholderMapping {
//     id: string;
//     placeholder: string;
//     jsonKey: string;
// }
// interface DocumentState {
//     file: File | null;
//     isLoading: boolean;
//     error: string | null;
//     placeholders: string[];
//     mappings: PlaceholderMapping[];
//     jsonData: string;
//     previewUrl: string | null;
//     previewHtml: string | null;
//     isGeneratingPreview: boolean;
// }
// function WordMapperComponent() {
//     const [documentState, setDocumentState] = useState<DocumentState>({
//         file: null,
//         isLoading: false,
//         error: null,
//         placeholders: [],
//         mappings: [],
//         jsonData: JSON.stringify(
//             {
//                 ho_ten: 'Nguyễn Văn A',
//                 ngay_sinh: '01/01/1990',
//                 so_cccd: '123456789012',
//                 dia_chi: '123 Đường ABC, Quận 1, TP.HCM',
//                 so_dien_thoai: '0123456789',
//                 email: 'nguyenvana@email.com',
//                 current_date: new Date().toLocaleDateString('vi-VN')
//             },
//             null,
//             2
//         ),
//         previewUrl: null,
//         previewHtml: null,
//         isGeneratingPreview: false
//     });
//     const fileInputRef = useRef<HTMLInputElement>(null);
//     const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
//         const file = event.target.files?.[0];
//         if (!file) return;
//         setDocumentState(prev => ({
//             ...prev,
//             isLoading: true,
//             error: null
//         }));
//         try {
//             console.log('Starting document processing for file:', file.name);
//             // Validate document
//             if (!file.name.endsWith('.docx')) {
//                 throw new Error('Chỉ hỗ trợ file .docx');
//             }
//             // Load template to document service
//             const templateId = `template_${Date.now()}`;
//             await documentService.loadTemplate(templateId, file);
//             // Extract placeholders from document
//             const placeholders = await documentService.extractTemplateFields(file);
//             setDocumentState(prev => ({
//                 ...prev,
//                 file,
//                 isLoading: false,
//                 error: null,
//                 placeholders,
//                 mappings: placeholders.map(placeholder => ({
//                     id: `mapping_${Date.now()}_${Math.random()}`,
//                     placeholder,
//                     jsonKey: placeholder
//                 }))
//             }));
//             console.log('Document processing completed successfully');
//         } catch (error) {
//             console.error('Error processing document:', error);
//             setDocumentState(prev => ({
//                 ...prev,
//                 isLoading: false,
//                 error: error instanceof Error ? error.message : 'Lỗi không xác định'
//             }));
//         }
//     }, []);
//     const handleMappingChange = useCallback(
//         (mappingId: string, field: 'placeholder' | 'jsonKey', value: string) => {
//             setDocumentState(prev => ({
//                 ...prev,
//                 mappings: prev.mappings.map(mapping =>
//                     mapping.id === mappingId ? { ...mapping, [field]: value } : mapping
//                 )
//             }));
//         },
//         []
//     );
//     const handleAddMapping = useCallback(() => {
//         const newMapping: PlaceholderMapping = {
//             id: `mapping_${Date.now()}_${Math.random()}`,
//             placeholder: '',
//             jsonKey: ''
//         };
//         setDocumentState(prev => ({
//             ...prev,
//             mappings: [...prev.mappings, newMapping]
//         }));
//     }, []);
//     const handleRemoveMapping = useCallback((mappingId: string) => {
//         setDocumentState(prev => ({
//             ...prev,
//             mappings: prev.mappings.filter(mapping => mapping.id !== mappingId)
//         }));
//     }, []);
//     const handleJsonDataChange = useCallback((value: string) => {
//         setDocumentState(prev => ({
//             ...prev,
//             jsonData: value
//         }));
//     }, []);
//     const handleGeneratePreview = useCallback(async () => {
//         if (!documentState.file) return;
//         setDocumentState(prev => ({
//             ...prev,
//             isGeneratingPreview: true,
//             error: null
//         }));
//         try {
//             // Parse JSON data
//             const jsonData = JSON.parse(documentState.jsonData);
//             // Create mapped data based on mappings
//             const mappedData: { [key: string]: any } = {};
//             documentState.mappings.forEach(mapping => {
//                 if (
//                     mapping.placeholder &&
//                     mapping.jsonKey &&
//                     jsonData[mapping.jsonKey] !== undefined
//                 ) {
//                     mappedData[mapping.placeholder] = jsonData[mapping.jsonKey];
//                 }
//             });
//             // Load template and generate document
//             const templateId = `preview_${Date.now()}`;
//             await documentService.loadTemplate(templateId, documentState.file);
//             const blob = await documentService.generateDocument(templateId, mappedData);
//             // Create preview URL and convert to HTML
//             const previewUrl = URL.createObjectURL(blob);
//             const previewHtml = await documentService.convertDocumentToHtml(blob);
//             setDocumentState(prev => ({
//                 ...prev,
//                 previewUrl,
//                 previewHtml,
//                 isGeneratingPreview: false
//             }));
//         } catch (error) {
//             console.error('Error generating preview:', error);
//             setDocumentState(prev => ({
//                 ...prev,
//                 isGeneratingPreview: false,
//                 error:
//                     'Error generating preview: ' +
//                     (error instanceof Error ? error.message : 'Unknown error')
//             }));
//         }
//     }, [documentState.file, documentState.jsonData, documentState.mappings]);
//     const handleGenerateDocument = useCallback(async () => {
//         if (!documentState.file) return;
//         try {
//             // Parse JSON data
//             const jsonData = JSON.parse(documentState.jsonData);
//             // Create mapped data based on mappings
//             const mappedData: { [key: string]: any } = {};
//             documentState.mappings.forEach(mapping => {
//                 if (
//                     mapping.placeholder &&
//                     mapping.jsonKey &&
//                     jsonData[mapping.jsonKey] !== undefined
//                 ) {
//                     mappedData[mapping.placeholder] = jsonData[mapping.jsonKey];
//                 }
//             });
//             // Load template and generate document
//             const templateId = `template_${Date.now()}`;
//             await documentService.loadTemplate(templateId, documentState.file);
//             const blob = await documentService.generateDocument(templateId, mappedData);
//             // Download the generated document
//             const url = URL.createObjectURL(blob);
//             const a = document.createElement('a');
//             a.href = url;
//             a.download = `generated_document_${Date.now()}.docx`;
//             document.body.appendChild(a);
//             a.click();
//             document.body.removeChild(a);
//             URL.revokeObjectURL(url);
//             alert('Document generated successfully!');
//         } catch (error) {
//             console.error('Error generating document:', error);
//             alert(
//                 'Error generating document: ' +
//                     (error instanceof Error ? error.message : 'Unknown error')
//             );
//         }
//     }, [documentState.file, documentState.jsonData, documentState.mappings]);
//     return (
//         <Box sx={{ p: 3 }}>
//             <Typography variant="h4" gutterBottom>
//                 Word Document Mapper
//             </Typography>
//             <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
//                 Upload Word document, setup placeholder mappings, and generate documents with JSON
//                 data.
//             </Typography>
//             {/* Upload Section */}
//             <Paper sx={{ p: 3, mb: 3 }}>
//                 <Typography variant="h6" gutterBottom>
//                     Step 1: Upload Word Document
//                 </Typography>
//                 <input
//                     type="file"
//                     ref={fileInputRef}
//                     onChange={handleFileUpload}
//                     accept=".docx"
//                     style={{ display: 'none' }}
//                 />
//                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
//                     <Button
//                         variant="contained"
//                         startIcon={<UploadIcon />}
//                         onClick={() => fileInputRef.current?.click()}
//                         disabled={documentState.isLoading}
//                     >
//                         {documentState.isLoading ? 'Processing...' : 'Upload Word File'}
//                     </Button>
//                     {documentState.isLoading && <CircularProgress size={24} />}
//                     {documentState.file && (
//                         <Chip label={documentState.file.name} color="success" variant="outlined" />
//                     )}
//                 </Box>
//                 {documentState.error && (
//                     <Alert severity="error" sx={{ mt: 2 }}>
//                         {documentState.error}
//                     </Alert>
//                 )}
//                 {documentState.placeholders.length > 0 && (
//                     <Alert severity="info" sx={{ mt: 2 }}>
//                         <Typography variant="body2">
//                             <strong>Found placeholders:</strong>{' '}
//                             {documentState.placeholders.join(', ')}
//                         </Typography>
//                     </Alert>
//                 )}
//             </Paper>
//             {/* Placeholder Mapping Section */}
//             {documentState.file && (
//                 <Paper sx={{ p: 3, mb: 3 }}>
//                     <Typography variant="h6" gutterBottom>
//                         Step 2: Setup Placeholder Mappings
//                     </Typography>
//                     <Box
//                         sx={{
//                             display: 'flex',
//                             justifyContent: 'space-between',
//                             alignItems: 'center',
//                             mb: 2
//                         }}
//                     >
//                         <Typography variant="body2" color="textSecondary">
//                             Map Word placeholders (like {'{ho_ten}'}) to JSON data keys
//                         </Typography>
//                         <Button
//                             variant="outlined"
//                             startIcon={<AddIcon />}
//                             onClick={handleAddMapping}
//                             size="small"
//                         >
//                             Add Mapping
//                         </Button>
//                     </Box>
//                     {documentState.mappings.map(mapping => (
//                         <Card key={mapping.id} sx={{ mb: 2 }}>
//                             <CardContent>
//                                 <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
//                                     <TextField
//                                         label="Word Placeholder"
//                                         placeholder="e.g., ho_ten"
//                                         value={mapping.placeholder}
//                                         onChange={e =>
//                                             handleMappingChange(
//                                                 mapping.id,
//                                                 'placeholder',
//                                                 e.target.value
//                                             )
//                                         }
//                                         size="small"
//                                         sx={{ flex: 1 }}
//                                     />
//                                     <Typography variant="body2" sx={{ mx: 1 }}>
//                                         →
//                                     </Typography>
//                                     <TextField
//                                         label="JSON Key"
//                                         placeholder="e.g., ho_ten"
//                                         value={mapping.jsonKey}
//                                         onChange={e =>
//                                             handleMappingChange(
//                                                 mapping.id,
//                                                 'jsonKey',
//                                                 e.target.value
//                                             )
//                                         }
//                                         size="small"
//                                         sx={{ flex: 1 }}
//                                     />
//                                     <IconButton
//                                         onClick={() => handleRemoveMapping(mapping.id)}
//                                         color="error"
//                                         size="small"
//                                     >
//                                         <DeleteIcon />
//                                     </IconButton>
//                                 </Box>
//                             </CardContent>
//                         </Card>
//                     ))}
//                 </Paper>
//             )}
//             {/* JSON Data Section */}
//             {documentState.file && (
//                 <Paper sx={{ p: 3, mb: 3 }}>
//                     <Typography variant="h6" gutterBottom>
//                         Step 3: JSON Data Input & Preview
//                     </Typography>
//                     <Box sx={{ display: 'flex', gap: 3 }}>
//                         {/* JSON Input */}
//                         <Box sx={{ flex: 1 }}>
//                             <TextField
//                                 label="JSON Data"
//                                 multiline
//                                 rows={10}
//                                 fullWidth
//                                 value={documentState.jsonData}
//                                 onChange={e => handleJsonDataChange(e.target.value)}
//                                 placeholder="Enter JSON data here..."
//                                 sx={{ fontFamily: 'monospace' }}
//                             />
//                             <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2 }}>
//                                 <Button
//                                     variant="contained"
//                                     startIcon={<VisibilityIcon />}
//                                     onClick={handleGeneratePreview}
//                                     disabled={
//                                         documentState.isGeneratingPreview ||
//                                         documentState.mappings.length === 0
//                                     }
//                                     color="primary"
//                                 >
//                                     {documentState.isGeneratingPreview
//                                         ? 'Generating Preview...'
//                                         : 'Generate HTML Preview'}
//                                 </Button>
//                                 {documentState.isGeneratingPreview && (
//                                     <CircularProgress size={24} />
//                                 )}
//                             </Box>
//                             <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
//                                 Enter JSON data to fill Word document placeholders. Click "Generate
//                                 HTML Preview" to see the result.
//                             </Typography>
//                         </Box>
//                         {/* Preview */}
//                         {documentState.previewUrl && (
//                             <Box sx={{ flex: 1 }}>
//                                 <Typography variant="subtitle1" gutterBottom>
//                                     Document Preview
//                                 </Typography>
//                                 <Box
//                                     sx={{
//                                         border: '1px solid #ddd',
//                                         borderRadius: 1,
//                                         height: 400,
//                                         display: 'flex',
//                                         flexDirection: 'column',
//                                         backgroundColor: '#fff'
//                                     }}
//                                 >
//                                     {/* Word Document HTML Preview */}
//                                     <Box
//                                         sx={{
//                                             flex: 1,
//                                             overflow: 'auto',
//                                             backgroundColor: '#fff',
//                                             border: '1px solid #e0e0e0'
//                                         }}
//                                     >
//                                         {documentState.previewHtml ? (
//                                             <Box
//                                                 sx={{
//                                                     p: 4,
//                                                     backgroundColor: '#ffffff',
//                                                     minHeight: '100%',
//                                                     fontFamily: '"Times New Roman", serif',
//                                                     fontSize: '12pt',
//                                                     lineHeight: 1.6,
//                                                     color: '#000000',
//                                                     '& p': {
//                                                         margin: '0 0 12pt 0',
//                                                         textAlign: 'justify'
//                                                     },
//                                                     '& h1': {
//                                                         fontSize: '18pt',
//                                                         fontWeight: 'bold',
//                                                         margin: '24pt 0 12pt 0',
//                                                         textAlign: 'center'
//                                                     },
//                                                     '& h2': {
//                                                         fontSize: '16pt',
//                                                         fontWeight: 'bold',
//                                                         margin: '18pt 0 12pt 0'
//                                                     },
//                                                     '& h3': {
//                                                         fontSize: '14pt',
//                                                         fontWeight: 'bold',
//                                                         margin: '12pt 0 6pt 0'
//                                                     },
//                                                     '& ul, & ol': {
//                                                         margin: '6pt 0',
//                                                         paddingLeft: '36pt'
//                                                     },
//                                                     '& li': {
//                                                         margin: '3pt 0'
//                                                     },
//                                                     '& table': {
//                                                         borderCollapse: 'collapse',
//                                                         width: '100%',
//                                                         margin: '12pt 0',
//                                                         border: '1px solid #000000'
//                                                     },
//                                                     '& td, & th': {
//                                                         border: '1px solid #000000',
//                                                         padding: '6pt 12pt',
//                                                         textAlign: 'left',
//                                                         verticalAlign: 'top'
//                                                     },
//                                                     '& th': {
//                                                         backgroundColor: '#f0f0f0',
//                                                         fontWeight: 'bold'
//                                                     },
//                                                     '& strong, & b': {
//                                                         fontWeight: 'bold'
//                                                     },
//                                                     '& em, & i': {
//                                                         fontStyle: 'italic'
//                                                     },
//                                                     '& u': {
//                                                         textDecoration: 'underline'
//                                                     }
//                                                 }}
//                                                 dangerouslySetInnerHTML={{
//                                                     __html: documentState.previewHtml
//                                                 }}
//                                             />
//                                         ) : (
//                                             <Box
//                                                 sx={{
//                                                     display: 'flex',
//                                                     alignItems: 'center',
//                                                     justifyContent: 'center',
//                                                     height: '100%',
//                                                     p: 3
//                                                 }}
//                                             >
//                                                 <Typography
//                                                     variant="h6"
//                                                     color="textSecondary"
//                                                     gutterBottom
//                                                 >
//                                                     📄 Document Preview
//                                                 </Typography>
//                                                 <Typography
//                                                     variant="body2"
//                                                     color="textSecondary"
//                                                     textAlign="center"
//                                                 >
//                                                     Click "Generate HTML Preview" to see your Word
//                                                     document
//                                                     <br />
//                                                     with the filled data in HTML format
//                                                 </Typography>
//                                             </Box>
//                                         )}
//                                     </Box>
//                                     {/* Download Button */}
//                                     <Box
//                                         sx={{
//                                             p: 2,
//                                             borderTop: '1px solid #ddd',
//                                             textAlign: 'center'
//                                         }}
//                                     >
//                                         <Button
//                                             variant="contained"
//                                             startIcon={<DownloadIcon />}
//                                             onClick={() => {
//                                                 const a = document.createElement('a');
//                                                 a.href = documentState.previewUrl!;
//                                                 a.download = `preview_document_${Date.now()}.docx`;
//                                                 document.body.appendChild(a);
//                                                 a.click();
//                                                 document.body.removeChild(a);
//                                             }}
//                                             size="small"
//                                         >
//                                             Download Word File
//                                         </Button>
//                                     </Box>
//                                 </Box>
//                                 <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
//                                     HTML preview of your Word document with filled data. Download to
//                                     save the .docx file.
//                                 </Typography>
//                             </Box>
//                         )}
//                     </Box>
//                 </Paper>
//             )}
//             {/* Generate Section */}
//             {documentState.file && documentState.mappings.length > 0 && (
//                 <Paper sx={{ p: 3 }}>
//                     <Typography variant="h6" gutterBottom>
//                         Step 4: Generate Document
//                     </Typography>
//                     <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
//                         <Button
//                             variant="contained"
//                             startIcon={<PlayArrowIcon />}
//                             onClick={handleGenerateDocument}
//                             color="primary"
//                             size="large"
//                         >
//                             Generate Word Document
//                         </Button>
//                         <Button
//                             variant="outlined"
//                             startIcon={<DownloadIcon />}
//                             onClick={handleGenerateDocument}
//                         >
//                             Generate & Download
//                         </Button>
//                     </Box>
//                     <Alert severity="info">
//                         <Typography variant="body2">
//                             <strong>Mappings:</strong> {documentState.mappings.length} configured
//                         </Typography>
//                         <Typography variant="body2">
//                             Click "Generate Word Document" to create a document with your JSON data
//                         </Typography>
//                     </Alert>
//                 </Paper>
//             )}
//         </Box>
//     );
// // }
// ////////////////////
// import React, { useCallback, useRef, useState } from 'react';
// import { saveAs } from 'file-saver';
// import PizZip from 'pizzip';
// import { PlayArrow as PlayArrowIcon, Upload as UploadIcon } from '@mui/icons-material';
// // --- Material UI Imports ---
// import {
//     Alert,
//     Box,
//     Button,
//     Chip,
//     CircularProgress,
//     Paper,
//     TextField,
//     Typography
// } from '@mui/material';
// import { createLazyFileRoute } from '@tanstack/react-router';
// // --- State và Type Definitions ---
// interface DocumentState {
//     file: File | null;
//     isLoading: boolean;
//     error: string | null;
//     jsonData: string;
// }
// // --- Logic xử lý chính ---
// const fieldMappings = {
//     ho_ten: [
//         'Họ và tên',
//         'Họ, chữ đệm, tên',
//         'Họ tên',
//         'Họ, chữ đệm, tên người yêu cầu',
//         'Tên(2)',
//         'Tên'
//     ],
//     ngay_sinh: ['Ngày, tháng, năm sinh', 'Sinh ngày', 'Ngày sinh', 'Năm sinh'],
//     so_cccd: [
//         'Số CCCD',
//         'CCCD',
//         'Căn cước công dân',
//         'Số căn cước',
//         'Số căn cước công dân',
//         'Số CMND hoặc căn cước công dân',
//         'Số CMND/CCCD/Hộ chiếu/TCC'
//     ],
//     noi_cu_tru: [
//         'Nơi cư trú',
//         'Địa chỉ cư trú',
//         'Chỗ ở hiện tại',
//         'Nơi ở hiện nay',
//         'Địa chỉ(2)',
//         'Địa chỉ'
//     ],
//     ngay_cap_cccd: ['Ngày cấp CCCD', 'Ngày cấp', 'Cấp ngày', 'Ngày cấp căn cước']
// };
// /**
//  * Xử lý file Word bằng cách tìm và thay thế ở cấp độ đoạn văn (ĐÃ TỐI ƯU VÀ SỬA LỖI).
//  * @param file File .docx người dùng tải lên.
//  * @param jsonData Đối tượng JSON chứa dữ liệu để điền.
//  */
// const processDocumentByParagraph = async (file: File, jsonData: { [key: string]: any }) => {
//     const arrayBuffer = await file.arrayBuffer();
//     const zip = new PizZip(arrayBuffer);
//     const docXml = zip.file('word/document.xml');
//     if (!docXml)
//         throw new Error('File docx không hợp lệ hoặc bị hỏng (không tìm thấy word/document.xml).');
//     const xmlString = docXml.asText();
//     const parser = new DOMParser();
//     const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
//     const paragraphs = xmlDoc.getElementsByTagName('w:p');
//     let replacementsMade = 0;
//     for (let i = 0; i < paragraphs.length; i++) {
//         const p = paragraphs[i];
//         const textNodes = p.getElementsByTagName('w:t');
//         let fullText = '';
//         for (let j = 0; j < textNodes.length; j++) {
//             fullText += textNodes[j].textContent;
//         }
//         let newText = fullText;
//         let hasBeenModified = false;
//         // Xử lý nhiều lần thay thế trên cùng một đoạn văn
//         for (const [jsonKey, labels] of Object.entries(fieldMappings)) {
//             if (jsonData[jsonKey]) {
//                 for (const label of labels) {
//                     // TỐI ƯU REGEX: Tìm kiếm label theo sau bởi ít nhất 2 ký tự placeholder (., _, …) hoặc khoảng trắng.
//                     // Điều này ngăn việc thay thế các dòng đã có dữ liệu.
//                     // Thêm 'g' để thay thế tất cả các trường hợp khớp trên một dòng.
//                     const escapedLabel = label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
//                     const regex = new RegExp(`(${escapedLabel}:[\\s]*)([._…\\s]{2,})`, 'g');
//                     if (regex.test(newText)) {
//                         newText = newText.replace(regex, `$1${jsonData[jsonKey]}`);
//                         hasBeenModified = true;
//                     }
//                 }
//             }
//         }
//         // Nếu đoạn văn đã được sửa đổi, cập nhật lại nội dung XML
//         if (hasBeenModified) {
//             replacementsMade++;
//             while (p.firstChild) {
//                 p.removeChild(p.firstChild);
//             }
//             const newRun = xmlDoc.createElementNS(
//                 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
//                 'w:r'
//             );
//             const newTextNode = xmlDoc.createElementNS(
//                 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
//                 'w:t'
//             );
//             newTextNode.textContent = newText;
//             const spaceAttr = xmlDoc.createAttribute('xml:space');
//             spaceAttr.value = 'preserve';
//             newTextNode.setAttributeNode(spaceAttr);
//             newRun.appendChild(newTextNode);
//             p.appendChild(newRun);
//             console.log(`Đã cập nhật đoạn văn: "${newText}"`);
//         }
//     }
//     if (replacementsMade === 0) {
//         throw new Error(
//             'Không tìm thấy trường nào để thay thế. File có thể có cấu trúc phức tạp hoặc không chứa các nhãn cần tìm.'
//         );
//     }
//     const serializer = new XMLSerializer();
//     const newXmlString = serializer.serializeToString(xmlDoc);
//     zip.file('word/document.xml', newXmlString);
//     const out = zip.generate({ type: 'blob' });
//     saveAs(out, `processed_${file.name}`);
// };
// // --- React Component ---
// function WordMapperComponent() {
//     const [state, setState] = useState<DocumentState>({
//         file: null,
//         isLoading: false,
//         error: null,
//         jsonData: JSON.stringify(
//             {
//                 ho_ten: 'Nguyễn Văn A',
//                 ngay_sinh: '01/01/1990',
//                 so_cccd: '123456789012',
//                 noi_cu_tru: '123 Đường ABC, Quận 1, TP.HCM',
//                 ngay_cap_cccd: '15/05/2020'
//             },
//             null,
//             2
//         )
//     });
//     const fileInputRef = useRef<HTMLInputElement>(null);
//     const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
//         const file = event.target.files?.[0];
//         if (!file) return;
//         if (file.name.toLowerCase().endsWith('.doc')) {
//             setState(prev => ({
//                 ...prev,
//                 error: 'File .doc không được hỗ trợ trực tiếp. Vui lòng chuyển đổi sang .docx trước khi tải lên.'
//             }));
//             return;
//         }
//         if (!file.name.toLowerCase().endsWith('.docx')) {
//             setState(prev => ({ ...prev, error: 'Chỉ hỗ trợ file .docx' }));
//             return;
//         }
//         setState(prev => ({ ...prev, file: file, error: null }));
//     }, []);
//     const handleJsonDataChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
//         setState(prev => ({ ...prev, jsonData: event.target.value }));
//     }, []);
//     const handleGenerateDocument = async () => {
//         if (!state.file) {
//             setState(prev => ({ ...prev, error: 'Vui lòng tải lên một file Word trước.' }));
//             return;
//         }
//         setState(prev => ({ ...prev, isLoading: true, error: null }));
//         try {
//             const jsonData = JSON.parse(state.jsonData);
//             await processDocumentByParagraph(state.file, jsonData);
//         } catch (error) {
//             const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
//             setState(prev => ({ ...prev, error: errorMessage }));
//             console.error(error);
//         } finally {
//             setState(prev => ({ ...prev, isLoading: false }));
//         }
//     };
//     return (
//         <Box sx={{ p: 3, maxWidth: 800, margin: 'auto' }}>
//             <Typography variant="h4" gutterBottom>
//                 Word Document Filler
//             </Typography>
//             <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
//                 Tải lên file .docx và điền dữ liệu từ JSON mà không cần sửa đổi file mẫu.
//             </Typography>
//             {/* Upload Section */}
//             <Paper sx={{ p: 3, mb: 3 }}>
//                 <Typography variant="h6" gutterBottom>
//                     Bước 1: Tải lên file Word (.docx)
//                 </Typography>
//                 <input
//                     type="file"
//                     ref={fileInputRef}
//                     onChange={handleFileUpload}
//                     accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
//                     style={{ display: 'none' }}
//                 />
//                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
//                     <Button
//                         variant="contained"
//                         startIcon={<UploadIcon />}
//                         onClick={() => fileInputRef.current?.click()}
//                     >
//                         Chọn File
//                     </Button>
//                     {state.file && (
//                         <Chip
//                             label={state.file.name}
//                             color="success"
//                             variant="outlined"
//                             onDelete={() => setState(p => ({ ...p, file: null }))}
//                         />
//                     )}
//                 </Box>
//             </Paper>
//             {/* JSON Data & Generate Section */}
//             {state.file && (
//                 <Paper sx={{ p: 3, mb: 3 }}>
//                     <Typography variant="h6" gutterBottom>
//                         Bước 2: Cung cấp dữ liệu JSON
//                     </Typography>
//                     <TextField
//                         label="JSON Data"
//                         multiline
//                         rows={10}
//                         fullWidth
//                         value={state.jsonData}
//                         onChange={handleJsonDataChange}
//                         placeholder="Enter JSON data here..."
//                         sx={{ fontFamily: 'monospace', mb: 2 }}
//                     />
//                     <Button
//                         variant="contained"
//                         startIcon={
//                             state.isLoading ? (
//                                 <CircularProgress size={20} color="inherit" />
//                             ) : (
//                                 <PlayArrowIcon />
//                             )
//                         }
//                         onClick={handleGenerateDocument}
//                         disabled={state.isLoading}
//                         size="large"
//                     >
//                         {state.isLoading ? 'Đang xử lý...' : 'Tạo và Tải tài liệu'}
//                     </Button>
//                 </Paper>
//             )}
//             {/* Error Display */}
//             {state.error && (
//                 <Alert severity="error" sx={{ mt: 2 }}>
//                     {state.error}
//                 </Alert>
//             )}
//         </Box>
//     );
// }
// // --- TanStack Router Export ---
// export const Route = createLazyFileRoute('/word-mapper/')({
//     component: WordMapperComponent
// });
// import React, { useCallback, useRef, useState } from 'react';
// import { saveAs } from 'file-saver';
// import PizZip from 'pizzip';
// import { PlayArrow as PlayArrowIcon, Upload as UploadIcon } from '@mui/icons-material';
// // --- Material UI Imports ---
// import {
//     Alert,
//     Box,
//     Button,
//     Chip,
//     CircularProgress,
//     Paper,
//     TextField,
//     Typography
// } from '@mui/material';
// import { createLazyFileRoute } from '@tanstack/react-router';
// // --- State và Type Definitions ---
// interface DocumentState {
//     file: File | null;
//     isLoading: boolean;
//     error: string | null;
//     jsonData: string;
// }
// // --- Logic xử lý chính ---
// const fieldMappings = {
//     ho_ten: [
//         'Họ và tên',
//         'Họ, chữ đệm, tên',
//         'Họ tên',
//         'Họ, chữ đệm, tên người yêu cầu',
//         'Tên(2)',
//         'Tên'
//     ],
//     ngay_sinh: ['Ngày, tháng, năm sinh', 'Sinh ngày', 'Ngày sinh', 'Năm sinh'],
//     so_cccd: [
//         'Số CCCD',
//         'CCCD',
//         'Căn cước công dân',
//         'Số căn cước',
//         'Số căn cước công dân',
//         'Số CMND hoặc căn cước công dân',
//         'Số CMND/CCCD/Hộ chiếu/TCC'
//     ],
//     noi_cu_tru: [
//         'Nơi cư trú',
//         'Địa chỉ cư trú',
//         'Chỗ ở hiện tại',
//         'Nơi ở hiện nay',
//         'Địa chỉ(2)',
//         'Địa chỉ'
//     ],
//     ngay_cap_cccd: ['Ngày cấp CCCD', 'Ngày cấp', 'Cấp ngày', 'Ngày cấp căn cước']
// };
// /**
//  * Xử lý file Word bằng cách tìm và thay thế ở cấp độ đoạn văn (ĐÃ TỐI ƯU VÀ SỬA LỖI).
//  * @param file File .docx người dùng tải lên.
//  * @param jsonData Đối tượng JSON chứa dữ liệu để điền.
//  */
// const processDocumentByParagraph = async (file: File, jsonData: { [key: string]: any }) => {
//     const arrayBuffer = await file.arrayBuffer();
//     const zip = new PizZip(arrayBuffer);
//     const docXml = zip.file('word/document.xml');
//     if (!docXml)
//         throw new Error('File docx không hợp lệ hoặc bị hỏng (không tìm thấy word/document.xml).');
//     const xmlString = docXml.asText();
//     const parser = new DOMParser();
//     const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
//     const paragraphs = xmlDoc.getElementsByTagName('w:p');
//     let replacementsMade = 0;
//     for (let i = 0; i < paragraphs.length; i++) {
//         const p = paragraphs[i];
//         const textNodes = p.getElementsByTagName('w:t');
//         let fullText = '';
//         for (let j = 0; j < textNodes.length; j++) {
//             fullText += textNodes[j].textContent;
//         }
//         let newText = fullText;
//         let hasBeenModified = false;
//         // Xử lý nhiều lần thay thế trên cùng một đoạn văn
//         for (const [jsonKey, labels] of Object.entries(fieldMappings)) {
//             if (jsonData[jsonKey]) {
//                 for (const label of labels) {
//                     const escapedLabel = label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
//                     const regex = new RegExp(`(${escapedLabel}:[\\s]*)([._…\\s]*)`, 'g');
//                     if (regex.test(newText)) {
//                         newText = newText.replace(regex, `$1${jsonData[jsonKey]}`);
//                         hasBeenModified = true;
//                     }
//                 }
//             }
//         }
//         // Nếu đoạn văn đã được sửa đổi, cập nhật lại nội dung XML
//         if (hasBeenModified) {
//             replacementsMade++;
//             // SỬA LỖI "NHẢY DÒNG": Giữ lại thuộc tính định dạng của đoạn văn (<w:pPr>)
//             const pPr = p.getElementsByTagName('w:pPr')[0];
//             // Xóa tất cả nội dung cũ
//             while (p.firstChild) {
//                 p.removeChild(p.firstChild);
//             }
//             // Thêm lại thuộc tính định dạng đã lưu
//             if (pPr) {
//                 p.appendChild(pPr);
//             }
//             // Tạo và thêm nội dung text mới
//             const newRun = xmlDoc.createElementNS(
//                 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
//                 'w:r'
//             );
//             const newTextNode = xmlDoc.createElementNS(
//                 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
//                 'w:t'
//             );
//             newTextNode.textContent = newText;
//             const spaceAttr = xmlDoc.createAttribute('xml:space');
//             spaceAttr.value = 'preserve';
//             newTextNode.setAttributeNode(spaceAttr);
//             newRun.appendChild(newTextNode);
//             p.appendChild(newRun);
//             console.log(`Đã cập nhật đoạn văn: "${newText}"`);
//         }
//     }
//     if (replacementsMade === 0) {
//         throw new Error(
//             'Không tìm thấy trường nào để thay thế. File có thể có cấu trúc phức tạp hoặc không chứa các nhãn cần tìm.'
//         );
//     }
//     const serializer = new XMLSerializer();
//     const newXmlString = serializer.serializeToString(xmlDoc);
//     zip.file('word/document.xml', newXmlString);
//     const out = zip.generate({ type: 'blob' });
//     saveAs(out, `processed_${file.name}`);
// };
// // --- React Component ---
// function WordMapperComponent() {
//     const [state, setState] = useState<DocumentState>({
//         file: null,
//         isLoading: false,
//         error: null,
//         jsonData: JSON.stringify(
//             {
//                 ho_ten: 'Nguyễn Văn A',
//                 ngay_sinh: '01/01/1990',
//                 so_cccd: '123456789012',
//                 noi_cu_tru: '123 Đường ABC, Quận 1, TP.HCM',
//                 ngay_cap_cccd: '15/05/2020'
//             },
//             null,
//             2
//         )
//     });
//     const fileInputRef = useRef<HTMLInputElement>(null);
//     const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
//         const file = event.target.files?.[0];
//         if (!file) return;
//         if (file.name.toLowerCase().endsWith('.doc')) {
//             setState(prev => ({
//                 ...prev,
//                 error: 'File .doc không được hỗ trợ trực tiếp. Vui lòng chuyển đổi sang .docx trước khi tải lên.'
//             }));
//             return;
//         }
//         if (!file.name.toLowerCase().endsWith('.docx')) {
//             setState(prev => ({ ...prev, error: 'Chỉ hỗ trợ file .docx' }));
//             return;
//         }
//         setState(prev => ({ ...prev, file: file, error: null }));
//     }, []);
//     const handleJsonDataChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
//         setState(prev => ({ ...prev, jsonData: event.target.value }));
//     }, []);
//     const handleGenerateDocument = async () => {
//         if (!state.file) {
//             setState(prev => ({ ...prev, error: 'Vui lòng tải lên một file Word trước.' }));
//             return;
//         }
//         setState(prev => ({ ...prev, isLoading: true, error: null }));
//         try {
//             const jsonData = JSON.parse(state.jsonData);
//             await processDocumentByParagraph(state.file, jsonData);
//         } catch (error) {
//             const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
//             setState(prev => ({ ...prev, error: errorMessage }));
//             console.error(error);
//         } finally {
//             setState(prev => ({ ...prev, isLoading: false }));
//         }
//     };
//     return (
//         <Box sx={{ p: 3, maxWidth: 800, margin: 'auto' }}>
//             <Typography variant="h4" gutterBottom>
//                 Word Document Filler
//             </Typography>
//             <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
//                 Tải lên file .docx và điền dữ liệu từ JSON mà không cần sửa đổi file mẫu.
//             </Typography>
//             {/* Upload Section */}
//             <Paper sx={{ p: 3, mb: 3 }}>
//                 <Typography variant="h6" gutterBottom>
//                     Bước 1: Tải lên file Word (.docx)
//                 </Typography>
//                 <input
//                     type="file"
//                     ref={fileInputRef}
//                     onChange={handleFileUpload}
//                     accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
//                     style={{ display: 'none' }}
//                 />
//                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
//                     <Button
//                         variant="contained"
//                         startIcon={<UploadIcon />}
//                         onClick={() => fileInputRef.current?.click()}
//                     >
//                         Chọn File
//                     </Button>
//                     {state.file && (
//                         <Chip
//                             label={state.file.name}
//                             color="success"
//                             variant="outlined"
//                             onDelete={() => setState(p => ({ ...p, file: null }))}
//                         />
//                     )}
//                 </Box>
//             </Paper>
//             {/* JSON Data & Generate Section */}
//             {state.file && (
//                 <Paper sx={{ p: 3, mb: 3 }}>
//                     <Typography variant="h6" gutterBottom>
//                         Bước 2: Cung cấp dữ liệu JSON
//                     </Typography>
//                     <TextField
//                         label="JSON Data"
//                         multiline
//                         rows={10}
//                         fullWidth
//                         value={state.jsonData}
//                         onChange={handleJsonDataChange}
//                         placeholder="Enter JSON data here..."
//                         sx={{ fontFamily: 'monospace', mb: 2 }}
//                     />
//                     <Button
//                         variant="contained"
//                         startIcon={
//                             state.isLoading ? (
//                                 <CircularProgress size={20} color="inherit" />
//                             ) : (
//                                 <PlayArrowIcon />
//                             )
//                         }
//                         onClick={handleGenerateDocument}
//                         disabled={state.isLoading}
//                         size="large"
//                     >
//                         {state.isLoading ? 'Đang xử lý...' : 'Tạo và Tải tài liệu'}
//                     </Button>
//                 </Paper>
//             )}
//             {/* Error Display */}
//             {state.error && (
//                 <Alert severity="error" sx={{ mt: 2 }}>
//                     {state.error}
//                 </Alert>
//             )}
//         </Box>
//     );
// }
// // --- TanStack Router Export ---
// export const Route = createLazyFileRoute('/word-mapper/')({
//     component: WordMapperComponent
// });
// import React, { useCallback, useEffect, useRef, useState } from 'react';
// import { saveAs } from 'file-saver';
// import PizZip from 'pizzip';
// import { Socket, io } from 'socket.io-client';
// import {
//     PlayArrow as PlayArrowIcon,
//     Upload as UploadIcon,
//     Wifi as WifiIcon,
//     WifiOff as WifiOffIcon
// } from '@mui/icons-material';
// // --- Material UI Imports ---
// import {
//     Alert,
//     Box,
//     Button,
//     Chip,
//     CircularProgress,
//     Paper,
//     TextField,
//     Typography
// } from '@mui/material';
// import { createLazyFileRoute } from '@tanstack/react-router';
// // --- State và Type Definitions ---
// interface DocumentState {
//     file: File | null;
//     isLoading: boolean;
//     error: string | null;
//     jsonData: string;
//     socketStatus: 'connected' | 'disconnected';
// }
// // --- Logic xử lý chính ---
// // Thêm các key riêng cho ngày, tháng, năm
// const fieldMappings = {
//     ho_ten: [
//         'Họ và tên',
//         'Họ, chữ đệm, tên',
//         'Họ tên',
//         'Họ, chữ đệm, tên người yêu cầu',
//         'Tên(2)',
//         'Tên',
//         'Tên tổ chức, cá nhân được nhà nước giao đất, cho thuê đất'
//     ],
//     ngay_sinh_full: ['Ngày, tháng, năm sinh', 'Ngày sinh:', 'Ngày, tháng, năm sinh'], // Dùng cho trường hợp điền cả cụm, có dấu hai chấm
//     so_cccd: [
//         'Số CCCD',
//         'CCCD',
//         'Căn cước công dân',
//         'Số căn cước',
//         'Số căn cước công dân',
//         'Số CMND hoặc căn cước công dân',
//         'Số CMND/CCCD/Hộ chiếu/TCC'
//     ],
//     noi_cu_tru: [
//         'Nơi cư trú',
//         'Địa chỉ cư trú',
//         'Chỗ ở hiện tại',
//         'Nơi ở hiện nay',
//         'Địa chỉ(2)',
//         'Địa chỉ'
//     ],
//     ngay_cap_cccd: [
//         'Ngày cấp CCCD',
//         'Ngày cấp',
//         'Cấp ngày',
//         'ngày cấp',
//         'cấp ngày',
//         'Ngày cấp căn cước'
//     ],
//     gioi_tinh: ['Giới tính'],
//     // Các key mới để xử lý ngày tháng tách rời
// ngay: ['Sinh ngày'],
// thang: ['tháng'],
// nam: ['năm']
// };
// /**
//  * Xử lý file Word bằng cách tìm và thay thế ở cấp độ đoạn văn.
//  * @param file File .docx người dùng tải lên.
//  * @param jsonData Đối tượng JSON chứa dữ liệu đã được tách ngày/tháng/năm.
//  */
// const processDocumentByParagraph = async (file: File, jsonData: { [key: string]: any }) => {
//     // ... code khởi tạo không đổi ...
//     const arrayBuffer = await file.arrayBuffer();
//     const zip = new PizZip(arrayBuffer);
//     const docXml = zip.file('word/document.xml');
//     if (!docXml)
//         throw new Error('File docx không hợp lệ hoặc bị hỏng (không tìm thấy word/document.xml).');
//     const xmlString = docXml.asText();
//     const parser = new DOMParser();
//     const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
//     const paragraphs = xmlDoc.getElementsByTagName('w:p');
//     let replacementsMade = 0;
//     for (let i = 0; i < paragraphs.length; i++) {
//         const p = paragraphs[i];
//         const fullText = Array.from(p.getElementsByTagName('w:t'))
//             .map(t => t.textContent)
//             .join('');
//         let newText = fullText;
//         let hasBeenModified = false;
//         // --- BẮT ĐẦU THAY ĐỔI ---
//         // Ưu tiên xử lý cụm ngày/tháng/năm trước
//         if (jsonData.ngay && jsonData.thang && jsonData.nam) {
//             // SỬA TẠI ĐÂY: Thay đổi `+` cuối cùng thành `+?` (non-greedy)
//             const dateRegex = new RegExp(
//                 `(Sinh ngày:?)([._…\\s]+)(tháng:?)([._…\\s]+)(năm:?)([._…\\s]+?)`, // <-- THAY ĐỔI Ở ĐÂY
//                 'g'
//             );
//             if (newText.match(dateRegex)) {
//                 newText = newText.replace(
//                     dateRegex,
//                     `$1 ${jsonData.ngay} $3 ${jsonData.thang} $5 ${jsonData.nam}`
//                 );
//                 hasBeenModified = true;
//             }
//         }
//         // Xử lý các trường còn lại như bình thường
//         for (const [jsonKey, labels] of Object.entries(fieldMappings)) {
//             // Bỏ qua các key ngày tháng năm riêng lẻ nếu dùng logic cụm
//             if (['ngay', 'thang', 'nam'].includes(jsonKey)) continue;
//             if (jsonData[jsonKey]) {
//                 for (const label of labels) {
//                     const escapedLabel = label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
//                     // Sử dụng non-greedy '.*?' để tránh ăn sang các trường khác trên cùng một dòng
//                     const regex = new RegExp(`(${escapedLabel}:?)([._…\\s]{2,})`, 'g');
//                     if (newText.match(regex)) {
//                         newText = newText.replace(regex, `$1 ${jsonData[jsonKey]}`);
//                         hasBeenModified = true;
//                     }
//                 }
//             }
//         }
//         // --- KẾT THÚC THAY ĐỔI ---
//         if (hasBeenModified) {
//             // ... phần còn lại của hàm không thay đổi ...
//             replacementsMade++;
//             const pPr = p.getElementsByTagName('w:pPr')[0];
//             const firstRun = p.getElementsByTagName('w:r')[0];
//             const rPr = firstRun ? firstRun.getElementsByTagName('w:rPr')[0] : null;
//             while (p.firstChild) {
//                 p.removeChild(p.firstChild);
//             }
//             if (pPr) {
//                 p.appendChild(pPr.cloneNode(true));
//             }
//             const newRun = xmlDoc.createElementNS(
//                 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
//                 'w:r'
//             );
//             if (rPr) {
//                 newRun.appendChild(rPr.cloneNode(true));
//             }
//             const newTextNode = xmlDoc.createElementNS(
//                 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
//                 'w:t'
//             );
//             newTextNode.textContent = newText;
//             const spaceAttr = xmlDoc.createAttribute('xml:space');
//             spaceAttr.value = 'preserve';
//             newTextNode.setAttributeNode(spaceAttr);
//             newRun.appendChild(newTextNode);
//             p.appendChild(newRun);
//             console.log(`Đã cập nhật đoạn văn: "${newText}"`);
//         }
//     }
//     if (replacementsMade === 0) {
//         throw new Error(
//             'Không tìm thấy trường nào để thay thế. File có thể có cấu trúc phức tạp hoặc không chứa các nhãn cần tìm.'
//         );
//     }
//     const serializer = new XMLSerializer();
//     const newXmlString = serializer.serializeToString(xmlDoc);
//     zip.file('word/document.xml', newXmlString);
//     const out = zip.generate({ type: 'blob' });
//     saveAs(out, `processed_${file.name}`);
// };
// // const processDocumentByParagraph = async (file: File, jsonData: { [key: string]: any }) => {
// //     const arrayBuffer = await file.arrayBuffer();
// //     const zip = new PizZip(arrayBuffer);
// //     const docXml = zip.file('word/document.xml');
// //     if (!docXml)
// //         throw new Error('File docx không hợp lệ hoặc bị hỏng (không tìm thấy word/document.xml).');
// //     const xmlString = docXml.asText();
// //     const parser = new DOMParser();
// //     const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
// //     const paragraphs = xmlDoc.getElementsByTagName('w:p');
// //     let replacementsMade = 0;
// //     for (let i = 0; i < paragraphs.length; i++) {
// //         const p = paragraphs[i];
// //         const fullText = Array.from(p.getElementsByTagName('w:t'))
// //             .map(t => t.textContent)
// //             .join('');
// //         let newText = fullText;
// //         let hasBeenModified = false;
// //         for (const [jsonKey, labels] of Object.entries(fieldMappings)) {
// //             if (jsonData[jsonKey]) {
// //                 for (const label of labels) {
// //                     const escapedLabel = label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
// //                     const regex = new RegExp(`(${escapedLabel}:?)([._…\\s]{2,})`, 'g');
// //                     if (newText.match(regex)) {
// //                         newText = newText.replace(regex, `$1 ${jsonData[jsonKey]}`);
// //                         hasBeenModified = true;
// //                     }
// //                 }
// //             }
// //         }
// //         if (hasBeenModified) {
// //             replacementsMade++;
// //             const pPr = p.getElementsByTagName('w:pPr')[0];
// //             const firstRun = p.getElementsByTagName('w:r')[0];
// //             const rPr = firstRun ? firstRun.getElementsByTagName('w:rPr')[0] : null;
// //             while (p.firstChild) {
// //                 p.removeChild(p.firstChild);
// //             }
// //             if (pPr) {
// //                 p.appendChild(pPr.cloneNode(true));
// //             }
// //             const newRun = xmlDoc.createElementNS(
// //                 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
// //                 'w:r'
// //             );
// //             if (rPr) {
// //                 newRun.appendChild(rPr.cloneNode(true));
// //             }
// //             const newTextNode = xmlDoc.createElementNS(
// //                 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
// //                 'w:t'
// //             );
// //             newTextNode.textContent = newText;
// //             const spaceAttr = xmlDoc.createAttribute('xml:space');
// //             spaceAttr.value = 'preserve';
// //             newTextNode.setAttributeNode(spaceAttr);
// //             newRun.appendChild(newTextNode);
// //             p.appendChild(newRun);
// //             console.log(`Đã cập nhật đoạn văn: "${newText}"`);
// //         }
// //     }
// //     if (replacementsMade === 0) {
// //         throw new Error(
// //             'Không tìm thấy trường nào để thay thế. File có thể có cấu trúc phức tạp hoặc không chứa các nhãn cần tìm.'
// //         );
// //     }
// //     const serializer = new XMLSerializer();
// //     const newXmlString = serializer.serializeToString(xmlDoc);
// //     zip.file('word/document.xml', newXmlString);
// //     const out = zip.generate({ type: 'blob' });
// //     saveAs(out, `processed_${file.name}`);
// // };
// // --- React Component ---
// function WordMapperComponent() {
//     const [state, setState] = useState<DocumentState>({
//         file: null,
//         isLoading: false,
//         error: null,
//         jsonData: JSON.stringify(
//             {
//                 ho_ten: 'Nguyễn Văn A',
//                 ngay_sinh: '01/01/1990', // Người dùng chỉ cần nhập định dạng này
//                 so_cccd: '123456789012',
//                 noi_cu_tru: '123 Đường ABC, Quận 1, TP.HCM',
//                 ngay_cap_cccd: '15/05/2020',
//                 gioi_tinh: 'Nam'
//             },
//             null,
//             2
//         ),
//         socketStatus: 'disconnected'
//     });
//     const fileInputRef = useRef<HTMLInputElement>(null);
//     // --- WebSocket Logic ---
//     useEffect(() => {
//         // Kết nối tới WebSocket server
//         const socket: Socket = io('https://d1b68fc66abe.ngrok-free.app');
//         socket.on('connect', () => {
//             console.log('✅ WebSocket connected!');
//             setState(prev => ({ ...prev, socketStatus: 'connected' }));
//         });
//         socket.on('disconnect', () => {
//             console.log('🔌 WebSocket disconnected.');
//             setState(prev => ({ ...prev, socketStatus: 'disconnected' }));
//         });
//         // Lắng nghe dữ liệu từ server
//         socket.on('data_received', data => {
//             console.log('Received data from server:', data);
//             if (data && data.received) {
//                 // Cập nhật state jsonData với dữ liệu nhận được
//                 setState(prev => ({
//                     ...prev,
//                     jsonData: JSON.stringify(data.received, null, 2),
//                     error: null // Xóa lỗi cũ
//                 }));
//             }
//         });
//         // Cleanup khi component unmount
//         return () => {
//             socket.disconnect();
//         };
//     }, []); // Mảng dependency rỗng đảm bảo chỉ chạy 1 lần khi mount
//     const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
//         const file = event.target.files?.[0];
//         if (!file) return;
//         if (file.name.toLowerCase().endsWith('.doc')) {
//             setState(prev => ({
//                 ...prev,
//                 error: 'File .doc không được hỗ trợ trực tiếp. Vui lòng chuyển đổi sang .docx trước khi tải lên.'
//             }));
//             return;
//         }
//         if (!file.name.toLowerCase().endsWith('.docx')) {
//             setState(prev => ({ ...prev, error: 'Chỉ hỗ trợ file .docx' }));
//             return;
//         }
//         setState(prev => ({ ...prev, file: file, error: null }));
//     }, []);
//     const handleJsonDataChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
//         setState(prev => ({ ...prev, jsonData: event.target.value }));
//     }, []);
//     const handleGenerateDocument = async () => {
//         if (!state.file) {
//             setState(prev => ({ ...prev, error: 'Vui lòng tải lên một file Word trước.' }));
//             return;
//         }
//         setState(prev => ({ ...prev, isLoading: true, error: null }));
//         try {
//             const parsedJson = JSON.parse(state.jsonData);
//             // TÁCH DỮ LIỆU NGÀY THÁNG NĂM TẠI ĐÂY
//             const augmentedData = { ...parsedJson };
//             if (parsedJson.ngay_sinh && typeof parsedJson.ngay_sinh === 'string') {
//                 const dateParts = parsedJson.ngay_sinh.split('/');
//                 if (dateParts.length === 3) {
//                     augmentedData.ngay = dateParts[0];
//                     augmentedData.thang = dateParts[1];
//                     augmentedData.nam = dateParts[2];
//                 }
//                 // Thêm một key mới để điền cả cụm nếu cần
//                 augmentedData.ngay_sinh_full = parsedJson.ngay_sinh;
//             }
//             await processDocumentByParagraph(state.file, augmentedData);
//         } catch (error) {
//             const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
//             setState(prev => ({ ...prev, error: errorMessage }));
//             console.error(error);
//         } finally {
//             setState(prev => ({ ...prev, isLoading: false }));
//         }
//     };
//     return (
//         <Box sx={{ p: 0, maxWidth: '100%', margin: 'auto' }}>
//             {/* <Box
//                 sx={{
//                     display: 'flex',
//                     justifyContent: 'space-between',
//                     alignItems: 'center',
//                     mb: 1
//                 }}
//             >
//                 <Chip
//                     icon={state.socketStatus === 'connected' ? <WifiIcon /> : <WifiOffIcon />}
//                     label={
//                         state.socketStatus === 'connected' ? 'Đã kết nối' : 'Đang chờ dữ liệu...'
//                     }
//                     color={state.socketStatus === 'connected' ? 'success' : 'warning'}
//                     variant="outlined"
//                     title="Trạng thái kết nối WebSocket. Dữ liệu từ QR/OCR sẽ tự động cập nhật vào ô JSON."
//                 />
//             </Box> */}
//             {/* Upload Section */}
//             <Paper sx={{ p: 3, mb: 3 }}>
//                 <Typography variant="h6" gutterBottom>
//                     Bước 1: Tải lên file Word (.docx)
//                 </Typography>
//                 <input
//                     type="file"
//                     ref={fileInputRef}
//                     onChange={handleFileUpload}
//                     accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
//                     style={{ display: 'none' }}
//                 />
//                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
//                     <Button
//                         variant="contained"
//                         startIcon={<UploadIcon />}
//                         onClick={() => fileInputRef.current?.click()}
//                     >
//                         Chọn File
//                     </Button>
//                     {state.file && (
//                         <Chip
//                             label={state.file.name}
//                             color="success"
//                             variant="outlined"
//                             onDelete={() => setState(p => ({ ...p, file: null }))}
//                         />
//                     )}
//                 </Box>
//             </Paper>
//             {/* JSON Data & Generate Section */}
//             {state.file && (
//                 <Paper sx={{ p: 3, mb: 3 }}>
//                     <Typography variant="h6" gutterBottom>
//                         Bước 2: Cung cấp dữ liệu JSON
//                     </Typography>
//                     <TextField
//                         label="JSON Data"
//                         multiline
//                         rows={10}
//                         fullWidth
//                         value={state.jsonData}
//                         onChange={handleJsonDataChange}
//                         placeholder="Enter JSON data here..."
//                         sx={{ fontFamily: 'monospace', mb: 2 }}
//                     />
//                     <Button
//                         variant="contained"
//                         startIcon={
//                             state.isLoading ? (
//                                 <CircularProgress size={20} color="inherit" />
//                             ) : (
//                                 <PlayArrowIcon />
//                             )
//                         }
//                         onClick={handleGenerateDocument}
//                         disabled={state.isLoading}
//                         size="large"
//                     >
//                         {state.isLoading ? 'Đang xử lý...' : 'Tạo và Tải tài liệu'}
//                     </Button>
//                 </Paper>
//             )}
//             {/* Error Display */}
//             {state.error && (
//                 <Alert severity="error" sx={{ mt: 2 }}>
//                     {state.error}
//                 </Alert>
//             )}
//         </Box>
//     );
// }
// // --- TanStack Router Export ---
// export const Route = createLazyFileRoute('/word-mapper/')({
//     component: WordMapperComponent
// });
// const processDocumentByParagraph = async (file: File, jsonData: { [key: string]: any }) => {
//     // ... code khởi tạo không đổi ...
//     const arrayBuffer = await file.arrayBuffer();
//     const zip = new PizZip(arrayBuffer);
//     const docXml = zip.file('word/document.xml');
//     if (!docXml)
//         throw new Error('File docx không hợp lệ hoặc bị hỏng (không tìm thấy word/document.xml).');
//     const xmlString = docXml.asText();
//     const parser = new DOMParser();
//     const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
//     const paragraphs = xmlDoc.getElementsByTagName('w:p');
//     let replacementsMade = 0;
//     for (let i = 0; i < paragraphs.length; i++) {
//         const p = paragraphs[i];
//         const fullText = Array.from(p.getElementsByTagName('w:t'))
//             .map(t => t.textContent)
//             .join('');
//         let newText = fullText;
//         let hasBeenModified = false;
//         // --- BẮT ĐẦU THAY ĐỔI ---
//         // Ưu tiên xử lý cụm ngày/tháng/năm trước
//         if (jsonData.ngay && jsonData.thang && jsonData.nam) {
//             // SỬA TẠI ĐÂY: Thay đổi `+` cuối cùng thành `+?` (non-greedy)
//             const dateRegex = new RegExp(
//                 `(Sinh ngày:?)([._…\\s]+)(tháng:?)([._…\\s]+)(năm:?)([._…\\s]+?)`, // <-- THAY ĐỔI Ở ĐÂY
//                 'g'
//             );
//             if (newText.match(dateRegex)) {
//                 newText = newText.replace(
//                     dateRegex,
//                     `$1 ${jsonData.ngay} $3 ${jsonData.thang} $5 ${jsonData.nam}`
//                 );
//                 hasBeenModified = true;
//             }
//         }
//         // Xử lý các trường còn lại như bình thường
//         for (const [jsonKey, labels] of Object.entries(fieldMappings)) {
//             // Bỏ qua các key ngày tháng năm riêng lẻ nếu dùng logic cụm
//             if (['ngay', 'thang', 'nam'].includes(jsonKey)) continue;
//             if (jsonData[jsonKey]) {
//                 for (const label of labels) {
//                     const escapedLabel = label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
//                     // Sử dụng non-greedy '.*?' để tránh ăn sang các trường khác trên cùng một dòng
//                     const regex = new RegExp(`(${escapedLabel}:?)([._…\\s]{2,})`, 'g');
//                     if (newText.match(regex)) {
//                         newText = newText.replace(regex, `$1 ${jsonData[jsonKey]}`);
//                         hasBeenModified = true;
//                     }
//                 }
//             }
//         }
//         // --- KẾT THÚC THAY ĐỔI ---
//         if (hasBeenModified) {
//             // ... phần còn lại của hàm không thay đổi ...
//             replacementsMade++;
//             const pPr = p.getElementsByTagName('w:pPr')[0];
//             const firstRun = p.getElementsByTagName('w:r')[0];
//             const rPr = firstRun ? firstRun.getElementsByTagName('w:rPr')[0] : null;
//             while (p.firstChild) {
//                 p.removeChild(p.firstChild);
//             }
//             if (pPr) {
//                 p.appendChild(pPr.cloneNode(true));
//             }
//             const newRun = xmlDoc.createElementNS(
//                 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
//                 'w:r'
//             );
//             if (rPr) {
//                 newRun.appendChild(rPr.cloneNode(true));
//             }
//             const newTextNode = xmlDoc.createElementNS(
//                 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
//                 'w:t'
//             );
//             newTextNode.textContent = newText;
//             const spaceAttr = xmlDoc.createAttribute('xml:space');
//             spaceAttr.value = 'preserve';
//             newTextNode.setAttributeNode(spaceAttr);
//             newRun.appendChild(newTextNode);
//             p.appendChild(newRun);
//             console.log(`Đã cập nhật đoạn văn: "${newText}"`);
//         }
//     }
//     if (replacementsMade === 0) {
//         throw new Error(
//             'Không tìm thấy trường nào để thay thế. File có thể có cấu trúc phức tạp hoặc không chứa các nhãn cần tìm.'
//         );
//     }
//     const serializer = new XMLSerializer();
//     const newXmlString = serializer.serializeToString(xmlDoc);
//     zip.file('word/document.xml', newXmlString);
//     const out = zip.generate({ type: 'blob' });
//     saveAs(out, `processed_${file.name}`);
// };
// // const processDocumentByParagraph = async (file: File, jsonData: { [key: string]: any }) => {
// //     const arrayBuffer = await file.arrayBuffer();
// //     const zip = new PizZip(arrayBuffer);
// //     const docXml = zip.file('word/document.xml');
// //     if (!docXml) {
// //         throw new Error('File docx không hợp lệ hoặc bị hỏng (không tìm thấy word/document.xml).');
// //     }
// //     const xmlString = docXml.asText();
// //     const parser = new DOMParser();
// //     const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
// //     const paragraphs = xmlDoc.getElementsByTagName('w:p');
// //     let replacementsMade = 0;
// //     for (let i = 0; i < paragraphs.length; i++) {
// //         const p = paragraphs[i];
// //         const fullText = Array.from(p.getElementsByTagName('w:t'))
// //             .map(t => t.textContent)
// //             .join('');
// //         let newText = fullText;
// //         let hasBeenModified = false;
// //         for (const [jsonKey, labels] of Object.entries(fieldMappings)) {
// //             if (jsonData[jsonKey]) {
// //                 for (const label of labels) {
// //                     const escapedLabel = label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
// //                     // Regex để tìm nhãn và các ký tự placeholder theo sau (dấu chấm, gạch dưới, khoảng trắng)
// //                     const regex = new RegExp(`(${escapedLabel}:?)([._…\\s]{2,})`, 'g');
// //                     if (newText.match(regex)) {
// //                         newText = newText.replace(regex, `$1 ${jsonData[jsonKey]}`);
// //                         hasBeenModified = true;
// //                     }
// //                 }
// //             }
// //         }
// //         if (hasBeenModified) {
// //             replacementsMade++;
// //             // Giữ lại định dạng của đoạn văn và của text
// //             const pPr = p.getElementsByTagName('w:pPr')[0];
// //             const firstRun = p.getElementsByTagName('w:r')[0];
// //             const rPr = firstRun ? firstRun.getElementsByTagName('w:rPr')[0] : null;
// //             // Xóa nội dung cũ
// //             while (p.firstChild) {
// //                 p.removeChild(p.firstChild);
// //             }
// //             // Thêm lại định dạng đoạn văn
// //             if (pPr) {
// //                 p.appendChild(pPr.cloneNode(true));
// //             }
// //             // Tạo và thêm nội dung text mới với định dạng cũ
// //             const newRun = xmlDoc.createElementNS(
// //                 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
// //                 'w:r'
// //             );
// //             if (rPr) {
// //                 newRun.appendChild(rPr.cloneNode(true));
// //             }
// //             const newTextNode = xmlDoc.createElementNS(
// //                 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
// //                 'w:t'
// //             );
// //             newTextNode.textContent = newText;
// //             newTextNode.setAttribute('xml:space', 'preserve');
// //             newRun.appendChild(newTextNode);
// //             p.appendChild(newRun);
// //         }
// //     }
// //     if (replacementsMade === 0) {
// //         throw new Error(
// //             'Không tìm thấy trường nào để thay thế. Vui lòng kiểm tra file mẫu và các nhãn trong code.'
// //         );
// //     }
// //     const serializer = new XMLSerializer();
// //     const newXmlString = serializer.serializeToString(xmlDoc);
// //     zip.file('word/document.xml', newXmlString);
// //     const out = zip.generate({ type: 'blob' });
// //     saveAs(out, `filled_${file.name}`);
// // };
// // --- REACT COMPONENT ---
// function WordFillerComponent() {
//     const [state, setState] = useState<DocumentState>({
//         file: null,
//         isLoading: false,
//         error: null,
//         jsonData: JSON.stringify(
//             { ho_ten: '', ngay_sinh: '', so_cccd: '', noi_cu_tru: '' },
//             null,
//             2
//         ),
//         socketStatus: 'disconnected'
//     });
//     const fileInputRef = useRef<HTMLInputElement>(null);
//     // WebSocket Logic
//     useEffect(() => {
//         const socket: Socket = io(API_URL, { transports: ['websocket'] });
//         socket.on('connect', () => setState(prev => ({ ...prev, socketStatus: 'connected' })));
//         socket.on('disconnect', () =>
//             setState(prev => ({ ...prev, socketStatus: 'disconnected' }))
//         );
//         socket.on('data_received', data => {
//             if (data) {
//                 setState(prev => ({
//                     ...prev,
//                     jsonData: JSON.stringify(data, null, 2),
//                     error: null
//                 }));
//                 // alert('Đã nhận được dữ liệu từ thiết bị di động!');
//             }
//         });
//         return () => {
//             socket.disconnect();
//         };
//     }, []);
//     const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
//         const file = event.target.files?.[0];
//         if (!file) return;
//         if (!file.name.toLowerCase().endsWith('.docx')) {
//             setState(prev => ({ ...prev, error: 'Chỉ hỗ trợ file .docx.' }));
//             return;
//         }
//         setState(prev => ({ ...prev, file, error: null }));
//     }, []);
//     const handleJsonDataChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
//         setState(prev => ({ ...prev, jsonData: event.target.value }));
//     }, []);
//     const handleGenerateDocument = async () => {
//         if (!state.file) {
//             setState(prev => ({ ...prev, error: 'Vui lòng tải lên một file Word mẫu.' }));
//             return;
//         }
//         setState(prev => ({ ...prev, isLoading: true, error: null }));
//         try {
//             const parsedJson = JSON.parse(state.jsonData);
//             await processDocumentByParagraph(state.file, parsedJson);
//         } catch (error) {
//             const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định.';
//             setState(prev => ({ ...prev, error: errorMessage }));
//         } finally {
//             setState(prev => ({ ...prev, isLoading: false }));
//         }
//     };
//     return (
//         <Box sx={{ p: 3, maxWidth: 800, margin: 'auto' }}>
//             <Box
//                 sx={{
//                     display: 'flex',
//                     justifyContent: 'space-between',
//                     alignItems: 'center',
//                     mb: 2
//                 }}
//             >
//                 <Typography variant="h4" gutterBottom>
//                     Client-Side Word Filler
//                 </Typography>
//                 <Chip
//                     icon={state.socketStatus === 'connected' ? <WifiIcon /> : <WifiOffIcon />}
//                     label={state.socketStatus === 'connected' ? 'Đã kết nối' : 'Đang chờ dữ liệu'}
//                     color={state.socketStatus === 'connected' ? 'success' : 'warning'}
//                 />
//             </Box>
//             <Paper sx={{ p: 3, mb: 3 }}>
//                 <Typography variant="h6" gutterBottom>
//                     Bước 1: Tải lên file mẫu (.docx)
//                 </Typography>
//                 <input
//                     type="file"
//                     ref={fileInputRef}
//                     onChange={handleFileUpload}
//                     accept=".docx"
//                     style={{ display: 'none' }}
//                 />
//                 <Button
//                     variant="contained"
//                     startIcon={<UploadIcon />}
//                     onClick={() => fileInputRef.current?.click()}
//                 >
//                     Chọn File
//                 </Button>
//                 {state.file && (
//                     <Chip
//                         label={state.file.name}
//                         color="success"
//                         sx={{ ml: 2 }}
//                         onDelete={() => setState(p => ({ ...p, file: null }))}
//                     />
//                 )}
//             </Paper>
//             {state.file && (
//                 <Paper sx={{ p: 3, mb: 3 }}>
//                     <Typography variant="h6" gutterBottom>
//                         Bước 2: Dữ liệu (Tự động cập nhật từ Mobile)
//                     </Typography>
//                     <TextField
//                         label="JSON Data"
//                         multiline
//                         rows={10}
//                         fullWidth
//                         value={state.jsonData}
//                         onChange={handleJsonDataChange}
//                         sx={{ fontFamily: 'monospace', mb: 2 }}
//                     />
//                     <Button
//                         variant="contained"
//                         startIcon={
//                             state.isLoading ? <CircularProgress size={20} /> : <PlayArrowIcon />
//                         }
//                         onClick={handleGenerateDocument}
//                         disabled={state.isLoading}
//                     >
//                         {state.isLoading ? 'Đang xử lý...' : 'Tạo và Tải tài liệu'}
//                     </Button>
//                 </Paper>
//             )}
//             {state.error && (
//                 <Alert severity="error" sx={{ mt: 2 }}>
//                     {state.error}
//                 </Alert>
//             )}
//         </Box>
//     );
// }
// export const Route = createLazyFileRoute('/word-mapper/')({
//     component: WordFillerComponent
// });
// // /////////////////////////////////////////////////////////////
// import React, { useCallback, useEffect, useRef, useState } from 'react';
// import { saveAs } from 'file-saver';
// // Thư viện xử lý file word phía client
// import PizZip from 'pizzip';
// import { Socket, io } from 'socket.io-client';
// import {
//     PlayArrow as PlayArrowIcon,
//     Upload as UploadIcon,
//     Wifi as WifiIcon,
//     WifiOff as WifiOffIcon
// } from '@mui/icons-material';
// import {
//     Alert,
//     Box,
//     Button,
//     Chip,
//     CircularProgress,
//     Paper,
//     TextField,
//     Typography
// } from '@mui/material';
// import { createLazyFileRoute } from '@tanstack/react-router';
// // --- URL CỦA API SERVER ---
// // !!! QUAN TRỌNG: Phải giống với URL trong Mobile App
// const API_URL = 'https://f1f4d5f80a60.ngrok-free.app';
// interface DocumentState {
//     file: File | null;
//     isLoading: boolean;
//     error: string | null;
//     jsonData: string;
//     socketStatus: 'connected' | 'disconnected';
// }
// // --- LOGIC XỬ LÝ FILE WORD BẰNG PIZZIP ---
// const fieldMappings = {
//     ho_ten: [
//         'Họ và tên',
//         'Họ, chữ đệm, tên',
//         'Họ tên',
//         'Tên tổ chức, cá nhân được nhà nước giao đất, cho thuê đất',
//         'Họ, chữ đệm, tên người yêu cầu',
//         'Tên(2)',
//         'Tên'
//     ],
//     ngay_sinh_full: ['Ngày, tháng, năm sinh', 'Ngày sinh:', 'Ngày, tháng, năm sinh'],
//     so_cccd: [
//         'Số CCCD',
//         'CCCD',
//         'Căn cước công dân',
//         'Số CMND/CCCD/Hộ chiếu/TCC',
//         'Số CMND hoặc căn cước công dân'
//     ],
//     noi_cu_tru: ['Nơi cư trú', 'Địa chỉ cư trú', 'Chỗ ở hiện tại', 'Địa chỉ', 'Nơi ở hiện nay'],
//     ngay_cap_cccd: ['Ngày cấp CCCD', 'Ngày cấp', 'Cấp ngày', 'ngày cấp'],
//     gioi_tinh: ['Giới tính'],
//     ngay: ['Sinh ngày'],
//     thang: ['tháng'],
//     nam: ['năm']
// };
// /**
//  * Tìm và thay thế các placeholder trong file .docx bằng dữ liệu từ JSON.
//  * @param {File} file - File .docx do người dùng tải lên.
//  * @param {object} jsonData - Đối tượng JSON chứa dữ liệu để điền.
//  */
// const processDocumentByParagraph = async (file: File, jsonData: { [key: string]: any }) => {
//     const arrayBuffer = await file.arrayBuffer();
//     const zip = new PizZip(arrayBuffer);
//     const docXml = zip.file('word/document.xml');
//     if (!docXml) throw new Error('File .docx không hợp lệ hoặc bị hỏng.');
//     const xmlString = docXml.asText();
//     const parser = new DOMParser();
//     const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
//     const paragraphs = xmlDoc.getElementsByTagName('w:p');
//     let replacementsMade = 0;
//     for (let i = 0; i < paragraphs.length; i++) {
//         const p = paragraphs[i];
//         const fullText = Array.from(p.getElementsByTagName('w:t'))
//             .map(t => t.textContent)
//             .join('');
//         let newText = fullText;
//         let hasBeenModified = false;
//         let wasHandledByComplexRule = false;
//         if (jsonData.ngay && jsonData.thang && jsonData.nam && jsonData.gioi_tinh) {
//             // const combinedRegex =
//             //     /(Sinh ngày)\s*:?\s*[._…\s]+(tháng)\s*:?\s*[._…\s]+(năm)\s*:?\s*[._…\s]+(Giới tính)\s*:?\s*[._…\s]+/g;
//             // **FIX 1: Bỏ cờ global /g để chỉ thay thế lần đầu tiên**
//             const combinedRegex =
//                 /(Sinh ngày)\s*:?\s*[._…\s]+(tháng)\s*:?\s*[._…\s]+(năm)\s*:?\s*[._…\s]+(Giới tính)\s*:?\s*[._…\s]+/;
//             if (combinedRegex.test(fullText)) {
//                 // **FIX: Thêm dấu ":" vào chuỗi thay thế**
//                 const replacement = `$1: ${jsonData.ngay}  $2: ${jsonData.thang}  $3: ${jsonData.nam}  $4: ${jsonData.gioi_tinh}`;
//                 newText = fullText.replace(combinedRegex, replacement);
//                 hasBeenModified = true;
//                 wasHandledByComplexRule = true;
//             }
//         }
//         if (!wasHandledByComplexRule) {
//             for (const [jsonKey, labels] of Object.entries(fieldMappings)) {
//                 if (jsonData[jsonKey]) {
//                     for (const label of labels) {
//                         const escapedLabel = label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
//                         const simpleRegex = new RegExp(
//                             `(${escapedLabel}\\s*:?)([._…\\s]{2,})`,
//                             'g'
//                         );
//                         if (newText.match(simpleRegex)) {
//                             newText = newText.replace(simpleRegex, `$1 ${jsonData[jsonKey]}`);
//                             hasBeenModified = true;
//                         }
//                     }
//                 }
//             }
//         }
//         if (hasBeenModified) {
//             replacementsMade++;
//             const pPr = p.getElementsByTagName('w:pPr')[0];
//             const firstRun = p.getElementsByTagName('w:r')[0];
//             const rPr = firstRun ? firstRun.getElementsByTagName('w:rPr')[0] : null;
//             while (p.firstChild) p.removeChild(p.firstChild);
//             if (pPr) p.appendChild(pPr.cloneNode(true));
//             const newRun = xmlDoc.createElementNS(
//                 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
//                 'w:r'
//             );
//             if (rPr) newRun.appendChild(rPr.cloneNode(true));
//             const newTextNode = xmlDoc.createElementNS(
//                 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
//                 'w:t'
//             );
//             newTextNode.textContent = newText;
//             newTextNode.setAttribute('xml:space', 'preserve');
//             newRun.appendChild(newTextNode);
//             p.appendChild(newRun);
//         }
//     }
//     if (replacementsMade === 0) {
//         throw new Error('Không tìm thấy bất kỳ trường thông tin nào để thay thế.');
//     }
//     const serializer = new XMLSerializer();
//     const newXmlString = serializer.serializeToString(xmlDoc);
//     zip.file('word/document.xml', newXmlString);
//     const out = zip.generate({ type: 'blob' });
//     saveAs(out, `processed_${file.name}`);
// };
// function WordFillerComponent() {
//     const [state, setState] = useState<DocumentState>({
//         file: null,
//         isLoading: false,
//         error: null,
//         jsonData: JSON.stringify(
//             { ho_ten: '', ngay_sinh: '', so_cccd: '', noi_cu_tru: '' },
//             null,
//             2
//         ),
//         socketStatus: 'disconnected'
//     });
//     const fileInputRef = useRef<HTMLInputElement>(null);
//     // **FIX 3: SỬA LỖI WEBSOCKET**
//     useEffect(() => {
//         const socket = io(API_URL, { transports: ['websocket'] });
//         const onConnect = () => setState(p => ({ ...p, socketStatus: 'connected' }));
//         const onDisconnect = () => setState(p => ({ ...p, socketStatus: 'disconnected' }));
//         const onDataReceived = (data: any) => {
//             if (data) {
//                 setState(p => ({ ...p, jsonData: JSON.stringify(data, null, 2), error: null }));
//             }
//         };
//         socket.on('connect', onConnect);
//         socket.on('disconnect', onDisconnect);
//         socket.on('data_received', onDataReceived);
//         return () => {
//             // Hàm dọn dẹp
//             socket.off('connect', onConnect);
//             socket.off('disconnect', onDisconnect);
//             socket.off('data_received', onDataReceived);
//             socket.disconnect();
//         };
//     }, []);
//     const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
//         const file = event.target.files?.[0];
//         if (!file) return;
//         if (!file.name.toLowerCase().endsWith('.docx')) {
//             setState(prev => ({ ...prev, error: 'Chỉ hỗ trợ file .docx.' }));
//             return;
//         }
//         setState(prev => ({ ...prev, file, error: null }));
//     }, []);
//     const handleJsonDataChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
//         setState(prev => ({ ...prev, jsonData: event.target.value }));
//     }, []);
//     const handleGenerateDocument = async () => {
//         if (!state.file) {
//             setState(prev => ({ ...prev, error: 'Vui lòng tải lên một file Word mẫu.' }));
//             return;
//         }
//         setState(prev => ({ ...prev, isLoading: true, error: null }));
//         try {
//             const parsedJson = JSON.parse(state.jsonData);
//             // Logic tách ngày sinh vẫn rất quan trọng
//             const augmentedData = { ...parsedJson };
//             if (parsedJson.ngay_sinh && typeof parsedJson.ngay_sinh === 'string') {
//                 const dateParts = parsedJson.ngay_sinh.split('/');
//                 if (dateParts.length === 3) {
//                     augmentedData.ngay = dateParts[0];
//                     augmentedData.thang = dateParts[1];
//                     augmentedData.nam = dateParts[2];
//                 }
//             }
//             await processDocumentByParagraph(state.file, augmentedData);
//         } catch (error) {
//             const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định.';
//             setState(prev => ({ ...prev, error: errorMessage }));
//         } finally {
//             setState(prev => ({ ...prev, isLoading: false }));
//         }
//     };
//     return (
//         <Box sx={{ p: 3, maxWidth: 800, margin: 'auto' }}>
//             <Box
//                 sx={{
//                     display: 'flex',
//                     justifyContent: 'space-between',
//                     alignItems: 'center',
//                     mb: 2
//                 }}
//             >
//                 <Typography variant="h4" gutterBottom>
//                     Client-Side Word Filler
//                 </Typography>
//                 <Chip
//                     icon={state.socketStatus === 'connected' ? <WifiIcon /> : <WifiOffIcon />}
//                     label={state.socketStatus === 'connected' ? 'Đã kết nối' : 'Đang chờ dữ liệu'}
//                     color={state.socketStatus === 'connected' ? 'success' : 'warning'}
//                 />
//             </Box>
//             <Paper sx={{ p: 3, mb: 3 }}>
//                 <Typography variant="h6" gutterBottom>
//                     Bước 1: Tải lên file mẫu (.docx)
//                 </Typography>
//                 <input
//                     type="file"
//                     ref={fileInputRef}
//                     onChange={handleFileUpload}
//                     accept=".docx"
//                     style={{ display: 'none' }}
//                 />
//                 <Button
//                     variant="contained"
//                     startIcon={<UploadIcon />}
//                     onClick={() => fileInputRef.current?.click()}
//                 >
//                     Chọn File
//                 </Button>
//                 {state.file && (
//                     <Chip
//                         label={state.file.name}
//                         color="success"
//                         sx={{ ml: 2 }}
//                         onDelete={() => setState(p => ({ ...p, file: null }))}
//                     />
//                 )}
//             </Paper>
//             {state.file && (
//                 <Paper sx={{ p: 3, mb: 3 }}>
//                     <Typography variant="h6" gutterBottom>
//                         Bước 2: Dữ liệu (Tự động cập nhật từ Mobile)
//                     </Typography>
//                     <TextField
//                         label="JSON Data"
//                         multiline
//                         rows={10}
//                         fullWidth
//                         value={state.jsonData}
//                         onChange={handleJsonDataChange}
//                         sx={{ fontFamily: 'monospace', mb: 2 }}
//                     />
//                     <Button
//                         variant="contained"
//                         startIcon={
//                             state.isLoading ? <CircularProgress size={20} /> : <PlayArrowIcon />
//                         }
//                         onClick={handleGenerateDocument}
//                         disabled={state.isLoading}
//                     >
//                         {state.isLoading ? 'Đang xử lý...' : 'Tạo và Tải tài liệu'}
//                     </Button>
//                 </Paper>
//             )}
//             {state.error && (
//                 <Alert severity="error" sx={{ mt: 2 }}>
//                     {state.error}
//                 </Alert>
//             )}
//         </Box>
//     );
// }
// export const Route = createLazyFileRoute('/word-mapper/')({
//     component: WordFillerComponent
// });
// // /////////////////////////////////////////////////////////////
// import React, { useCallback, useEffect, useRef, useState } from 'react';
// import { saveAs } from 'file-saver';
// import mammoth from 'mammoth';
// // THÊM IMPORT NÀY
// import PizZip from 'pizzip';
// import { Socket, io } from 'socket.io-client';
// import {
//     // THÊM ICON IN
//     Download as DownloadIcon,
//     // THÊM ICON TẢI VỀ
//     PlayArrow as PlayArrowIcon,
//     Print as PrintIcon,
//     Upload as UploadIcon,
//     Wifi as WifiIcon,
//     WifiOff as WifiOffIcon
// } from '@mui/icons-material';
// import {
//     Alert,
//     Box,
//     Button,
//     Chip,
//     CircularProgress,
//     Divider,
//     Grid,
//     Paper,
//     TextField,
//     Typography
// } from '@mui/material';
// import { createLazyFileRoute } from '@tanstack/react-router';
// // --- URL CỦA API SERVER ---
// const API_URL = 'https://f1f4d5f80a60.ngrok-free.app';
// // --- CẬP NHẬT STATE VÀ TYPE DEFINITIONS ---
// interface DocumentState {
//     file: File | null;
//     isLoading: boolean;
//     error: string | null;
//     jsonData: string;
//     socketStatus: 'connected' | 'disconnected';
//     previewHtml: string | null; // State mới để lưu HTML preview
//     generatedBlob: Blob | null; // State mới để lưu file Word đã xử lý
// }
// // --- LOGIC XỬ LÝ FILE WORD (GIỮ NGUYÊN) ---
// const fieldMappings = {
//     ho_ten: [
//         'Họ và tên',
//         'Họ, chữ đệm, tên',
//         'Họ tên',
//         'Tên tổ chức, cá nhân được nhà nước giao đất, cho thuê đất',
//         'Họ, chữ đệm, tên người yêu cầu',
//         'Tên(2)',
//         'Tên'
//     ],
//     ngay_sinh_full: ['Ngày, tháng, năm sinh', 'Ngày sinh:', 'Ngày, tháng, năm sinh'],
//     so_cccd: [
//         'Số CCCD',
//         'CCCD',
//         'Căn cước công dân',
//         'Số CMND/CCCD/Hộ chiếu/TCC',
//         'Số CMND hoặc căn cước công dân'
//     ],
//     noi_cu_tru: ['Nơi cư trú', 'Địa chỉ cư trú', 'Chỗ ở hiện tại', 'Địa chỉ', 'Nơi ở hiện nay'],
//     ngay_cap_cccd: [
//         'Ngày cấp CCCD',
//         'Ngày cấp',
//         'Cấp ngày',
//         'ngày cấp',
//         'cấp ngày',
//         'Ngày cấp căn cước'
//     ],
//     gioi_tinh: ['Giới tính'],
//     ngay: ['Sinh ngày'],
//     thang: ['tháng'],
//     nam: ['năm']
// };
// /**
//  * Tìm và thay thế các placeholder, trả về file Blob đã xử lý.
//  */
// const processDocumentByParagraph = async (
//     file: File,
//     jsonData: { [key: string]: any }
// ): Promise<Blob> => {
//     const arrayBuffer = await file.arrayBuffer();
//     const zip = new PizZip(arrayBuffer);
//     const docXml = zip.file('word/document.xml');
//     if (!docXml) throw new Error('File .docx không hợp lệ hoặc bị hỏng.');
//     const xmlString = docXml.asText();
//     const parser = new DOMParser();
//     const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
//     const paragraphs = xmlDoc.getElementsByTagName('w:p');
//     let replacementsMade = 0;
//     for (let i = 0; i < paragraphs.length; i++) {
//         const p = paragraphs[i];
//         const fullText = Array.from(p.getElementsByTagName('w:t'))
//             .map(t => t.textContent)
//             .join('');
//         let newText = fullText;
//         let hasBeenModified = false;
//         let wasHandledByComplexRule = false;
//         // Xử lý quy tắc phức tạp cho ngày sinh và giới tính trên cùng dòng
//         if (jsonData.ngay && jsonData.thang && jsonData.nam && jsonData.gioi_tinh) {
//             const combinedRegex =
//                 /(Sinh ngày)\s*:?\s*[._…\s]+(tháng)\s*:?\s*[._…\s]+(năm)\s*:?\s*[._…\s]+(Giới tính)\s*:?\s*[._…\s]+/;
//             if (combinedRegex.test(fullText)) {
//                 const replacement = `$1: ${jsonData.ngay}  $2: ${jsonData.thang}  $3: ${jsonData.nam}  $4: ${jsonData.gioi_tinh}`;
//                 newText = fullText.replace(combinedRegex, replacement);
//                 hasBeenModified = true;
//                 wasHandledByComplexRule = true;
//             }
//         }
//         // Xử lý các quy tắc đơn giản
//         if (!wasHandledByComplexRule) {
//             for (const [jsonKey, labels] of Object.entries(fieldMappings)) {
//                 if (jsonData[jsonKey]) {
//                     for (const label of labels) {
//                         const escapedLabel = label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
//                         const simpleRegex = new RegExp(
//                             `(${escapedLabel}\\s*:?)([._…\\s]{2,})`,
//                             'g'
//                         );
//                         if (newText.match(simpleRegex)) {
//                             newText = newText.replace(simpleRegex, `$1 ${jsonData[jsonKey]}`);
//                             hasBeenModified = true;
//                         }
//                     }
//                 }
//             }
//         }
//         if (hasBeenModified) {
//             replacementsMade++;
//             const pPr = p.getElementsByTagName('w:pPr')[0];
//             const firstRun = p.getElementsByTagName('w:r')[0];
//             const rPr = firstRun ? firstRun.getElementsByTagName('w:rPr')[0] : null;
//             while (p.firstChild) p.removeChild(p.firstChild);
//             if (pPr) p.appendChild(pPr.cloneNode(true));
//             const newRun = xmlDoc.createElementNS(
//                 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
//                 'w:r'
//             );
//             if (rPr) newRun.appendChild(rPr.cloneNode(true));
//             const newTextNode = xmlDoc.createElementNS(
//                 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
//                 'w:t'
//             );
//             newTextNode.textContent = newText;
//             newTextNode.setAttribute('xml:space', 'preserve');
//             newRun.appendChild(newTextNode);
//             p.appendChild(newRun);
//         }
//     }
//     if (replacementsMade === 0) {
//         throw new Error('Không tìm thấy bất kỳ trường thông tin nào để thay thế.');
//     }
//     const serializer = new XMLSerializer();
//     const newXmlString = serializer.serializeToString(xmlDoc);
//     zip.file('word/document.xml', newXmlString);
//     // Trả về Blob thay vì tải xuống ngay
//     return zip.generate({ type: 'blob' });
// };
// // --- React Component ---
// function WordFillerComponent() {
//     const [state, setState] = useState<DocumentState>({
//         file: null,
//         isLoading: false,
//         error: null,
//         jsonData: JSON.stringify(
//             { ho_ten: '', ngay_sinh: '', so_cccd: '', noi_cu_tru: '' },
//             null,
//             2
//         ),
//         socketStatus: 'disconnected',
//         previewHtml: null,
//         generatedBlob: null
//     });
//     const fileInputRef = useRef<HTMLInputElement>(null);
//     useEffect(() => {
//         const socket = io(API_URL, { transports: ['websocket'] });
//         const onConnect = () => setState(p => ({ ...p, socketStatus: 'connected' }));
//         const onDisconnect = () => setState(p => ({ ...p, socketStatus: 'disconnected' }));
//         const onDataReceived = (data: any) => {
//             if (data) {
//                 setState(p => ({ ...p, jsonData: JSON.stringify(data, null, 2), error: null }));
//             }
//         };
//         socket.on('connect', onConnect);
//         socket.on('disconnect', onDisconnect);
//         socket.on('data_received', onDataReceived);
//         return () => {
//             socket.off('connect', onConnect);
//             socket.off('disconnect', onDisconnect);
//             socket.off('data_received', onDataReceived);
//             socket.disconnect();
//         };
//     }, []);
//     const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
//         const file = event.target.files?.[0];
//         if (!file) return;
//         if (!file.name.toLowerCase().endsWith('.docx')) {
//             setState(prev => ({ ...prev, error: 'Chỉ hỗ trợ file .docx.' }));
//             return;
//         }
//         // Reset preview khi tải file mới
//         setState(prev => ({ ...prev, file, error: null, previewHtml: null, generatedBlob: null }));
//     }, []);
//     const handleJsonDataChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
//         setState(prev => ({ ...prev, jsonData: event.target.value }));
//     }, []);
//     const handleGenerateAndPreview = async () => {
//         if (!state.file) {
//             setState(prev => ({ ...prev, error: 'Vui lòng tải lên một file Word mẫu.' }));
//             return;
//         }
//         setState(prev => ({ ...prev, isLoading: true, error: null }));
//         try {
//             const parsedJson = JSON.parse(state.jsonData);
//             const augmentedData = { ...parsedJson };
//             if (parsedJson.ngay_sinh && typeof parsedJson.ngay_sinh === 'string') {
//                 const dateParts = parsedJson.ngay_sinh.split('/');
//                 if (dateParts.length === 3) {
//                     augmentedData.ngay = dateParts[0];
//                     augmentedData.thang = dateParts[1];
//                     augmentedData.nam = dateParts[2];
//                 }
//             }
//             // 1. Tạo file Word đã điền dữ liệu (dưới dạng Blob)
//             const blob = await processDocumentByParagraph(state.file, augmentedData);
//             // 2. Chuyển đổi Blob đó sang HTML để xem trước
//             const arrayBuffer = await blob.arrayBuffer();
//             const result = await mammoth.convertToHtml({ arrayBuffer });
//             // 3. Cập nhật state với file đã tạo và HTML preview
//             setState(prev => ({
//                 ...prev,
//                 generatedBlob: blob,
//                 previewHtml: result.value
//             }));
//         } catch (error) {
//             const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định.';
//             setState(prev => ({ ...prev, error: errorMessage }));
//         } finally {
//             setState(prev => ({ ...prev, isLoading: false }));
//         }
//     };
//     const handleDownload = () => {
//         if (state.generatedBlob && state.file) {
//             saveAs(state.generatedBlob, `processed_${state.file.name}`);
//         }
//     };
//     const handlePrint = () => {
//         if (!state.previewHtml) return;
//         const printWindow = window.open('', '_blank');
//         if (printWindow) {
//             printWindow.document.write('<html><head><title>In tài liệu</title>');
//             // Thêm CSS để định dạng trang in giống A4
//             printWindow.document.write(`
//                 <style>
//                     body { font-family: 'Times New Roman', Times, serif; margin: 2cm; }
//                     @page { size: A4; margin: 2cm; }
//                     table { width: 100%; border-collapse: collapse; }
//                     th, td { border: 1px solid black; padding: 8px; }
//                 </style>
//             `);
//             printWindow.document.write('</head><body>');
//             printWindow.document.write(state.previewHtml);
//             printWindow.document.write('</body></html>');
//             printWindow.document.close();
//             printWindow.focus();
//             printWindow.print();
//             printWindow.close();
//         }
//     };
//     return (
//         <Box sx={{ p: 3, maxWidth: 1000, margin: 'auto' }}>
//             <Box
//                 sx={{
//                     display: 'flex',
//                     justifyContent: 'space-between',
//                     alignItems: 'center',
//                     mb: 2
//                 }}
//             >
//                 <Typography variant="h4" gutterBottom>
//                     Client-Side Word Filler
//                 </Typography>
//                 <Chip
//                     icon={state.socketStatus === 'connected' ? <WifiIcon /> : <WifiOffIcon />}
//                     label={state.socketStatus === 'connected' ? 'Đã kết nối' : 'Đang chờ dữ liệu'}
//                     color={state.socketStatus === 'connected' ? 'success' : 'warning'}
//                 />
//             </Box>
//             <Grid container spacing={3}>
//                 {/* Cột điều khiển */}
//                 <Grid>
//                     <Paper sx={{ p: 3, mb: 3 }}>
//                         <Typography variant="h6" gutterBottom>
//                             Bước 1: Tải lên file mẫu (.docx)
//                         </Typography>
//                         <input
//                             type="file"
//                             ref={fileInputRef}
//                             onChange={handleFileUpload}
//                             accept=".docx"
//                             style={{ display: 'none' }}
//                         />
//                         <Button
//                             variant="contained"
//                             startIcon={<UploadIcon />}
//                             onClick={() => fileInputRef.current?.click()}
//                         >
//                             Chọn File
//                         </Button>
//                         {state.file && (
//                             <Chip
//                                 label={state.file.name}
//                                 color="success"
//                                 sx={{ ml: 2 }}
//                                 onDelete={() =>
//                                     setState(p => ({
//                                         ...p,
//                                         file: null,
//                                         previewHtml: null,
//                                         generatedBlob: null
//                                     }))
//                                 }
//                             />
//                         )}
//                     </Paper>
//                     {state.file && (
//                         <Paper sx={{ p: 3, mb: 3 }}>
//                             <Typography variant="h6" gutterBottom>
//                                 Bước 2: Dữ liệu (Tự động cập nhật)
//                             </Typography>
//                             <TextField
//                                 label="JSON Data"
//                                 multiline
//                                 rows={10}
//                                 fullWidth
//                                 value={state.jsonData}
//                                 onChange={handleJsonDataChange}
//                                 sx={{ fontFamily: 'monospace', mb: 2 }}
//                             />
//                             <Button
//                                 variant="contained"
//                                 startIcon={
//                                     state.isLoading ? (
//                                         <CircularProgress size={20} />
//                                     ) : (
//                                         <PlayArrowIcon />
//                                     )
//                                 }
//                                 onClick={handleGenerateAndPreview}
//                                 disabled={state.isLoading}
//                             >
//                                 {state.isLoading ? 'Đang xử lý...' : 'Tạo & Xem trước'}
//                             </Button>
//                         </Paper>
//                     )}
//                 </Grid>
//                 {/* Cột xem trước */}
//                 <Grid>
//                     {state.previewHtml && (
//                         <Paper sx={{ p: 3 }}>
//                             <Typography variant="h6" gutterBottom>
//                                 Bước 3: Xem trước và Tùy chọn
//                             </Typography>
//                             <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
//                                 <Button
//                                     variant="outlined"
//                                     startIcon={<PrintIcon />}
//                                     onClick={handlePrint}
//                                 >
//                                     In tài liệu
//                                 </Button>
//                                 <Button
//                                     variant="outlined"
//                                     startIcon={<DownloadIcon />}
//                                     onClick={handleDownload}
//                                 >
//                                     Tải file Word
//                                 </Button>
//                             </Box>
//                             <Divider sx={{ mb: 2 }} />
//                             <Paper
//                                 variant="outlined"
//                                 sx={{
//                                     p: { xs: 2, sm: 4 },
//                                     bgcolor: 'grey.100',
//                                     height: 600,
//                                     overflowY: 'auto'
//                                 }}
//                             >
//                                 <Box
//                                     className="document-preview"
//                                     sx={{
//                                         bgcolor: 'white',
//                                         p: 4,
//                                         boxShadow: 3,
//                                         mx: 'auto',
//                                         width: '21cm',
//                                         minHeight: '29.7cm'
//                                     }}
//                                 >
//                                     <div dangerouslySetInnerHTML={{ __html: state.previewHtml }} />
//                                 </Box>
//                             </Paper>
//                         </Paper>
//                     )}
//                 </Grid>
//             </Grid>
//             {state.error && (
//                 <Alert severity="error" sx={{ mt: 2 }}>
//                     {state.error}
//                 </Alert>
//             )}
//         </Box>
//     );
// }
// export const Route = createLazyFileRoute('/word-mapper/')({
//     component: WordFillerComponent
// // });
// import React, { useCallback, useEffect, useRef, useState } from 'react';
// // Thư viện xử lý file word phía client
// import { renderAsync } from 'docx-preview';
// import { saveAs } from 'file-saver';
// import PizZip from 'pizzip';
// import { Socket, io } from 'socket.io-client';
// import {
//     Download as DownloadIcon,
//     HourglassTop as HourglassTopIcon,
//     Print as PrintIcon,
//     Upload as UploadIcon,
//     Wifi as WifiIcon,
//     WifiOff as WifiOffIcon
// } from '@mui/icons-material';
// import {
//     Alert,
//     Box,
//     Button,
//     Chip,
//     CircularProgress,
//     Divider,
//     Grid,
//     Paper,
//     TextField,
//     Typography
// } from '@mui/material';
// import { createLazyFileRoute } from '@tanstack/react-router';
// // --- URL CỦA API SERVER ---
// const API_URL = 'https://f1f4d5f80a60.ngrok-free.app';
// // --- CẬP NHẬT STATE VÀ TYPE DEFINITIONS ---
// interface DocumentState {
//     file: File | null;
//     isLoading: boolean;
//     error: string | null;
//     socketStatus: 'connected' | 'disconnected';
//     generatedBlob: Blob | null; // Chỉ cần lưu file blob đã xử lý
// }
// // --- LOGIC XỬ LÝ FILE WORD ---
// const fieldMappings = {
//     ho_ten: [
//         'Họ và tên',
//         'Họ, chữ đệm, tên',
//         'Họ tên',
//         'Tên tổ chức, cá nhân được nhà nước giao đất, cho thuê đất',
//         'Họ, chữ đệm, tên người yêu cầu',
//         'Tên(2)',
//         'Tên'
//     ],
//     ngay_sinh_full: ['Ngày, tháng, năm sinh', 'Ngày sinh:'],
//     so_cccd: [
//         'Số CCCD',
//         'CCCD',
//         'Căn cước công dân',
//         'Số CMND/CCCD/Hộ chiếu/TCC',
//         'Số CMND hoặc căn cước công dân'
//     ],
//     noi_cu_tru: [
//         'Nơi cư trú',
//         'Địa chỉ cư trú',
//         'Chỗ ở hiện tại',
//         'Địa chỉ',
//         'Nơi ở hiện nay',
//         'Địa chỉ(2)'
//     ],
//     ngay_cap_cccd: [
//         'Ngày cấp CCCD',
//         'Ngày cấp',
//         'Cấp ngày',
//         'ngày cấp',
//         'cấp ngày',
//         'Ngày cấp căn cước'
//     ],
//     gioi_tinh: ['Giới tính'],
//     ngay: ['Sinh ngày'],
//     thang: ['tháng'],
//     nam: ['năm']
// };
// /**
//  * Xử lý file Word bằng cách tìm và thay thế ở cấp độ đoạn văn (LOGIC MỚI).
//  * @param file File .docx người dùng tải lên.
//  * @param jsonData Đối tượng JSON chứa dữ liệu để điền.
//  */
// const processDocumentByParagraph = async (
//     file: File,
//     jsonData: { [key: string]: any }
// ): Promise<Blob> => {
//     // --- BƯỚC 1: CHUẨN BỊ ---
//     const allMappings: { label: string; jsonKey: string }[] = [];
//     for (const [jsonKey, labels] of Object.entries(fieldMappings)) {
//         for (const label of labels) {
//             allMappings.push({ label, jsonKey });
//         }
//     }
//     // Sắp xếp các quy tắc: ưu tiên các nhãn dài hơn, cụ thể hơn trước.
//     allMappings.sort((a, b) => b.label.length - a.label.length);
//     // --- BƯỚC 2: THỰC THI ---
//     const arrayBuffer = await file.arrayBuffer();
//     const zip = new PizZip(arrayBuffer);
//     const docXml = zip.file('word/document.xml');
//     if (!docXml) throw new Error('File .docx không hợp lệ hoặc bị hỏng.');
//     const xmlString = docXml.asText();
//     const parser = new DOMParser();
//     const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
//     const paragraphs = xmlDoc.getElementsByTagName('w:p');
//     let replacementsMade = 0;
//     for (let i = 0; i < paragraphs.length; i++) {
//         const p = paragraphs[i];
//         const fullText = Array.from(p.getElementsByTagName('w:t'))
//             .map(t => t.textContent)
//             .join('');
//         let newText = fullText;
//         let hasBeenModifiedInThisParagraph = false;
//         // Lặp qua danh sách quy tắc đã được sắp xếp
//         for (const { label, jsonKey } of allMappings) {
//             if (!jsonData[jsonKey]) {
//                 continue;
//             }
//             const escapedLabel = label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
//             // Regex mới, linh hoạt hơn, xử lý cả (số) và dấu hai chấm
//             // Nó tìm một label, theo sau là các ký tự placeholder
//             const regex = new RegExp(
//                 `(${escapedLabel}(?:\\s*\\(\\d+\\))?\\s*:?)([._…\\s]{2,})`,
//                 'g'
//             );
//             if (newText.match(regex)) {
//                 newText = newText.replace(regex, `$1 ${jsonData[jsonKey]}`);
//                 hasBeenModifiedInThisParagraph = true;
//             }
//         }
//         if (hasBeenModifiedInThisParagraph) {
//             replacementsMade++;
//             const pPr = p.getElementsByTagName('w:pPr')[0];
//             const firstRun = p.getElementsByTagName('w:r')[0];
//             const rPr = firstRun ? firstRun.getElementsByTagName('w:rPr')[0] : null;
//             while (p.firstChild) p.removeChild(p.firstChild);
//             if (pPr) p.appendChild(pPr.cloneNode(true));
//             const newRun = xmlDoc.createElementNS(
//                 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
//                 'w:r'
//             );
//             if (rPr) newRun.appendChild(rPr.cloneNode(true));
//             const newTextNode = xmlDoc.createElementNS(
//                 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
//                 'w:t'
//             );
//             newTextNode.textContent = newText;
//             newTextNode.setAttribute('xml:space', 'preserve');
//             newRun.appendChild(newTextNode);
//             p.appendChild(newRun);
//         }
//     }
//     if (replacementsMade === 0) {
//         throw new Error('Không tìm thấy bất kỳ trường thông tin nào để thay thế.');
//     }
//     const serializer = new XMLSerializer();
//     const newXmlString = serializer.serializeToString(xmlDoc);
//     zip.file('word/document.xml', newXmlString);
//     return zip.generate({ type: 'blob' });
// };
// // --- React Component (Giữ nguyên) ---
// function WordFillerComponent() {
//     const [state, setState] = useState<DocumentState>({
//         file: null,
//         isLoading: false,
//         error: null,
//         socketStatus: 'disconnected',
//         generatedBlob: null
//     });
//     const fileInputRef = useRef<HTMLInputElement>(null);
//     const previewContainerRef = useRef<HTMLDivElement>(null);
//     const fileRef = useRef<File | null>(null);
//     useEffect(() => {
//         fileRef.current = state.file;
//     }, [state.file]);
//     useEffect(() => {
//         if (state.generatedBlob && previewContainerRef.current) {
//             previewContainerRef.current.innerHTML = '';
//             renderAsync(state.generatedBlob, previewContainerRef.current)
//                 .then(() => console.log('Render preview thành công.'))
//                 .catch(err => {
//                     console.error('Lỗi render preview:', err);
//                     setState(p => ({ ...p, error: 'Không thể hiển thị bản xem trước.' }));
//                 });
//         }
//     }, [state.generatedBlob]);
//     useEffect(() => {
//         const socket = io(API_URL, { transports: ['websocket'] });
//         const onConnect = () => setState(p => ({ ...p, socketStatus: 'connected' }));
//         const onDisconnect = () => setState(p => ({ ...p, socketStatus: 'disconnected' }));
//         const onDataReceived = async (data: any) => {
//             const currentFile = fileRef.current;
//             if (data && currentFile) {
//                 setState(p => ({ ...p, isLoading: true, error: null }));
//                 try {
//                     const augmentedData = { ...data };
//                     if (data.ngay_sinh && typeof data.ngay_sinh === 'string') {
//                         const dateParts = data.ngay_sinh.split('/');
//                         if (dateParts.length === 3) {
//                             augmentedData.ngay = dateParts[0];
//                             augmentedData.thang = dateParts[1];
//                             augmentedData.nam = dateParts[2];
//                         }
//                     }
//                     const blob = await processDocumentByParagraph(currentFile, augmentedData);
//                     setState(p => ({ ...p, generatedBlob: blob, isLoading: false }));
//                 } catch (error) {
//                     const errorMessage =
//                         error instanceof Error ? error.message : 'Lỗi không xác định.';
//                     setState(p => ({ ...p, error: errorMessage, isLoading: false }));
//                 }
//             } else if (!currentFile) {
//                 setState(p => ({
//                     ...p,
//                     error: 'Đã nhận dữ liệu, vui lòng tải file Word để áp dụng.'
//                 }));
//             }
//         };
//         socket.on('connect', onConnect);
//         socket.on('disconnect', onDisconnect);
//         socket.on('data_received', onDataReceived);
//         return () => {
//             socket.off('connect', onConnect);
//             socket.off('disconnect', onDisconnect);
//             socket.off('data_received', onDataReceived);
//             socket.disconnect();
//         };
//     }, []);
//     const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
//         const file = event.target.files?.[0];
//         if (!file) return;
//         if (!file.name.toLowerCase().endsWith('.docx')) {
//             setState(prev => ({ ...prev, error: 'Chỉ hỗ trợ file .docx.' }));
//             return;
//         }
//         setState(prev => ({ ...prev, file, error: null, generatedBlob: null }));
//     }, []);
//     const handleDownload = () => {
//         if (state.generatedBlob && state.file) {
//             saveAs(state.generatedBlob, `processed_${state.file.name}`);
//         }
//     };
//     const handlePrint = () => {
//         if (!previewContainerRef.current) return;
//         const printContent = previewContainerRef.current.innerHTML;
//         const printWindow = window.open('', '_blank');
//         if (printWindow) {
//             document.head.querySelectorAll('style').forEach(style => {
//                 printWindow.document.head.appendChild(style.cloneNode(true));
//             });
//             printWindow.document.body.innerHTML = printContent;
//             printWindow.document.close();
//             printWindow.focus();
//             setTimeout(() => {
//                 printWindow.print();
//                 printWindow.close();
//             }, 250);
//         }
//     };
//     return (
//         <Box sx={{ p: 3, maxWidth: 1400, margin: 'auto' }}>
//             <Box
//                 sx={{
//                     display: 'flex',
//                     justifyContent: 'space-between',
//                     alignItems: 'center',
//                     mb: 2
//                 }}
//             >
//                 <Typography variant="h4" gutterBottom>
//                     Client-Side Word Filler
//                 </Typography>
//                 <Chip
//                     icon={state.socketStatus === 'connected' ? <WifiIcon /> : <WifiOffIcon />}
//                     label={state.socketStatus === 'connected' ? 'Đã kết nối' : 'Đang chờ dữ liệu'}
//                     color={state.socketStatus === 'connected' ? 'success' : 'warning'}
//                 />
//             </Box>
//             <Grid container spacing={3}>
//                 <Grid item xs={12} md={state.generatedBlob ? 5 : 12}>
//                     {!state.generatedBlob ? (
//                         <Paper sx={{ p: 3, textAlign: 'center' }}>
//                             <Typography variant="h6" gutterBottom>
//                                 {state.file ? 'Trạng thái' : 'Bắt đầu'}
//                             </Typography>
//                             {!state.file ? (
//                                 <>
//                                     <Typography color="text.secondary" sx={{ mb: 2 }}>
//                                         Vui lòng tải lên một file Word (.docx) để bắt đầu.
//                                     </Typography>
//                                     <input
//                                         type="file"
//                                         ref={fileInputRef}
//                                         onChange={handleFileUpload}
//                                         accept=".docx"
//                                         style={{ display: 'none' }}
//                                     />
//                                     <Button
//                                         variant="contained"
//                                         size="large"
//                                         startIcon={<UploadIcon />}
//                                         onClick={() => fileInputRef.current?.click()}
//                                     >
//                                         Chọn File
//                                     </Button>
//                                 </>
//                             ) : (
//                                 <Box>
//                                     <Chip
//                                         label={state.file.name}
//                                         color="success"
//                                         sx={{ mb: 2 }}
//                                         onDelete={() =>
//                                             setState(p => ({
//                                                 ...p,
//                                                 file: null,
//                                                 generatedBlob: null
//                                             }))
//                                         }
//                                     />
//                                     <Box
//                                         sx={{
//                                             display: 'flex',
//                                             alignItems: 'center',
//                                             justifyContent: 'center',
//                                             gap: 2,
//                                             mt: 2
//                                         }}
//                                     >
//                                         {state.isLoading ? (
//                                             <CircularProgress size={24} />
//                                         ) : (
//                                             <HourglassTopIcon color="action" />
//                                         )}
//                                         <Typography variant="body1" color="text.secondary">
//                                             {state.isLoading
//                                                 ? 'Đang xử lý dữ liệu...'
//                                                 : 'Đang chờ dữ liệu từ Mobile App...'}
//                                         </Typography>
//                                     </Box>
//                                 </Box>
//                             )}
//                         </Paper>
//                     ) : (
//                         <Paper sx={{ p: 3 }}>
//                             <Typography variant="h6" gutterBottom>
//                                 Tùy chọn
//                             </Typography>
//                             <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
//                                 <Button
//                                     variant="outlined"
//                                     startIcon={<PrintIcon />}
//                                     onClick={handlePrint}
//                                 >
//                                     In tài liệu
//                                 </Button>
//                                 <Button
//                                     variant="outlined"
//                                     startIcon={<DownloadIcon />}
//                                     onClick={handleDownload}
//                                 >
//                                     Tải file Word đã điền
//                                 </Button>
//                                 <Divider />
//                                 <Button
//                                     variant="contained"
//                                     color="primary"
//                                     startIcon={<UploadIcon />}
//                                     onClick={() =>
//                                         setState(p => ({
//                                             ...p,
//                                             file: null,
//                                             generatedBlob: null,
//                                             error: null
//                                         }))
//                                     }
//                                 >
//                                     Bắt đầu với file mới
//                                 </Button>
//                             </Box>
//                         </Paper>
//                     )}
//                 </Grid>
//                 {state.generatedBlob && (
//                     <Grid item xs={12} md={7}>
//                         <Paper sx={{ p: 3 }}>
//                             <Typography variant="h6" gutterBottom>
//                                 Xem trước tài liệu
//                             </Typography>
//                             <Divider sx={{ mb: 2 }} />
//                             <Paper
//                                 variant="outlined"
//                                 sx={{
//                                     p: 2,
//                                     bgcolor: 'grey.200',
//                                     height: 600,
//                                     overflowY: 'auto'
//                                 }}
//                             >
//                                 <div ref={previewContainerRef} />
//                             </Paper>
//                         </Paper>
//                     </Grid>
//                 )}
//             </Grid>
//             {state.error && (
//                 <Alert severity="error" sx={{ mt: 2 }}>
//                     {state.error}
//                 </Alert>
//             )}
//         </Box>
//     );
// }
// export const Route = createLazyFileRoute('/word-mapper/')({
//     component: WordFillerComponent
// });
// import React, { useCallback, useEffect, useRef, useState } from 'react';
// // Thư viện xử lý file word phía client
// import { renderAsync } from 'docx-preview';
// import { saveAs } from 'file-saver';
// import PizZip from 'pizzip';
// import { Socket, io } from 'socket.io-client';
// import {
//     CloudUpload as CloudUploadIcon,
//     // THÊM ICON MỚI
//     Download as DownloadIcon,
//     HourglassTop as HourglassTopIcon,
//     Print as PrintIcon,
//     Upload as UploadIcon,
//     Wifi as WifiIcon,
//     WifiOff as WifiOffIcon
// } from '@mui/icons-material';
// import {
//     Alert,
//     Box,
//     Button,
//     Chip,
//     CircularProgress,
//     Divider,
//     Grid,
//     Paper,
//     Typography
// } from '@mui/material';
// import { createLazyFileRoute } from '@tanstack/react-router';
// // --- URL CỦA API SERVER ---
// const API_URL = 'https://rapidly-daring-magpie.ngrok-free.app';
// // --- CẬP NHẬT STATE VÀ TYPE DEFINITIONS ---
// interface DocumentState {
//     file: File | null;
//     isLoading: boolean;
//     error: string | null;
//     socketStatus: 'connected' | 'disconnected';
//     generatedBlob: Blob | null; // Chỉ cần lưu file blob đã xử lý
// }
// // --- LOGIC XỬ LÝ FILE WORD (GIỮ NGUYÊN) ---
// const fieldMappings = {
//     ho_ten: [
//         'Họ và tên',
//         'Họ, chữ đệm, tên',
//         'Họ tên',
//         'Tên tổ chức, cá nhân được nhà nước giao đất, cho thuê đất',
//         'Họ, chữ đệm, tên người yêu cầu',
//         'Tên(2)',
//         'Tên'
//     ],
//     ngay_sinh_full: ['Ngày, tháng, năm sinh', 'Ngày sinh:', 'Ngày, tháng, năm sinh'],
//     so_cccd: [
//         'Số CCCD',
//         'CCCD',
//         'Căn cước công dân',
//         'Số CMND/CCCD/Hộ chiếu/TCC',
//         'Số CMND hoặc căn cước công dân'
//     ],
//     noi_cu_tru: [
//         'Nơi cư trú',
//         'Địa chỉ cư trú',
//         'Chỗ ở hiện tại',
//         'Địa chỉ',
//         'Nơi ở hiện nay',
//         'Địa chỉ(2)'
//     ],
//     ngay_cap_cccd: [
//         'Ngày cấp CCCD',
//         'Ngày cấp',
//         'Cấp ngày',
//         'ngày cấp',
//         'cấp ngày',
//         'Ngày cấp căn cước'
//     ],
//     gioi_tinh: ['Giới tính'],
//     ngay: ['Sinh ngày'],
//     thang: ['tháng'],
//     nam: ['năm']
// };
// const processDocumentByParagraph = async (
//     file: File,
//     jsonData: { [key: string]: any }
// ): Promise<Blob> => {
//     const allMappings: { label: string; jsonKey: string }[] = [];
//     for (const [jsonKey, labels] of Object.entries(fieldMappings)) {
//         for (const label of labels) {
//             allMappings.push({ label, jsonKey });
//         }
//     }
//     allMappings.sort((a, b) => b.label.length - a.label.length);
//     const arrayBuffer = await file.arrayBuffer();
//     const zip = new PizZip(arrayBuffer);
//     const docXml = zip.file('word/document.xml');
//     if (!docXml) throw new Error('File .docx không hợp lệ hoặc bị hỏng.');
//     const xmlString = docXml.asText();
//     const parser = new DOMParser();
//     const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
//     const paragraphs = xmlDoc.getElementsByTagName('w:p');
//     let replacementsMade = 0;
//     for (let i = 0; i < paragraphs.length; i++) {
//         const p = paragraphs[i];
//         const fullText = Array.from(p.getElementsByTagName('w:t'))
//             .map(t => t.textContent)
//             .join('');
//         let newText = fullText;
//         let hasBeenModifiedInThisParagraph = false;
//         const modifiedKeysInParagraph = new Set<string>();
//         for (const { label, jsonKey } of allMappings) {
//             if (modifiedKeysInParagraph.has(jsonKey) || !jsonData[jsonKey]) {
//                 continue;
//             }
//             const escapedLabel = label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
//             const regex = new RegExp(
//                 `(${escapedLabel}(?:\\s*\\(\\d+\\))?\\s*:?)([._…\\s]{2,})`,
//                 'g'
//             );
//             if (newText.match(regex)) {
//                 newText = newText.replace(regex, `$1 ${jsonData[jsonKey]}`);
//                 hasBeenModifiedInThisParagraph = true;
//                 modifiedKeysInParagraph.add(jsonKey);
//             }
//         }
//         if (hasBeenModifiedInThisParagraph) {
//             replacementsMade++;
//             const pPr = p.getElementsByTagName('w:pPr')[0];
//             const firstRun = p.getElementsByTagName('w:r')[0];
//             const rPr = firstRun ? firstRun.getElementsByTagName('w:rPr')[0] : null;
//             while (p.firstChild) p.removeChild(p.firstChild);
//             if (pPr) p.appendChild(pPr.cloneNode(true));
//             const newRun = xmlDoc.createElementNS(
//                 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
//                 'w:r'
//             );
//             if (rPr) newRun.appendChild(rPr.cloneNode(true));
//             const newTextNode = xmlDoc.createElementNS(
//                 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
//                 'w:t'
//             );
//             newTextNode.textContent = newText;
//             newTextNode.setAttribute('xml:space', 'preserve');
//             newRun.appendChild(newTextNode);
//             p.appendChild(newRun);
//         }
//     }
//     if (replacementsMade === 0) {
//         throw new Error('Không tìm thấy bất kỳ trường thông tin nào để thay thế.');
//     }
//     const serializer = new XMLSerializer();
//     const newXmlString = serializer.serializeToString(xmlDoc);
//     zip.file('word/document.xml', newXmlString);
//     return zip.generate({ type: 'blob' });
// };
// function WordFillerComponent() {
//     const [state, setState] = useState<DocumentState>({
//         file: null,
//         isLoading: false,
//         error: null,
//         socketStatus: 'disconnected',
//         generatedBlob: null
//     });
//     // THÊM STATE MỚI CHO HIỆU ỨNG KÉO THẢ
//     const [isDraggingOver, setIsDraggingOver] = useState(false);
//     const fileInputRef = useRef<HTMLInputElement>(null);
//     const previewContainerRef = useRef<HTMLDivElement>(null);
//     const fileRef = useRef<File | null>(null);
//     useEffect(() => {
//         fileRef.current = state.file;
//     }, [state.file]);
//     useEffect(() => {
//         if (state.generatedBlob && previewContainerRef.current) {
//             previewContainerRef.current.innerHTML = '';
//             renderAsync(state.generatedBlob, previewContainerRef.current)
//                 .then(() => console.log('Render preview thành công.'))
//                 .catch(err => {
//                     console.error('Lỗi render preview:', err);
//                     setState(p => ({ ...p, error: 'Không thể hiển thị bản xem trước.' }));
//                 });
//         }
//     }, [state.generatedBlob]);
//     useEffect(() => {
//         const socket = io(API_URL, { transports: ['websocket'] });
//         const onConnect = () => setState(p => ({ ...p, socketStatus: 'connected' }));
//         const onDisconnect = () => setState(p => ({ ...p, socketStatus: 'disconnected' }));
//         const onDataReceived = async (data: any) => {
//             const currentFile = fileRef.current;
//             if (data && currentFile) {
//                 setState(p => ({ ...p, isLoading: true, error: null }));
//                 try {
//                     const augmentedData = { ...data };
//                     if (data.ngay_sinh && typeof data.ngay_sinh === 'string') {
//                         const dateParts = data.ngay_sinh.split('/');
//                         if (dateParts.length === 3) {
//                             augmentedData.ngay = dateParts[0];
//                             augmentedData.thang = dateParts[1];
//                             augmentedData.nam = dateParts[2];
//                         }
//                     }
//                     const blob = await processDocumentByParagraph(currentFile, augmentedData);
//                     setState(p => ({ ...p, generatedBlob: blob, isLoading: false }));
//                 } catch (error) {
//                     const errorMessage =
//                         error instanceof Error ? error.message : 'Lỗi không xác định.';
//                     setState(p => ({ ...p, error: errorMessage, isLoading: false }));
//                 }
//             } else if (!currentFile) {
//                 setState(p => ({
//                     ...p,
//                     error: 'Đã nhận dữ liệu, vui lòng tải file Word để áp dụng.'
//                 }));
//             }
//         };
//         socket.on('connect', onConnect);
//         socket.on('disconnect', onDisconnect);
//         socket.on('data_received', onDataReceived);
//         return () => {
//             socket.off('connect', onConnect);
//             socket.off('disconnect', onDisconnect);
//             socket.off('data_received', onDataReceived);
//             socket.disconnect();
//         };
//     }, []);
//     // TÁCH LOGIC XỬ LÝ FILE RA HÀM RIÊNG
//     const handleFileSelect = (selectedFile: File | null) => {
//         if (!selectedFile) return;
//         if (!selectedFile.name.toLowerCase().endsWith('.docx')) {
//             setState(prev => ({ ...prev, error: 'Chỉ hỗ trợ file .docx.' }));
//             return;
//         }
//         setState(prev => ({ ...prev, file: selectedFile, error: null, generatedBlob: null }));
//     };
//     const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
//         handleFileSelect(event.target.files?.[0] ?? null);
//     }, []);
//     // THÊM CÁC HÀM XỬ LÝ DRAG & DROP
//     const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
//         event.preventDefault();
//         setIsDraggingOver(true);
//     };
//     const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
//         event.preventDefault();
//         setIsDraggingOver(false);
//     };
//     const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
//         event.preventDefault();
//         setIsDraggingOver(false);
//         if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
//             handleFileSelect(event.dataTransfer.files[0]);
//             event.dataTransfer.clearData();
//         }
//     };
//     const handleDownload = () => {
//         if (state.generatedBlob && state.file) {
//             saveAs(state.generatedBlob, `processed_${state.file.name}`);
//         }
//     };
//     const handlePrint = () => {
//         if (!previewContainerRef.current) return;
//         const printContent = previewContainerRef.current.innerHTML;
//         const printWindow = window.open('', '_blank');
//         if (printWindow) {
//             document.head.querySelectorAll('style').forEach(style => {
//                 printWindow.document.head.appendChild(style.cloneNode(true));
//             });
//             printWindow.document.body.innerHTML = printContent;
//             printWindow.document.close();
//             printWindow.focus();
//             setTimeout(() => {
//                 printWindow.print();
//                 printWindow.close();
//             }, 250);
//         }
//     };
//     return (
//         <Box sx={{ p: 3, maxWidth: 1400, margin: 'auto' }}>
//             <Box
//                 sx={{
//                     display: 'flex',
//                     justifyContent: 'space-between',
//                     alignItems: 'center',
//                     mb: 2
//                 }}
//             >
//                 {/* <Typography variant="h4" gutterBottom>
//                     Client-Side Word Filler
//                 </Typography> */}
//                 <Chip
//                     icon={state.socketStatus === 'connected' ? <WifiIcon /> : <WifiOffIcon />}
//                     label={state.socketStatus === 'connected' ? 'Đã kết nối' : 'Đang chờ dữ liệu'}
//                     color={state.socketStatus === 'connected' ? 'success' : 'warning'}
//                 />
//             </Box>
//             <Grid container spacing={3}>
//                 <Grid>
//                     {!state.generatedBlob ? (
//                         <Paper sx={{ p: 3 }}>
//                             <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>
//                                 {state.file ? 'Trạng thái' : 'Bắt đầu'}
//                             </Typography>
//                             {!state.file ? (
//                                 <>
//                                     {/* --- GIAO DIỆN UPLOAD MỚI --- */}
//                                     <Box
//                                         onDragOver={handleDragOver}
//                                         onDragLeave={handleDragLeave}
//                                         onDrop={handleDrop}
//                                         onClick={() => fileInputRef.current?.click()}
//                                         sx={{
//                                             border: '2px dashed',
//                                             borderColor: isDraggingOver
//                                                 ? 'primary.main'
//                                                 : 'grey.400',
//                                             borderRadius: 2,
//                                             p: 4,
//                                             textAlign: 'center',
//                                             cursor: 'pointer',
//                                             backgroundColor: isDraggingOver
//                                                 ? 'action.hover'
//                                                 : 'transparent',
//                                             transition: 'background-color 0.2s ease-in-out'
//                                         }}
//                                     >
//                                         <input
//                                             type="file"
//                                             ref={fileInputRef}
//                                             onChange={handleFileUpload}
//                                             accept=".docx"
//                                             style={{ display: 'none' }}
//                                         />
//                                         <CloudUploadIcon
//                                             sx={{ fontSize: 48, color: 'primary.main', mb: 2 }}
//                                         />
//                                         <Typography variant="h6">
//                                             Kéo và thả file vào đây
//                                         </Typography>
//                                         <Typography color="text.secondary" sx={{ mb: 2 }}>
//                                             hoặc
//                                         </Typography>
//                                         <Button variant="contained">Chọn File</Button>
//                                         <Typography
//                                             variant="caption"
//                                             display="block"
//                                             sx={{ mt: 1, color: 'text.secondary' }}
//                                         >
//                                             Chỉ hỗ trợ file .docx
//                                         </Typography>
//                                     </Box>
//                                 </>
//                             ) : (
//                                 <Box sx={{ textAlign: 'center' }}>
//                                     <Chip
//                                         label={state.file.name}
//                                         color="success"
//                                         sx={{ mb: 2, p: 2, fontSize: '1rem' }}
//                                         onDelete={() =>
//                                             setState(p => ({
//                                                 ...p,
//                                                 file: null,
//                                                 generatedBlob: null
//                                             }))
//                                         }
//                                     />
//                                     <Box
//                                         sx={{
//                                             display: 'flex',
//                                             alignItems: 'center',
//                                             justifyContent: 'center',
//                                             gap: 2,
//                                             mt: 2
//                                         }}
//                                     >
//                                         {state.isLoading ? (
//                                             <CircularProgress size={24} />
//                                         ) : (
//                                             <HourglassTopIcon color="action" />
//                                         )}
//                                         <Typography variant="body1" color="text.secondary">
//                                             {state.isLoading
//                                                 ? 'Đang xử lý dữ liệu...'
//                                                 : 'Đang chờ dữ liệu từ Mobile App...'}
//                                         </Typography>
//                                     </Box>
//                                 </Box>
//                             )}
//                         </Paper>
//                     ) : (
//                         <Paper sx={{ p: 3 }}>
//                             <Typography variant="h6" gutterBottom>
//                                 Tùy chọn
//                             </Typography>
//                             <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
//                                 <Button
//                                     variant="outlined"
//                                     startIcon={<PrintIcon />}
//                                     onClick={handlePrint}
//                                 >
//                                     In tài liệu
//                                 </Button>
//                                 <Button
//                                     variant="outlined"
//                                     startIcon={<DownloadIcon />}
//                                     onClick={handleDownload}
//                                 >
//                                     Tải file Word đã điền
//                                 </Button>
//                                 <Divider />
//                                 <Button
//                                     variant="contained"
//                                     color="primary"
//                                     startIcon={<UploadIcon />}
//                                     onClick={() =>
//                                         setState(p => ({
//                                             ...p,
//                                             file: null,
//                                             generatedBlob: null,
//                                             error: null
//                                         }))
//                                     }
//                                 >
//                                     Bắt đầu với file mới
//                                 </Button>
//                             </Box>
//                         </Paper>
//                     )}
//                 </Grid>
//                 {state.generatedBlob && (
//                     <Grid>
//                         <Paper sx={{ p: 3 }}>
//                             <Typography variant="h6" gutterBottom>
//                                 Xem trước tài liệu
//                             </Typography>
//                             <Divider sx={{ mb: 2 }} />
//                             <Paper
//                                 variant="outlined"
//                                 sx={{
//                                     p: 2,
//                                     bgcolor: 'grey.200',
//                                     height: 600,
//                                     overflowY: 'auto'
//                                 }}
//                             >
//                                 <div ref={previewContainerRef} />
//                             </Paper>
//                         </Paper>
//                     </Grid>
//                 )}
//             </Grid>
//             {state.error && (
//                 <Alert severity="error" sx={{ mt: 2 }}>
//                     {state.error}
//                 </Alert>
//             )}
//         </Box>
//     );
// }
// export const Route = createLazyFileRoute('/word-mapper/')({
//     component: WordFillerComponent
// });
// ////// ////// ////// ////// ////// ////// ////// ////// ////// ////// ////// ////// ////
// src/routes/word-mapper.index.tsx
// import React, { useCallback, useEffect, useRef, useState } from 'react';
// // --- THƯ VIỆN ---
// import { renderAsync } from 'docx-preview';
// import Docxtemplater from 'docxtemplater';
// import { saveAs } from 'file-saver';
// import PizZip from 'pizzip';
// import { io } from 'socket.io-client';
// // --- ICON (THÊM LẠI CÁC ICON UPLOAD) ---
// import {
//     CloudUpload as CloudUploadIcon,
//     Download as DownloadIcon,
//     HourglassTop as HourglassTopIcon,
//     Print as PrintIcon,
//     Upload as UploadIcon,
//     Wifi as WifiIcon,
//     WifiOff as WifiOffIcon
// } from '@mui/icons-material';
// import {
//     Alert,
//     Box,
//     Button,
//     Chip,
//     CircularProgress,
//     Divider,
//     Grid,
//     Icon,
//     Paper,
//     Typography
// } from '@mui/material';
// import { createLazyFileRoute } from '@tanstack/react-router';
// // --- CÁC HẰNG SỐ CẤU HÌNH ---
// const API_URL = 'https://rapidly-daring-magpie.ngrok-free.app';
// // --- CẬP NHẬT STATE VÀ TYPE DEFINITIONS ---
// interface DocumentState {
//     file: File | null; // <-- Thêm lại state cho file
//     isLoading: boolean;
//     error: string | null;
//     socketStatus: 'connected' | 'disconnected';
//     generatedBlob: Blob | null;
// }
// // --- LOGIC XỬ LÝ FILE WORD BẰNG DOCXTEMPLATER ---
// const fillWordTemplate = async (
//     templateArrayBuffer: ArrayBuffer,
//     jsonData: { [key: string]: any }
// ): Promise<Blob> => {
//     try {
//         const zip = new PizZip(templateArrayBuffer);
//         const doc = new Docxtemplater(zip, {
//             paragraphLoop: true,
//             linebreaks: true,
//             nullGetter: () => '' // Bỏ qua thẻ không tìm thấy
//         });
//         doc.setData(jsonData);
//         doc.render();
//         return doc.getZip().generate({
//             type: 'blob',
//             mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
//         });
//     } catch (error: any) {
//         console.error('Docxtemplater error:', error);
//         // Cung cấp thông báo lỗi rõ ràng hơn
//         if (error.properties?.id === 'template_error') {
//             throw new Error(
//                 'Lỗi cú pháp trong file mẫu Word. Vui lòng kiểm tra lại các thẻ {placeholder}.'
//             );
//         }
//         throw new Error(`Lỗi xử lý file mẫu: ${error.message}`);
//     }
// };
// // --- COMPONENT CHÍNH ---
// function WordFillerComponent() {
//     const [state, setState] = useState<DocumentState>({
//         file: null, // <-- Khởi tạo file là null
//         isLoading: false,
//         error: null,
//         socketStatus: 'disconnected',
//         generatedBlob: null
//     });
//     const [isDraggingOver, setIsDraggingOver] = useState(false);
//     const fileInputRef = useRef<HTMLInputElement>(null);
//     const previewContainerRef = useRef<HTMLDivElement>(null);
//     const fileRef = useRef<File | null>(null); // Ref để truy cập file trong socket closure
//     // Cập nhật ref mỗi khi state.file thay đổi
//     useEffect(() => {
//         fileRef.current = state.file;
//     }, [state.file]);
//     // Render preview khi có file đã xử lý
//     useEffect(() => {
//         if (state.generatedBlob && previewContainerRef.current) {
//             previewContainerRef.current.innerHTML = '';
//             renderAsync(state.generatedBlob, previewContainerRef.current)
//                 .then(() => console.log('Render preview thành công.'))
//                 .catch(err => {
//                     console.error('Lỗi render preview:', err);
//                     setState(p => ({ ...p, error: 'Không thể hiển thị bản xem trước.' }));
//                 });
//         }
//     }, [state.generatedBlob]);
//     // Socket listener
//     useEffect(() => {
//         const socket = io(API_URL, { transports: ['websocket'] });
//         const onConnect = () => setState(p => ({ ...p, socketStatus: 'connected' }));
//         const onDisconnect = () => setState(p => ({ ...p, socketStatus: 'disconnected' }));
//         const onDataReceived = async (data: any) => {
//             const currentFile = fileRef.current; // Sử dụng ref tại đây
//             if (!currentFile) {
//                 setState(p => ({
//                     ...p,
//                     error: 'Đã nhận dữ liệu, nhưng bạn chưa tải file Word mẫu.'
//                 }));
//                 return;
//             }
//             if (data) {
//                 setState(p => ({ ...p, isLoading: true, error: null, generatedBlob: null }));
//                 try {
//                     const templateArrayBuffer = await currentFile.arrayBuffer();
//                     // Chuẩn bị dữ liệu (giữ nguyên)
//                     const augmentedData = { ...data };
//                     if (data.ngay_sinh && typeof data.ngay_sinh === 'string') {
//                         augmentedData.ngay_sinh_full = data.ngay_sinh;
//                         const dateParts = data.ngay_sinh.split('/');
//                         if (dateParts.length === 3) {
//                             augmentedData.ngay = dateParts[0];
//                             augmentedData.thang = dateParts[1];
//                             augmentedData.nam = dateParts[2];
//                         }
//                     }
//                     // Gọi hàm fill template với file đã upload
//                     const blob = await fillWordTemplate(templateArrayBuffer, augmentedData);
//                     setState(p => ({ ...p, generatedBlob: blob, isLoading: false }));
//                 } catch (error) {
//                     const errorMessage =
//                         error instanceof Error ? error.message : 'Lỗi không xác định.';
//                     setState(p => ({ ...p, error: errorMessage, isLoading: false }));
//                 }
//             }
//         };
//         socket.on('connect', onConnect);
//         socket.on('disconnect', onDisconnect);
//         socket.on('data_received', onDataReceived);
//         return () => {
//             socket.off('connect', onConnect);
//             socket.off('disconnect', onDisconnect);
//             socket.off('data_received', onDataReceived);
//             socket.disconnect();
//         };
//     }, []); // Dependency rỗng để chỉ chạy 1 lần
//     // --- CÁC HÀM XỬ LÝ FILE (LẤY LẠI TỪ CODE 1) ---
//     const handleFileSelect = (selectedFile: File | null) => {
//         if (!selectedFile) return;
//         if (!selectedFile.name.toLowerCase().endsWith('.docx')) {
//             setState(prev => ({ ...prev, error: 'Chỉ hỗ trợ file .docx.' }));
//             return;
//         }
//         setState(prev => ({ ...prev, file: selectedFile, error: null, generatedBlob: null }));
//     };
//     const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
//         handleFileSelect(event.target.files?.[0] ?? null);
//     }, []);
//     const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
//         event.preventDefault();
//         setIsDraggingOver(true);
//     };
//     const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
//         event.preventDefault();
//         setIsDraggingOver(false);
//     };
//     const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
//         event.preventDefault();
//         setIsDraggingOver(false);
//         if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
//             handleFileSelect(event.dataTransfer.files[0]);
//             event.dataTransfer.clearData();
//         }
//     };
//     const handleDownload = () => {
//         if (state.generatedBlob && state.file) {
//             // Đặt tên file đã xử lý một cách hợp lý
//             const newName = state.file.name.replace('.docx', '_da_dien.docx');
//             saveAs(state.generatedBlob, newName);
//         }
//     };
//     const handlePrint = () => {
//         if (!previewContainerRef.current) return;
//         const printContent = previewContainerRef.current.innerHTML;
//         const printWindow = window.open('', '_blank');
//         if (printWindow) {
//             document.head.querySelectorAll('style').forEach(style => {
//                 printWindow.document.head.appendChild(style.cloneNode(true));
//             });
//             printWindow.document.body.innerHTML = printContent;
//             printWindow.document.close();
//             printWindow.focus();
//             setTimeout(() => {
//                 printWindow.print();
//                 printWindow.close();
//             }, 250);
//         }
//     };
//     const handleReset = () => {
//         setState(p => ({
//             ...p,
//             file: null,
//             generatedBlob: null,
//             error: null,
//             isLoading: false
//         }));
//     };
//     return (
//         <Box sx={{ p: 3, maxWidth: 1400, margin: 'auto' }}>
//             <Box
//                 sx={{
//                     display: 'flex',
//                     justifyContent: 'flex-end',
//                     alignItems: 'center',
//                     mb: 2
//                 }}
//             >
//                 <Chip
//                     icon={state.socketStatus === 'connected' ? <WifiIcon /> : <WifiOffIcon />}
//                     label={
//                         state.socketStatus === 'connected'
//                             ? 'Đã kết nối với ứng dụng'
//                             : 'Đang chờ dữ liệu'
//                     }
//                     color={state.socketStatus === 'connected' ? 'success' : 'warning'}
//                 />
//             </Box>
//             <Grid spacing={3} justifyContent="center">
//                 {/* --- CỘT TRÁI: UPLOAD VÀ ĐIỀU KHIỂN --- */}
//                 <Grid>
//                     <Paper sx={{ p: 3, height: '100%' }}>
//                         {/* <Typography variant="h6" gutterBottom>
//                             {state.generatedBlob ? 'Hoàn tất' : 'Bắt đầu'}
//                         </Typography>
//                         <Divider sx={{ mb: 3 }} /> */}
//                         {/* HIỂN THỊ KHI CHƯA CÓ KẾT QUẢ */}
//                         {!state.generatedBlob && (
//                             <>
//                                 {!state.file ? (
//                                     // GIAO DIỆN UPLOAD FILE
//                                     <Box
//                                         onDragOver={handleDragOver}
//                                         onDragLeave={handleDragLeave}
//                                         onDrop={handleDrop}
//                                         onClick={() => fileInputRef.current?.click()}
//                                         sx={{
//                                             border: '2px dashed',
//                                             borderColor: isDraggingOver
//                                                 ? 'primary.main'
//                                                 : 'grey.400',
//                                             borderRadius: 2,
//                                             p: 4,
//                                             textAlign: 'center',
//                                             cursor: 'pointer',
//                                             backgroundColor: isDraggingOver
//                                                 ? 'action.hover'
//                                                 : 'transparent',
//                                             transition: 'all 0.2s ease-in-out'
//                                         }}
//                                     >
//                                         <input
//                                             type="file"
//                                             ref={fileInputRef}
//                                             onChange={handleFileUpload}
//                                             accept=".docx"
//                                             style={{ display: 'none' }}
//                                         />
//                                         <CloudUploadIcon
//                                             sx={{ fontSize: 48, color: 'primary.main', mb: 2 }}
//                                         />
//                                         <Typography variant="h6">Kéo và thả file mẫu</Typography>
//                                         <Typography color="text.secondary" sx={{ mb: 2 }}>
//                                             hoặc
//                                         </Typography>
//                                         <Button variant="contained">Chọn File Word</Button>
//                                     </Box>
//                                 ) : (
//                                     // GIAO DIỆN KHI ĐÃ CHỌN FILE
//                                     <Box sx={{ textAlign: 'center' }}>
//                                         <Chip
//                                             label={state.file.name}
//                                             color="success"
//                                             sx={{ mb: 2, p: 2, fontSize: '1rem', maxWidth: '100%' }}
//                                             onDelete={handleReset}
//                                         />
//                                         <Box
//                                             sx={{
//                                                 display: 'flex',
//                                                 alignItems: 'center',
//                                                 justifyContent: 'center',
//                                                 gap: 2,
//                                                 mt: 2,
//                                                 py: 4
//                                             }}
//                                         >
//                                             {state.isLoading ? (
//                                                 <CircularProgress size={24} />
//                                             ) : (
//                                                 <HourglassTopIcon color="action" />
//                                             )}
//                                             <Typography variant="body1" color="text.secondary">
//                                                 {state.isLoading
//                                                     ? 'Đang điền dữ liệu...'
//                                                     : 'Sẵn sàng nhận dữ liệu...'}
//                                             </Typography>
//                                         </Box>
//                                     </Box>
//                                 )}
//                             </>
//                         )}
//                         {/* HIỂN THỊ CÁC NÚT HÀNH ĐỘNG KHI ĐÃ CÓ KẾT QUẢ */}
//                         {state.generatedBlob && (
//                             <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
//                                 <Button
//                                     variant="outlined"
//                                     startIcon={<PrintIcon />}
//                                     onClick={handlePrint}
//                                 >
//                                     In tài liệu
//                                 </Button>
//                                 <Button
//                                     variant="outlined"
//                                     startIcon={<DownloadIcon />}
//                                     onClick={handleDownload}
//                                 >
//                                     Tải file đã điền
//                                 </Button>
//                                 <Divider />
//                                 <Button
//                                     variant="contained"
//                                     color="primary"
//                                     startIcon={<UploadIcon />}
//                                     onClick={handleReset}
//                                 >
//                                     Bắt đầu với file mới
//                                 </Button>
//                             </Box>
//                         )}
//                     </Paper>
//                 </Grid>
//                 {/* --- CỘT PHẢI: XEM TRƯỚC TÀI LIỆU (CHỈ HIỆN KHI CÓ KẾT QUẢ) --- */}
//                 {state.generatedBlob && (
//                     <Grid>
//                         <Paper sx={{ p: 3, height: '100%' }}>
//                             <Typography variant="h6" gutterBottom>
//                                 Xem trước tài liệu
//                             </Typography>
//                             <Divider sx={{ mb: 2 }} />
//                             <Paper
//                                 variant="outlined"
//                                 sx={{
//                                     p: 2,
//                                     bgcolor: 'grey.200',
//                                     minHeight: '70vh',
//                                     overflowY: 'auto'
//                                 }}
//                             >
//                                 <div ref={previewContainerRef} />
//                             </Paper>
//                         </Paper>
//                     </Grid>
//                 )}
//             </Grid>
//             {/* Thông báo lỗi */}
//             {state.error && (
//                 <Alert
//                     severity="error"
//                     sx={{ mt: 3 }}
//                     onClose={() => setState(p => ({ ...p, error: null }))}
//                 >
//                     {state.error}
//                 </Alert>
//             )}
//         </Box>
//     );
// }
// export const Route = createLazyFileRoute('/word-mapper/')({
//     component: WordFillerComponent
// });

import React, { useCallback, useEffect, useRef, useState } from 'react';

// --- THƯ VIỆN ---
import { renderAsync } from 'docx-preview';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import PizZip from 'pizzip';
import { io } from 'socket.io-client';

// --- ICON ---
import {
    Download as DownloadIcon,
    HourglassTop as HourglassTopIcon,
    Print as PrintIcon,
    RestartAlt as RestartAltIcon,
    Wifi as WifiIcon,
    WifiOff as WifiOffIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    SelectChangeEvent,
    Typography
} from '@mui/material';
import { createLazyFileRoute } from '@tanstack/react-router';

// --- CẤU HÌNH ---
const API_URL = 'http://103.162.21.146:5003';

// *** QUAN TRỌNG: KHAI BÁO DANH SÁCH FILE MẪU CỦA BẠN TẠI ĐÂY ***
// label: Tên hiển thị trong dropdown
// path: Đường dẫn tới file trong thư mục `public`

const TEMPLATE_FILES = [
    {
        label: 'TỜ KHAI ĐĂNG KÝ KHAI SINH',
        path: '/templates/1.TKngkkhaisinh.docx'
    },
    {
        label: 'ĐƠN ĐĂNG KÝ ĐẤT ĐAI, TÀI SẢN GẮN LIỀN VỚI ĐẤT',
        path: '/templates/DonDangKyDatDai.docx'
    },
    {
        label: `ĐƠN ĐỀ NGHỊ XÁC ĐỊNH, XÁC ĐỊNH LẠI MỨC ĐỘ KHUYẾT TẬT
                VÀ CẤP, CẤP ĐỔI, CẤP LẠI GIẤY XÁC NHẬN KHUYẾT TẬT
                `,
        path: '/templates/DonKhuyetTat.docx'
    },
    {
        label: 'PHƯƠNG ÁN SỬ DỤNG TẦNG ĐẤT MẶT',
        path: '/templates/PhuongAnSuDungTangDat.docx'
    }
];

// --- TYPE DEFINITIONS ---
interface DocumentState {
    selectedTemplatePath: string; // <-- Thay 'file' bằng đường dẫn mẫu đã chọn
    isLoading: boolean;
    error: string | null;
    socketStatus: 'connected' | 'disconnected';
    generatedBlob: Blob | null;
}

// --- LOGIC XỬ LÝ FILE WORD (giữ nguyên) ---
const fillWordTemplate = async (
    templateArrayBuffer: ArrayBuffer,
    jsonData: { [key: string]: any }
): Promise<Blob> => {
    // ... logic này không thay đổi
    try {
        const zip = new PizZip(templateArrayBuffer);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: () => ''
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

// --- COMPONENT CHÍNH ---
function WordFillerComponent() {
    const [state, setState] = useState<DocumentState>({
        selectedTemplatePath: '', // <-- Bắt đầu với chuỗi rỗng
        isLoading: false,
        error: null,
        socketStatus: 'disconnected',
        generatedBlob: null
    });

    const previewContainerRef = useRef<HTMLDivElement>(null);
    const templatePathRef = useRef<string>(''); // Ref để lưu đường dẫn mẫu

    useEffect(() => {
        templatePathRef.current = state.selectedTemplatePath;
    }, [state.selectedTemplatePath]);

    useEffect(() => {
        if (state.generatedBlob && previewContainerRef.current) {
            previewContainerRef.current.innerHTML = '';
            renderAsync(state.generatedBlob, previewContainerRef.current);
        }
    }, [state.generatedBlob]);

    useEffect(() => {
        const socket = io(API_URL, { transports: ['websocket'] });

        const onConnect = () => setState(p => ({ ...p, socketStatus: 'connected' }));
        const onDisconnect = () => setState(p => ({ ...p, socketStatus: 'disconnected' }));

        const onDataReceived = async (data: any) => {
            const currentTemplatePath = templatePathRef.current;

            if (!currentTemplatePath) {
                setState(p => ({
                    ...p,
                    error: 'Vui lòng chọn một mẫu đơn trước khi nhận dữ liệu.'
                }));
                return;
            }

            if (data) {
                setState(p => ({ ...p, isLoading: true, error: null, generatedBlob: null }));
                try {
                    // Tải file mẫu từ đường dẫn đã chọn
                    const response = await fetch(currentTemplatePath);
                    if (!response.ok) {
                        throw new Error(`Không thể tải file mẫu: ${response.statusText}`);
                    }
                    const templateArrayBuffer = await response.arrayBuffer();

                    // Chuẩn bị dữ liệu
                    const augmentedData = { ...data };
                    if (data.ngay_sinh && typeof data.ngay_sinh === 'string') {
                        augmentedData.ngay_sinh_full = data.ngay_sinh;
                        const dateParts = data.ngay_sinh.split('/');
                        if (dateParts.length === 3) {
                            augmentedData.ngay = dateParts[0];
                            augmentedData.thang = dateParts[1];
                            augmentedData.nam = dateParts[2];
                        }
                    }

                    // Gọi hàm fill template
                    const blob = await fillWordTemplate(templateArrayBuffer, augmentedData);
                    setState(p => ({ ...p, generatedBlob: blob, isLoading: false }));
                } catch (error) {
                    const errorMessage =
                        error instanceof Error ? error.message : 'Lỗi không xác định.';
                    setState(p => ({ ...p, error: errorMessage, isLoading: false }));
                }
            }
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('data_received', onDataReceived);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('data_received', onDataReceived);
            socket.disconnect();
        };
    }, []);

    // --- CÁC HÀM XỬ LÝ SỰ KIỆN ---
    const handleTemplateChange = (event: SelectChangeEvent) => {
        setState(prev => ({
            ...prev,
            selectedTemplatePath: event.target.value,
            generatedBlob: null,
            error: null
        }));
    };

    const handleDownload = () => {
        if (state.generatedBlob) {
            const selectedTemplate = TEMPLATE_FILES.find(
                f => f.path === state.selectedTemplatePath
            );
            const baseName = selectedTemplate ? selectedTemplate.label : 'file';
            const newName = `${baseName.replace(/\s/g, '_')}_da_dien.docx`;
            saveAs(state.generatedBlob, newName);
        }
    };

    const handlePrint = () => {
        // ... logic này không thay đổi
        if (!previewContainerRef.current) return;
        const printContent = previewContainerRef.current.innerHTML;
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            document.head.querySelectorAll('style').forEach(style => {
                printWindow.document.head.appendChild(style.cloneNode(true));
            });
            printWindow.document.body.innerHTML = printContent;
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    };

    const handleReset = () => {
        setState(p => ({
            ...p,
            selectedTemplatePath: '',
            generatedBlob: null,
            error: null,
            isLoading: false
        }));
    };

    // Lấy tên của mẫu đang chọn để hiển thị
    const selectedTemplateLabel =
        TEMPLATE_FILES.find(f => f.path === state.selectedTemplatePath)?.label || '';

    return (
        <Box sx={{ p: 3, maxWidth: 1400, margin: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 2 }}>
                <Chip
                    icon={state.socketStatus === 'connected' ? <WifiIcon /> : <WifiOffIcon />}
                    label={state.socketStatus === 'connected' ? 'Đã kết nối' : 'Đang chờ dữ liệu'}
                    color={state.socketStatus === 'connected' ? 'success' : 'warning'}
                />
            </Box>

            <Grid spacing={3} justifyContent="center">
                <Grid>
                    <Paper sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" gutterBottom>
                            {state.generatedBlob
                                ? 'Hoàn tất'
                                : state.selectedTemplatePath
                                  ? 'Trạng thái'
                                  : 'Chọn mẫu đơn'}
                        </Typography>
                        <Divider sx={{ mb: 3 }} />

                        {/* KHI CHƯA CHỌN MẪU */}
                        {!state.selectedTemplatePath && (
                            <FormControl fullWidth>
                                <InputLabel id="template-select-label">
                                    Chọn loại văn bản
                                </InputLabel>
                                <Select
                                    labelId="template-select-label"
                                    value={state.selectedTemplatePath}
                                    label="Chọn loại văn bản"
                                    onChange={handleTemplateChange}
                                >
                                    {TEMPLATE_FILES.map(file => (
                                        <MenuItem key={file.path} value={file.path}>
                                            {file.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        {/* KHI ĐÃ CHỌN MẪU, ĐANG CHỜ HOẶC ĐÃ XONG */}
                        {state.selectedTemplatePath && (
                            <Box>
                                {/* HIỂN THỊ KHI ĐANG CHỜ DỮ LIỆU */}
                                {!state.generatedBlob && (
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography variant="body1" sx={{ mb: 2 }}>
                                            Đang sử dụng mẫu:
                                        </Typography>
                                        <Chip
                                            label={selectedTemplateLabel}
                                            color="info"
                                            sx={{ p: 2, fontSize: '1rem', maxWidth: '100%' }}
                                        />
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 2,
                                                mt: 2,
                                                py: 4
                                            }}
                                        >
                                            {state.isLoading ? (
                                                <CircularProgress size={24} />
                                            ) : (
                                                <HourglassTopIcon color="action" />
                                            )}
                                            <Typography variant="body1" color="text.secondary">
                                                {state.isLoading
                                                    ? 'Đang điền dữ liệu...'
                                                    : 'Sẵn sàng nhận dữ liệu...'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                )}

                                {/* HIỂN THỊ CÁC NÚT KHI ĐÃ CÓ KẾT QUẢ */}
                                {state.generatedBlob && (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <Typography
                                            variant="body1"
                                            sx={{ mb: 1, textAlign: 'center' }}
                                        >
                                            Đã điền xong mẫu: <b>{selectedTemplateLabel}</b>
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            startIcon={<PrintIcon />}
                                            onClick={handlePrint}
                                        >
                                            In tài liệu
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            startIcon={<DownloadIcon />}
                                            onClick={handleDownload}
                                        >
                                            Tải file đã điền
                                        </Button>
                                    </Box>
                                )}

                                {/* NÚT LÀM LẠI/CHỌN MẪU KHÁC */}
                                <Divider sx={{ my: 2 }} />
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<RestartAltIcon />}
                                    onClick={handleReset}
                                    fullWidth
                                >
                                    Chọn mẫu khác
                                </Button>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* --- CỘT PHẢI: XEM TRƯỚC (CHỈ HIỆN KHI CÓ KẾT QUẢ) --- */}
                {state.generatedBlob && (
                    <Grid item xs={12} md={8}>
                        <Paper sx={{ p: 3, height: '100%' }}>
                            <Typography variant="h6" gutterBottom>
                                Xem trước tài liệu
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2,
                                    bgcolor: 'grey.200',
                                    minHeight: '70vh',
                                    overflowY: 'auto'
                                }}
                            >
                                <div ref={previewContainerRef} />
                            </Paper>
                        </Paper>
                    </Grid>
                )}
            </Grid>

            {/* Thông báo lỗi */}
            {state.error && (
                <Alert
                    severity="error"
                    sx={{ mt: 3 }}
                    onClose={() => setState(p => ({ ...p, error: null }))}
                >
                    {state.error}
                </Alert>
            )}
        </Box>
    );
}

export const Route = createLazyFileRoute('/word-mapper/')({
    component: WordFillerComponent
});
