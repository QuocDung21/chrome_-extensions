import { useState, useCallback, useMemo } from 'react';
import { TemplateFile, ProcessingData, ProcessingResult } from './templateUtils';
import { generateDocumentWithProgress, downloadDocument, printDocument } from './templateUtils';

export interface TemplateState {
    selectedTemplate: TemplateFile | null;
    isProcessing: boolean;
    progress: number;
    currentStep: string;
    generatedBlob: Blob | null;
    error: string | null;
    processingTime: number;
    fileSize: number;
}

export interface UseTemplateManagerReturn {
    state: TemplateState;
    selectTemplate: (template: TemplateFile) => void;
    processTemplate: (data: ProcessingData) => Promise<void>;
    downloadGeneratedDocument: () => void;
    printGeneratedDocument: () => void;
    resetState: () => void;
    clearError: () => void;
}

export const useTemplateManager = (): UseTemplateManagerReturn => {
    const [state, setState] = useState<TemplateState>({
        selectedTemplate: null,
        isProcessing: false,
        progress: 0,
        currentStep: '',
        generatedBlob: null,
        error: null,
        processingTime: 0,
        fileSize: 0
    });

    const selectTemplate = useCallback((template: TemplateFile) => {
        setState(prev => ({
            ...prev,
            selectedTemplate: template,
            generatedBlob: null,
            error: null,
            progress: 0,
            currentStep: '',
            processingTime: 0,
            fileSize: 0
        }));
    }, []);

    const processTemplate = useCallback(async (data: ProcessingData) => {
        if (!state.selectedTemplate) {
            setState(prev => ({
                ...prev,
                error: 'Vui lòng chọn một mẫu đơn trước khi xử lý dữ liệu.'
            }));
            return;
        }

        setState(prev => ({
            ...prev,
            isProcessing: true,
            error: null,
            generatedBlob: null,
            progress: 0,
            currentStep: 'Bắt đầu xử lý...'
        }));

        try {
            const result = await generateDocumentWithProgress(
                state.selectedTemplate.path,
                data,
                (progress, step) => {
                    setState(prev => ({
                        ...prev,
                        progress,
                        currentStep: step
                    }));
                }
            );

            setState(prev => ({
                ...prev,
                isProcessing: false,
                generatedBlob: result.blob,
                processingTime: result.processingTime,
                fileSize: result.fileSize,
                progress: 100,
                currentStep: 'Hoàn thành'
            }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                isProcessing: false,
                error: error instanceof Error ? error.message : 'Lỗi không xác định',
                progress: 0,
                currentStep: 'Lỗi'
            }));
        }
    }, [state.selectedTemplate]);

    const downloadGeneratedDocument = useCallback(() => {
        if (!state.generatedBlob || !state.selectedTemplate) {
            return;
        }

        try {
            downloadDocument(
                state.generatedBlob,
                state.selectedTemplate.label
            );
        } catch (error) {
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Lỗi tải xuống'
            }));
        }
    }, [state.generatedBlob, state.selectedTemplate]);

    const printGeneratedDocument = useCallback(() => {
        if (!state.generatedBlob) {
            return;
        }

        // Convert blob to text for printing
        const reader = new FileReader();
        reader.onload = () => {
            const content = reader.result as string;
            const title = state.selectedTemplate?.label || 'Tài liệu';
            printDocument(content, title);
        };
        reader.readAsText(state.generatedBlob);
    }, [state.generatedBlob, state.selectedTemplate]);

    const resetState = useCallback(() => {
        setState({
            selectedTemplate: null,
            isProcessing: false,
            progress: 0,
            currentStep: '',
            generatedBlob: null,
            error: null,
            processingTime: 0,
            fileSize: 0
        });
    }, []);

    const clearError = useCallback(() => {
        setState(prev => ({
            ...prev,
            error: null
        }));
    }, []);

    return {
        state,
        selectTemplate,
        processTemplate,
        downloadGeneratedDocument,
        printGeneratedDocument,
        resetState,
        clearError
    };
};

// Hook for managing template categories and filtering
export const useTemplateFilter = (templates: TemplateFile[]) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const categories = useMemo(() => {
        const cats = new Set(templates.map(t => t.category || 'Khác'));
        return Array.from(cats).sort();
    }, [templates]);

    const filteredTemplates = useMemo(() => {
        return templates.filter(template => {
            const matchesSearch = template.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                template.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [templates, searchTerm, selectedCategory]);

    return {
        searchTerm,
        setSearchTerm,
        selectedCategory,
        setSelectedCategory,
        categories,
        filteredTemplates
    };
};

// Hook for managing processing history
export interface ProcessingHistoryItem {
    id: string;
    templateName: string;
    processingTime: number;
    fileSize: number;
    timestamp: Date;
    status: 'success' | 'error';
}

export const useProcessingHistory = () => {
    const [history, setHistory] = useState<ProcessingHistoryItem[]>([]);

    const addToHistory = useCallback((item: Omit<ProcessingHistoryItem, 'id' | 'timestamp'>) => {
        const newItem: ProcessingHistoryItem = {
            ...item,
            id: Date.now().toString(),
            timestamp: new Date()
        };

        setHistory(prev => [newItem, ...prev.slice(0, 49)]); // Keep last 50 items
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
    }, []);

    const removeFromHistory = useCallback((id: string) => {
        setHistory(prev => prev.filter(item => item.id !== id));
    }, []);

    return {
        history,
        addToHistory,
        clearHistory,
        removeFromHistory
    };
}; 