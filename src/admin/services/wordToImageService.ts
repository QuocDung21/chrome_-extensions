// Dynamic import for mammoth to reduce bundle size

export interface WordToImageOptions {
    width?: number;
    height?: number;
    scale?: number;
    backgroundColor?: string;
}

class WordToImageService {
    /**
     * Convert Word document to HTML first, then to image
     */
    async convertWordToImage(file: File, options: WordToImageOptions = {}): Promise<string> {
        try {
            // First convert Word to HTML using mammoth
            const htmlResult = await this.convertWordToHtml(file);

            // Then convert HTML to image
            const imageUrl = await this.convertHtmlToImage(htmlResult.html, options);

            return imageUrl;
        } catch (error) {
            console.error('Error converting Word to image:', error);

            // Fallback: create a placeholder image
            return this.createPlaceholderImage(file.name, options);
        }
    }

    /**
     * Create a placeholder image when Word conversion fails
     */
    private createPlaceholderImage(fileName: string, options: WordToImageOptions = {}): string {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('Cannot create canvas context');
        }

        // Set canvas size
        canvas.width = options.width || 800;
        canvas.height = options.height || 1000;

        // Fill background
        ctx.fillStyle = options.backgroundColor || '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add border
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

        // Add text
        ctx.fillStyle = '#666666';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Word Document Preview', canvas.width / 2, 100);

        ctx.font = '16px Arial';
        ctx.fillText(fileName, canvas.width / 2, 150);

        ctx.font = '14px Arial';
        ctx.fillStyle = '#999999';
        ctx.fillText('Preview không khả dụng', canvas.width / 2, 200);
        ctx.fillText('Bạn vẫn có thể drag & drop để map fields', canvas.width / 2, 230);

