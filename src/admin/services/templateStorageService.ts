interface StoredTemplate {
    id: string;
    name: string;
    description: string;
    fileName: string;
    fileSize: string;
    uploadDate: string;
    status: 'active' | 'inactive';
    category: string;
    templateData?: string; // Base64 encoded template data
}

class TemplateStorageService {
    private readonly STORAGE_KEY = 'form_templates';

    /**
     * Get all templates from storage
     */
    async getTemplates(): Promise<StoredTemplate[]> {
        try {
            const result = await chrome.storage.local.get([this.STORAGE_KEY]);
            return result[this.STORAGE_KEY] || [];
        } catch (error) {
            console.error('Error getting templates:', error);
            return [];
        }
    }

    /**
     * Save template to storage
     */
    async saveTemplate(template: StoredTemplate): Promise<void> {
        try {
            const templates = await this.getTemplates();
            const existingIndex = templates.findIndex(t => t.id === template.id);
            
            if (existingIndex >= 0) {
                templates[existingIndex] = template;
            } else {
                templates.push(template);
            }

            await chrome.storage.local.set({
                [this.STORAGE_KEY]: templates
            });
        } catch (error) {
            console.error('Error saving template:', error);
            throw new Error('Không thể lưu template');
        }
    }

    /**
     * Delete template from storage
     */
    async deleteTemplate(templateId: string): Promise<void> {
        try {
            const templates = await this.getTemplates();
            const filteredTemplates = templates.filter(t => t.id !== templateId);
            
            await chrome.storage.local.set({
                [this.STORAGE_KEY]: filteredTemplates
            });
        } catch (error) {
            console.error('Error deleting template:', error);
            throw new Error('Không thể xóa template');
        }
    }

    /**
     * Get template by ID
     */
    async getTemplate(templateId: string): Promise<StoredTemplate | null> {
        try {
            const templates = await this.getTemplates();
            return templates.find(t => t.id === templateId) || null;
        } catch (error) {
            console.error('Error getting template:', error);
            return null;
        }
    }

    /**
     * Convert file to base64 for storage
     */
    async fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                // Remove data URL prefix
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Convert base64 to ArrayBuffer
     */
    base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * Save template with file data
     */
    async saveTemplateWithFile(template: Omit<StoredTemplate, 'templateData'>, file: File): Promise<void> {
        try {
            const base64Data = await this.fileToBase64(file);
            const templateWithData: StoredTemplate = {
                ...template,
                templateData: base64Data
            };
            await this.saveTemplate(templateWithData);
        } catch (error) {
            console.error('Error saving template with file:', error);
            throw new Error('Không thể lưu template với file');
        }
    }

    /**
     * Get template file data as ArrayBuffer
     */
    async getTemplateFileData(templateId: string): Promise<ArrayBuffer | null> {
        try {
            const template = await this.getTemplate(templateId);
            if (!template || !template.templateData) {
                return null;
            }
            return this.base64ToArrayBuffer(template.templateData);
        } catch (error) {
            console.error('Error getting template file data:', error);
            return null;
        }
    }

    /**
     * Update template status
     */
    async updateTemplateStatus(templateId: string, status: 'active' | 'inactive'): Promise<void> {
        try {
            const template = await this.getTemplate(templateId);
            if (template) {
                template.status = status;
                await this.saveTemplate(template);
            }
        } catch (error) {
            console.error('Error updating template status:', error);
            throw new Error('Không thể cập nhật trạng thái template');
        }
    }

    /**
     * Get templates by category
     */
    async getTemplatesByCategory(category: string): Promise<StoredTemplate[]> {
        try {
            const templates = await this.getTemplates();
            return templates.filter(t => t.category === category);
        } catch (error) {
            console.error('Error getting templates by category:', error);
            return [];
        }
    }

    /**
     * Get active templates only
     */
    async getActiveTemplates(): Promise<StoredTemplate[]> {
        try {
            const templates = await this.getTemplates();
            return templates.filter(t => t.status === 'active');
        } catch (error) {
            console.error('Error getting active templates:', error);
            return [];
        }
    }

    /**
     * Clear all templates
     */
    async clearAllTemplates(): Promise<void> {
        try {
            await chrome.storage.local.remove([this.STORAGE_KEY]);
        } catch (error) {
            console.error('Error clearing templates:', error);
            throw new Error('Không thể xóa tất cả templates');
        }
    }

    /**
     * Get storage usage info
     */
    async getStorageInfo(): Promise<{ used: number; total: number; templates: number }> {
        try {
            const usage = await chrome.storage.local.getBytesInUse();
            const templates = await this.getTemplates();
            
            return {
                used: usage,
                total: chrome.storage.local.QUOTA_BYTES,
                templates: templates.length
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            return { used: 0, total: 0, templates: 0 };
        }
    }
}

// Export singleton instance
export const templateStorageService = new TemplateStorageService();
export default templateStorageService;
export type { StoredTemplate };
