// Dynamic imports for better code splitting

export interface DocumentData {
    [key: string]: string | number | boolean | Date;
}

export interface TemplateInfo {
    id: string;
    name: string;
    fileName: string;
    templateBuffer?: ArrayBuffer;
}

export interface FieldMapping {
    id: string;
    fieldName: string;
    dataKey: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fieldType: 'text' | 'number' | 'date' | 'checkbox';
}

export interface TemplateConfig {
    templateId: string;
    fieldMappings: FieldMapping[];
    documentStructure?: any;
}

class DocumentService {
    private templates: Map<string, ArrayBuffer> = new Map();
    private templateConfigs: Map<string, TemplateConfig> = new Map();

    /**
     * Load template file and store in memory
     */
    async loadTemplate(templateId: string, file: File): Promise<void> {
        try {
            const buffer = await file.arrayBuffer();
            this.templates.set(templateId, buffer);
        } catch (error) {
            console.error('Error loading template:', error);
            throw new Error('Không thể tải template');
        }
    }

    /**
     * Generate document from template with provided data using docxtemplater
     */
    async generateDocument(
        templateId: string,
        data: DocumentData,
        outputFileName?: string
    ): Promise<Blob> {
        try {
            // Dynamic imports for better code splitting
            const [{ default: Docxtemplater }, { default: PizZip }] = await Promise.all([
                import('docxtemplater'),
                import('pizzip')
            ]);

            const templateBuffer = this.templates.get(templateId);
            if (!templateBuffer) {
                throw new Error('Template không tồn tại');
            }

            // Create PizZip instance from template buffer
            const zip = new PizZip(templateBuffer);

            // Create docxtemplater instance
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true
            });

            // Set the template data
            doc.setData(data);

            try {
                // Render the document (replace all variables)
                doc.render();
            } catch (error: any) {
                console.error('Error rendering template:', error);
                throw new Error('Lỗi khi render template: ' + error.message);
            }

            // Generate the document buffer
            const buffer = doc.getZip().generate({
                type: 'arraybuffer',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });

