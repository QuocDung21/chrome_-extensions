function toNumber(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return isNaN(parsed) ? fallback : parsed;
}

export const ConfigConstant = {
    API_URL: process.env.REACT_APP_API_URL ?? 'http://laptrinhid.qlns.vn',
    // SOCKET_URL: process.env.REACT_APP_SOCKET_URL ?? 'http://103.162.21.146:5003',
    SOCKET_URL: process.env.REACT_APP_SOCKET_URL ?? 'https://rapidly-daring-magpie.ngrok-free.app',
    SOCKET_RECONNECT_ATTEMPTS: toNumber(process.env.REACT_SOCKET_RECONNECT_ATTEMPTS, 5),
    SOCKET_RECONNECT_DELAY: toNumber(process.env.REACT_SOCKET_RECONNECT_DELAY, 3000)
};
