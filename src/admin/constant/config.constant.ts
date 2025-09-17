function toNumber(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return isNaN(parsed) ? fallback : parsed;
}

export const ConfigConstant = {
    API_URL: process.env.REACT_APP_API_URL ?? 'http://laptrinhid.qlns.vn',
    SOCKET_URL: process.env.REACT_APP_SOCKET_URL ?? 'http://103.162.21.146:5003',

    /**
     * Syncfusion DocumentEditor service URL for DOCX to SFDT conversion
     *
     * Public services (may be unreliable):
     * - https://services.syncfusion.com/react/production/api/documenteditor/
     * - https://services.syncfusion.com/js/production/api/documenteditor/
     * - https://ej2services.syncfusion.com/production/web-services/api/documenteditor/
     *
     * For production, consider setting up your own local service:
     * 1. Download Syncfusion DocumentEditor server from: https://github.com/SyncfusionExamples/EJ2-DocumentEditor-WebServices
     * 2. Deploy it locally or on your server
     * 3. Set REACT_SYNCFUSION_SERVICE_URL environment variable to your service URL
     *
     * Example: REACT_SYNCFUSION_SERVICE_URL=http://localhost:5000/api/documenteditor/
     */
    SYNCFUSION_SERVICE_URL:
        process.env.REACT_SYNCFUSION_SERVICE_URL ??
        'https://services.syncfusion.com/react/production/api/documenteditor/',

    SOCKET_RECONNECT_ATTEMPTS: toNumber(process.env.REACT_SOCKET_RECONNECT_ATTEMPTS, 5),
    SOCKET_RECONNECT_DELAY: toNumber(process.env.REACT_SOCKET_RECONNECT_DELAY, 3000)
};
