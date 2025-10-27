function toNumber(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return isNaN(parsed) ? fallback : parsed;
}

export const ConfigConstant = {
    API_URL: process.env.REACT_APP_API_URL ?? 'http://laptrinhid.qlns.vn',
    SOCKET_URL: process.env.REACT_APP_SOCKET_URL ?? 'http://103.162.21.146:5003',
    SYNCFUSION_SERVICE_KEY:
        'Ngo9BigBOggjHTQxAR8/V1JFaF1cX2hIfkx0Q3xbf1x1ZFdMZVhbRXJPMyBoS35Rc0RjWHZecnFRR2RcVEx1VEFc',
    SYNCFUSION_SERVICE_URL: 'https://services.syncfusion.com/react/production/api/documenteditor/',
    SOCKET_RECONNECT_ATTEMPTS: toNumber(process.env.REACT_SOCKET_RECONNECT_ATTEMPTS, 5),
    SOCKET_RECONNECT_DELAY: toNumber(process.env.REACT_SOCKET_RECONNECT_DELAY, 3000)
};