        // Add document icon representation
        ctx.fillStyle = '#e3f2fd';
        ctx.fillRect(canvas.width / 2 - 100, 300, 200, 250);
        ctx.strokeStyle = '#1976d2';
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width / 2 - 100, 300, 200, 250);

        // Add some lines to represent text
        ctx.fillStyle = '#cccccc';
        for (let i = 0; i < 8; i++) {
            const y = 330 + i * 25;
            const width = Math.random() * 120 + 60;
            ctx.fillRect(canvas.width / 2 - 80, y, width, 3);
        }

        return canvas.toDataURL('image/png');
    }

    /**
     * Convert Word document to HTML using mammoth
     */
    async convertWordToHtml(file: File): Promise<{ html: string; messages: any[] }> {
        try {
            // Dynamic import to reduce initial bundle size
            const mammoth = await import('mammoth');

            const arrayBuffer = await file.arrayBuffer();

            // Configure mammoth with proper options for browser environment
            const options = {
                styleMap: [
                    "p[style-name='Heading 1'] => h1:fresh",
                    "p[style-name='Heading 2'] => h2:fresh",
                    "p[style-name='Heading 3'] => h3:fresh"
                ],
                includeDefaultStyleMap: true,
                convertImage: mammoth.default.images.imgElement(function (image) {
                    return image.read('base64').then(function (imageBuffer) {
                        return {
                            src: 'data:' + image.contentType + ';base64,' + imageBuffer
                        };
                    });
                }),
                transformDocument: mammoth.default.transforms.paragraph(function (element) {
                    if (element.styleId === 'Heading1') {
                        return { ...element, styleName: 'Heading 1' };
                    }
                    return element;
                })
            };

            const result = await mammoth.default.convertToHtml({ arrayBuffer }, options);

            return {
                html: result.value,
                messages: result.messages
            };
        } catch (error) {
            console.error('Error converting Word to HTML:', error);

            // Fallback: return basic HTML structure
            return {
                html: `
                    <div style="padding: 20px; text-align: center; color: #666;">
                        <h3>Không thể hiển thị preview</h3>
                        <p>File Word hợp lệ nhưng không thể chuyển đổi sang HTML để preview.</p>
                        <p>Bạn vẫn có thể tiếp tục với việc mapping fields.</p>
                    </div>
                `,
                messages: [{ type: 'warning', message: error.message }]
            };
        }
    }

    /**
     * Convert HTML to image using html2canvas
     */
    async convertHtmlToImage(html: string, options: WordToImageOptions = {}): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                // Create a temporary container
                const container = document.createElement('div');
                container.style.position = 'absolute';
                container.style.left = '-9999px';
                container.style.top = '-9999px';
                container.style.width = `${options.width || 800}px`;
                container.style.backgroundColor = options.backgroundColor || 'white';
                container.style.padding = '20px';
                container.style.fontFamily = 'Times New Roman, serif';
                container.style.fontSize = '14px';
                container.style.lineHeight = '1.4';

                // Set HTML content
                container.innerHTML = html;

                // Add to document
                document.body.appendChild(container);

                // Import html2canvas dynamically
                import('html2canvas')
                    .then(html2canvas => {
                        html2canvas
                            .default(container, {
                                width: options.width || 800,
                                height: options.height || 1000,
                                scale: options.scale || 1,
                                backgroundColor: options.backgroundColor || 'white',
                                useCORS: true,
                                allowTaint: true
                            })
                            .then(canvas => {
                                // Convert canvas to image URL
                                const imageUrl = canvas.toDataURL('image/png');

                                // Clean up
                                document.body.removeChild(container);

                                resolve(imageUrl);
                            })
                            .catch(error => {
                                // Clean up on error
                                if (document.body.contains(container)) {
                                    document.body.removeChild(container);
                                }
                                reject(error);
                            });
                    })
                    .catch(error => {
                        // Clean up on error
                        if (document.body.contains(container)) {
                            document.body.removeChild(container);
                        }
                        reject(new Error('Không thể tải html2canvas library'));
                    });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get document preview as HTML (for alternative display)
     */
    async getDocumentPreview(file: File): Promise<string> {
        try {
            const result = await this.convertWordToHtml(file);

            // Add some basic styling for preview
            const styledHtml = `
                <div style="
                    font-family: 'Times New Roman', serif;
                    font-size: 14px;
                    line-height: 1.4;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    background: white;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                ">
                    ${result.html}
                </div>
            `;

            return styledHtml;
        } catch (error) {
            console.error('Error getting document preview:', error);
            throw new Error('Không thể tạo preview cho tài liệu');
        }
    }

    /**
     * Extract text content from Word document
     */
    async extractTextContent(file: File): Promise<string> {
        try {
            // Dynamic import to reduce initial bundle size
            const mammoth = await import('mammoth');

            const arrayBuffer = await file.arrayBuffer();

            const result = await mammoth.default.extractRawText({ arrayBuffer });

            return result.value;
        } catch (error) {
            console.error('Error extracting text content:', error);
            throw new Error('Không thể trích xuất nội dung text');
        }
    }

    /**
     * Validate Word document
     */
    async validateWordDocument(file: File): Promise<{ isValid: boolean; error?: string }> {
        try {
            console.log('Validating file:', {
                name: file.name,
                type: file.type,
                size: file.size
            });

            // Check file type - prioritize file extension over MIME type
            const isDocxByExtension = file.name.toLowerCase().endsWith('.docx');
            const isWordByMimeType =
                file.type.includes('word') ||
                file.type.includes('officedocument.wordprocessingml') ||
                file.type ===
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

            if (!isDocxByExtension && !isWordByMimeType) {
                console.log('File type validation failed:', {
                    name: file.name,
                    type: file.type,
                    isDocxByExtension,
                    isWordByMimeType
                });
                return { isValid: false, error: 'File không phải là định dạng Word (.docx)' };
            }

            // Check file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                console.log('File size validation failed');
                return { isValid: false, error: 'File quá lớn (tối đa 10MB)' };
            }

            // Try to parse the document with mammoth
            try {
                console.log('Attempting to parse document with mammoth...');
                const mammoth = await import('mammoth');
                const arrayBuffer = await file.arrayBuffer();

                // Configure mammoth with proper options for browser environment
                const options = {
                    styleMap: [],
                    includeDefaultStyleMap: true,
                    convertImage: mammoth.default.images.imgElement(function (image) {
                        return image.read('base64').then(function (imageBuffer) {
                            return {
                                src: 'data:' + image.contentType + ';base64,' + imageBuffer
                            };
                        });
                    })
                };

                // Simple validation - just try to extract text
                const result = await mammoth.default.extractRawText({ arrayBuffer });
                console.log('Document parsed successfully, text length:', result.value.length);

                // Also try to convert to HTML to ensure full compatibility
                const htmlResult = await mammoth.default.convertToHtml({ arrayBuffer }, options);
                console.log('HTML conversion successful, HTML length:', htmlResult.value.length);

                return { isValid: true };
            } catch (parseError) {
                console.error('Document parsing failed:', parseError);

                // Try alternative validation method
                try {
                    console.log('Trying alternative validation method...');
                    // Check if it's a valid ZIP file (DOCX is essentially a ZIP)
                    const arrayBuffer = await file.arrayBuffer();
                    const uint8Array = new Uint8Array(arrayBuffer);

                    // Check ZIP file signature (PK)
                    if (uint8Array[0] === 0x50 && uint8Array[1] === 0x4b) {
                        console.log('File has valid ZIP signature');
                        return { isValid: true };
                    }

                    throw new Error('Invalid file format');
                } catch (altError) {
                    console.error('Alternative validation also failed:', altError);
                    return {
                        isValid: false,
                        error: `Không thể đọc file Word: ${parseError.message}`
                    };
                }
            }
        } catch (error) {
            console.error('Validation error:', error);
            return {
                isValid: false,
                error: `Lỗi validation: ${error.message}`
            };
        }
    }

    /**
     * Get document metadata
     */
    async getDocumentMetadata(file: File): Promise<{
        fileName: string;
        fileSize: number;
        lastModified: Date;
        wordCount?: number;
        hasImages?: boolean;
    }> {
        try {
            const textContent = await this.extractTextContent(file);
            const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;

            const htmlResult = await this.convertWordToHtml(file);
            const hasImages = htmlResult.html.includes('<img');

            return {
                fileName: file.name,
                fileSize: file.size,
                lastModified: new Date(file.lastModified),
                wordCount,
                hasImages
            };
        } catch (error) {
            console.error('Error getting document metadata:', error);
            return {
                fileName: file.name,
                fileSize: file.size,
                lastModified: new Date(file.lastModified)
            };
        }
    }
}

// Export singleton instance
export const wordToImageService = new WordToImageService();
export default wordToImageService;
