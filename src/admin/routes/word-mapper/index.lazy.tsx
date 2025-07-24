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
import React, { useCallback, useRef, useState } from 'react';

import { saveAs } from 'file-saver';
import PizZip from 'pizzip';

import { PlayArrow as PlayArrowIcon, Upload as UploadIcon } from '@mui/icons-material';
// --- Material UI Imports ---
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Paper,
    TextField,
    Typography
} from '@mui/material';
import { createLazyFileRoute } from '@tanstack/react-router';

// --- State và Type Definitions ---
interface DocumentState {
    file: File | null;
    isLoading: boolean;
    error: string | null;
    jsonData: string;
}

// --- Logic xử lý chính ---
// Thêm các key riêng cho ngày, tháng, năm
const fieldMappings = {
    ho_ten: [
        'Họ và tên',
        'Họ, chữ đệm, tên',
        'Họ tên',
        'Họ, chữ đệm, tên người yêu cầu',
        'Tên(2)',
        'Tên'
    ],
    ngay_sinh_full: ['Ngày, tháng, năm sinh', 'Ngày sinh'], // Dùng cho trường hợp điền cả cụm
    so_cccd: [
        'Số CCCD',
        'CCCD',
        'Căn cước công dân',
        'Số căn cước',
        'Số căn cước công dân',
        'Số CMND hoặc căn cước công dân',
        'Số CMND/CCCD/Hộ chiếu/TCC'
    ],
    noi_cu_tru: [
        'Nơi cư trú',
        'Địa chỉ cư trú',
        'Chỗ ở hiện tại',
        'Nơi ở hiện nay',
        'Địa chỉ(2)',
        'Địa chỉ'
    ],
    ngay_cap_cccd: ['Ngày cấp CCCD', 'Ngày cấp', 'Cấp ngày', 'Ngày cấp căn cước'],
    gioi_tinh: ['Giới tính'],
    // Các key mới để xử lý ngày tháng tách rời
    ngay: ['Sinh ngày', 'ngày'],
    thang: ['tháng'],
    nam: ['năm']
};

/**
 * Xử lý file Word bằng cách tìm và thay thế ở cấp độ đoạn văn (ĐÃ TỐI ƯU VÀ SỬA LỖI).
 * @param file File .docx người dùng tải lên.
 * @param jsonData Đối tượng JSON chứa dữ liệu đã được tách ngày/tháng/năm.
 */
const processDocumentByParagraph = async (file: File, jsonData: { [key: string]: any }) => {
    const arrayBuffer = await file.arrayBuffer();
    const zip = new PizZip(arrayBuffer);
    const docXml = zip.file('word/document.xml');

    if (!docXml)
        throw new Error('File docx không hợp lệ hoặc bị hỏng (không tìm thấy word/document.xml).');

    const xmlString = docXml.asText();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

    const paragraphs = xmlDoc.getElementsByTagName('w:p');
    let replacementsMade = 0;

    for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const textNodes = p.getElementsByTagName('w:t');

        let fullText = '';
        for (let j = 0; j < textNodes.length; j++) {
            fullText += textNodes[j].textContent;
        }

        let newText = fullText;
        let hasBeenModified = false;

        for (const [jsonKey, labels] of Object.entries(fieldMappings)) {
            if (jsonData[jsonKey]) {
                for (const label of labels) {
                    // TỐI ƯU REGEX: Tìm label (có hoặc không có dấu hai chấm) theo sau bởi các ký tự placeholder.
                    const escapedLabel = label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const regex = new RegExp(`(${escapedLabel}:?)([._…\\s]{2,})`, 'g');

                    if (regex.test(newText)) {
                        newText = newText.replace(regex, `$1 ${jsonData[jsonKey]}`);
                        hasBeenModified = true;
                    }
                }
            }
        }

        if (hasBeenModified) {
            replacementsMade++;

            const pPr = p.getElementsByTagName('w:pPr')[0];
            const firstRun = p.getElementsByTagName('w:r')[0];
            const rPr = firstRun ? firstRun.getElementsByTagName('w:rPr')[0] : null;

            while (p.firstChild) {
                p.removeChild(p.firstChild);
            }

            if (pPr) {
                p.appendChild(pPr.cloneNode(true));
            }

            const newRun = xmlDoc.createElementNS(
                'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
                'w:r'
            );

            if (rPr) {
                newRun.appendChild(rPr.cloneNode(true));
            }

            const newTextNode = xmlDoc.createElementNS(
                'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
                'w:t'
            );
            newTextNode.textContent = newText;

            const spaceAttr = xmlDoc.createAttribute('xml:space');
            spaceAttr.value = 'preserve';
            newTextNode.setAttributeNode(spaceAttr);

            newRun.appendChild(newTextNode);
            p.appendChild(newRun);
            console.log(`Đã cập nhật đoạn văn: "${newText}"`);
        }
    }

    if (replacementsMade === 0) {
        throw new Error(
            'Không tìm thấy trường nào để thay thế. File có thể có cấu trúc phức tạp hoặc không chứa các nhãn cần tìm.'
        );
    }

    const serializer = new XMLSerializer();
    const newXmlString = serializer.serializeToString(xmlDoc);
    zip.file('word/document.xml', newXmlString);

    const out = zip.generate({ type: 'blob' });
    saveAs(out, `processed_${file.name}`);
};