            return new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });
        } catch (error: any) {
            console.error('Error generating document:', error);
            throw new Error('Không thể tạo tài liệu: ' + error.message);
        }
    }

    /**
     * Download generated document
     */
    downloadDocument(blob: Blob, fileName: string): void {
        try {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName.endsWith('.docx') ? fileName : `${fileName}.docx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading document:', error);
            throw new Error('Không thể tải xuống tài liệu');
        }
    }

    /**
     * Get data from Chrome extension storage
     */
    async getExtensionData(): Promise<DocumentData> {
        try {
            // Get data from Chrome storage
            const result = await chrome.storage.local.get(['formData', 'scrapedData']);

            // Combine form data and scraped data
            const combinedData: DocumentData = {
                ...result.formData,
                ...result.scrapedData,
                // Add current date/time
                current_date: new Date().toLocaleDateString('vi-VN'),
                current_time: new Date().toLocaleTimeString('vi-VN'),
                current_datetime: new Date().toLocaleString('vi-VN')
            };

            return combinedData;
        } catch (error) {
            console.error('Error getting extension data:', error);
            return {};
        }
    }

    /**
     * Generate document with data from extension
     */
    async generateDocumentFromExtension(
        templateId: string,
        outputFileName?: string
    ): Promise<Blob> {
        try {
            const data = await this.getExtensionData();
            return await this.generateDocument(templateId, data, outputFileName);
        } catch (error) {
            console.error('Error generating document from extension:', error);
            throw error;
        }
    }

    /**
     * Preview data that will be used in template
     */
    async previewTemplateData(): Promise<DocumentData> {
        return await this.getExtensionData();
    }

    /**
     * Validate template file
     */
    validateTemplate(file: File): boolean {
        // Check file type
        if (!file.name.endsWith('.docx')) {
            throw new Error('Chỉ hỗ trợ file .docx');
        }

        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            throw new Error('File quá lớn (tối đa 10MB)');
        }

        return true;
    }

    /**
     * Extract field placeholders from template
     */
    async extractTemplateFields(file: File): Promise<string[]> {
        try {
            // Dynamic imports for better code splitting
            const [{ default: PizZip }] = await Promise.all([import('pizzip')]);

            const buffer = await file.arrayBuffer();
            const zip = new PizZip(buffer);

            // Extract document XML content
            const documentXml = zip.files['word/document.xml']?.asText();

            if (!documentXml) {
                console.warn(
                    'Could not extract document XML, falling back to simple text extraction'
                );
                return [];
            }

            // Extract placeholders from XML content
            const fieldRegex = /\{([^}]+)\}/g;
            const fields: string[] = [];
            let match;

            while ((match = fieldRegex.exec(documentXml)) !== null) {
                const fieldName = match[1].trim();
                if (fieldName && !fields.includes(fieldName)) {
                    fields.push(fieldName);
                }
            }

            return fields;
        } catch (error) {
            console.error('Error extracting template fields:', error);
            return [];
        }
    }

    /**
     * Clear template from memory
     */
    removeTemplate(templateId: string): void {
        this.templates.delete(templateId);
    }

    /**
     * Clear all templates from memory
     */
    clearAllTemplates(): void {
        this.templates.clear();
    }

    /**
     * Get template info
     */
    getTemplateInfo(templateId: string): { exists: boolean; size?: number } {
        const template = this.templates.get(templateId);
        return {
            exists: !!template,
            size: template?.byteLength
        };
    }

    /**
     * Save field mapping configuration for a template
     */
    saveTemplateConfig(templateId: string, config: TemplateConfig): void {
        this.templateConfigs.set(templateId, config);
    }

    /**
     * Get field mapping configuration for a template
     */
    getTemplateConfig(templateId: string): TemplateConfig | undefined {
        return this.templateConfigs.get(templateId);
    }

    /**
     * Parse document structure for field mapping
     */
    async parseDocumentStructure(file: File): Promise<any> {
        try {
            // Dynamic imports for better code splitting
            const [{ default: Docxtemplater }, { default: PizZip }] = await Promise.all([
                import('docxtemplater'),
                import('pizzip')
            ]);

            const buffer = await file.arrayBuffer();
            const zip = new PizZip(buffer);
            const doc = new Docxtemplater(zip);

            // Extract document structure and existing placeholders
            const documentXml = zip.files['word/document.xml']?.asText();

            return {
                hasContent: !!documentXml,
                placeholders: this.extractPlaceholdersFromXml(documentXml || ''),
                structure: 'parsed' // Placeholder for more detailed structure analysis
            };
        } catch (error) {
            console.error('Error parsing document structure:', error);
            return { hasContent: false, placeholders: [], structure: null };
        }
    }

    /**
     * Extract placeholders from document XML
     */
    private extractPlaceholdersFromXml(xml: string): string[] {
        const placeholderRegex = /\{([^}]+)\}/g;
        const placeholders: string[] = [];
        let match;

        while ((match = placeholderRegex.exec(xml)) !== null) {
            if (!placeholders.includes(match[1])) {
                placeholders.push(match[1]);
            }
        }

        return placeholders;
    }

    /**
     * Generate document with field mapping
     */
    async generateDocumentWithMapping(
        templateId: string,
        data: DocumentData,
        fieldMappings?: FieldMapping[]
    ): Promise<Blob> {
        try {
            // If field mappings are provided, apply them to create template placeholders
            if (fieldMappings && fieldMappings.length > 0) {
                const mappedData: DocumentData = {};

                fieldMappings.forEach(mapping => {
                    if (data[mapping.dataKey] !== undefined) {
                        mappedData[mapping.fieldName] = data[mapping.dataKey];
                    }
                });

                return await this.generateDocument(templateId, mappedData);
            }

            // Otherwise, use direct data mapping
            return await this.generateDocument(templateId, data);
        } catch (error) {
            console.error('Error generating document with mapping:', error);
            throw error;
        }
    }

    /**
     * Convert Word document to HTML for preview using mammoth.js
     */
    async convertDocumentToHtml(blob: Blob): Promise<string> {
        try {
            // Dynamic import for mammoth.js
            const mammoth = await import('mammoth');

            const arrayBuffer = await blob.arrayBuffer();

            // Convert Word document to HTML
            const result = await mammoth.convertToHtml({ arrayBuffer });

            if (result.messages && result.messages.length > 0) {
                console.warn('Mammoth conversion warnings:', result.messages);
            }

            return result.value || '<p>Document appears to be empty</p>';
        } catch (error) {
            console.error('Error converting document to HTML:', error);
            return '<p>Error converting document to HTML</p>';
        }
    }

    /**
     * Extract text content from generated document for preview
     */
    async extractTextFromDocument(blob: Blob): Promise<string> {
        try {
            // Dynamic imports for better code splitting
            const [{ default: PizZip }] = await Promise.all([import('pizzip')]);

            const buffer = await blob.arrayBuffer();
            const zip = new PizZip(buffer);

            // Extract document XML content
            const documentXml = zip.files['word/document.xml']?.asText();

            if (!documentXml) {
                return 'Could not extract text content from document';
            }

            // Better text extraction from Word XML
            let textContent = documentXml;

            // Extract text from <w:t> tags (Word text elements)
            const textMatches = textContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
            if (textMatches) {
                const extractedText = textMatches
                    .map(match => {
                        const textMatch = match.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
                        return textMatch ? textMatch[1] : '';
                    })
                    .join(' ');

                if (extractedText.trim()) {
                    return extractedText.replace(/\s+/g, ' ').trim();
                }
            }

            // Fallback: Simple text extraction (remove all XML tags)
            const fallbackText = documentXml
                .replace(/<[^>]*>/g, ' ') // Remove XML tags
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();

            return fallbackText || 'Document appears to be empty';
        } catch (error) {
            console.error('Error extracting text from document:', error);
            return 'Error extracting text content';
        }
    }
}

// Export singleton instance
export const documentService = new DocumentService();
export default documentService;
