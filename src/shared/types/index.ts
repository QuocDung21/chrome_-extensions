// Shared types between popup, admin, content, and background scripts

export interface ExtensionState {
    enabled: boolean;
    version: string;
    lastUpdate: string;
    permissions: string[];
}

export interface UserSettings {
    notifications: boolean;
    autoSync: boolean;
    darkMode: boolean;
    language: string;
    syncInterval: number;
    maxRetries: number;
}

export interface AnalyticsData {
    pageViews: number;
    uniqueUsers: number;
    sessionDuration: string;
    bounceRate: number;
}

export interface ActivityLog {
    id: string;
    action: string;
    description: string;
    timestamp: string;
    status: 'success' | 'error' | 'warning' | 'info';
    userId?: string;
}

export interface NotificationData {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: string;
    read: boolean;
}

export interface DashboardStats {
    totalUsers: number;
    activeExtensions: number;
    securityEvents: number;
    performanceScore: number;
}

// Chrome Extension specific types
export interface ChromeStorageData {
    settings: UserSettings;
    analytics: AnalyticsData;
    logs: ActivityLog[];
    notifications: NotificationData[];
}

// API Response types
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    error?: string;
}

// UI Component types
export interface TableColumn {
    id: string;
    label: string;
    minWidth?: number;
    align?: 'right' | 'left' | 'center';
    format?: (value: any) => string;
}

export interface ChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        backgroundColor?: string;
        borderColor?: string;
    }[];
}
