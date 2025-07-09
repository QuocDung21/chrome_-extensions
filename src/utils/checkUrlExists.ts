const checkUrlExists = async (url: string): Promise<boolean> => {
    try {
        await fetch(url, {
            method: 'HEAD',
            mode: 'no-cors'
        });
        return true;
    } catch {
        try {
            await fetch(url, {
                method: 'GET',
                mode: 'no-cors'
            });
            return true;
        } catch {
            return false;
        }
    }
};

export default checkUrlExists;