// --- React Component ---
function WordMapperComponent() {
    const [state, setState] = useState<DocumentState>({
        file: null,
        isLoading: false,
        error: null,
        jsonData: JSON.stringify(
            {
                ho_ten: 'Nguyễn Văn A',
                ngay: '01',
                thang: '01',
                nam: '2001',
                so_cccd: '123456789012',
                noi_cu_tru: '123 Đường ABC, Quận 1, TP.HCM',
                ngay_cap_cccd: '15/05/2020',
                gioi_tinh: 'Nam'
            },
            null,
            2
        )
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.name.toLowerCase().endsWith('.doc')) {
            setState(prev => ({
                ...prev,
                error: 'File .doc không được hỗ trợ trực tiếp. Vui lòng chuyển đổi sang .docx trước khi tải lên.'
            }));
            return;
        }

        if (!file.name.toLowerCase().endsWith('.docx')) {
            setState(prev => ({ ...prev, error: 'Chỉ hỗ trợ file .docx' }));
            return;
        }

        setState(prev => ({ ...prev, file: file, error: null }));
    }, []);

    const handleJsonDataChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setState(prev => ({ ...prev, jsonData: event.target.value }));
    }, []);

    const handleGenerateDocument = async () => {
        if (!state.file) {
            setState(prev => ({ ...prev, error: 'Vui lòng tải lên một file Word trước.' }));
            return;
        }

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const parsedJson = JSON.parse(state.jsonData);

            // TÁCH DỮ LIỆU NGÀY THÁNG NĂM TẠI ĐÂY
            const augmentedData = { ...parsedJson };
            if (parsedJson.ngay_sinh && typeof parsedJson.ngay_sinh === 'string') {
                const dateParts = parsedJson.ngay_sinh.split('/');
                if (dateParts.length === 3) {
                    augmentedData.ngay = dateParts[0];
                    augmentedData.thang = dateParts[1];
                    augmentedData.nam = dateParts[2];
                }
                // Thêm một key mới để điền cả cụm nếu cần
                augmentedData.ngay_sinh_full = parsedJson.ngay_sinh;
            }

            await processDocumentByParagraph(state.file, augmentedData);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
            setState(prev => ({ ...prev, error: errorMessage }));
            console.error(error);
        } finally {
            setState(prev => ({ ...prev, isLoading: false }));
        }
    };

    return (
        <Box sx={{ p: 3, maxWidth: 800, margin: 'auto' }}>
            <Typography variant="h4" gutterBottom>
                Word Document Filler
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
                Tải lên file .docx và điền dữ liệu từ JSON mà không cần sửa đổi file mẫu.
            </Typography>

            {/* Upload Section */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Bước 1: Tải lên file Word (.docx)
                </Typography>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    style={{ display: 'none' }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button
                        variant="contained"
                        startIcon={<UploadIcon />}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Chọn File
                    </Button>
                    {state.file && (
                        <Chip
                            label={state.file.name}
                            color="success"
                            variant="outlined"
                            onDelete={() => setState(p => ({ ...p, file: null }))}
                        />
                    )}
                </Box>
            </Paper>

            {/* JSON Data & Generate Section */}
            {state.file && (
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Bước 2: Cung cấp dữ liệu JSON
                    </Typography>
                    <TextField
                        label="JSON Data"
                        multiline
                        rows={10}
                        fullWidth
                        value={state.jsonData}
                        onChange={handleJsonDataChange}
                        placeholder="Enter JSON data here..."
                        sx={{ fontFamily: 'monospace', mb: 2 }}
                    />
                    <Button
                        variant="contained"
                        startIcon={
                            state.isLoading ? (
                                <CircularProgress size={20} color="inherit" />
                            ) : (
                                <PlayArrowIcon />
                            )
                        }
                        onClick={handleGenerateDocument}
                        disabled={state.isLoading}
                        size="large"
                    >
                        {state.isLoading ? 'Đang xử lý...' : 'Tạo và Tải tài liệu'}
                    </Button>
                </Paper>
            )}

            {/* Error Display */}
            {state.error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {state.error}
                </Alert>
            )}
        </Box>
    );
}

// --- TanStack Router Export ---
export const Route = createLazyFileRoute('/word-mapper/')({
    component: WordMapperComponent
});
