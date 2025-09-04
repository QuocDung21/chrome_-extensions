function toNumber(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return isNaN(parsed) ? fallback : parsed;
}

export const ConfigConstant = {
    SOCKET_URL: process.env.REACT_APP_SOCKET_URL ?? 'http://103.162.21.146:5003',
    SYNCFUSION_SERVICE_URL:
        process.env.REACT_SYNCFUSION_SERVICE_URL ??
        'https://services.syncfusion.com/react/production/api/documenteditor/',
    SOCKET_RECONNECT_ATTEMPTS: toNumber(process.env.REACT_SOCKET_RECONNECT_ATTEMPTS, 5),
    SOCKET_RECONNECT_DELAY: toNumber(process.env.REACT_SOCKET_RECONNECT_DELAY, 3000)
};
