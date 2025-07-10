chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.clear();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // TODO: Here you can add logic such as e.g. disable popup button on specific pages
    console.debug('tabId', tabId, 'changeInfo', changeInfo, 'tab', tab);
});

// Define message types
interface BackgroundMessage {
    type: string;
    payload?: {
        urls?: string[];
        [key: string]: unknown;
    };
}

interface BackgroundResponse {
    success: boolean;
    error?: string;
}

// Handle messages from content script
chrome.runtime.onMessage.addListener(
    (
        message: BackgroundMessage,
        _sender: chrome.runtime.MessageSender,
        sendResponse: (response?: BackgroundResponse) => void
    ) => {
        console.debug('Background received message:', message);

        if (message.type === 'OPEN_DASHBOARD') {
            chrome.runtime
                .openOptionsPage()
                .then(() => {
                    console.log('Dashboard opened successfully');
                    sendResponse({ success: true });
                })
                .catch(error => {
                    console.error('Error opening dashboard:', error);
                    sendResponse({ success: false, error: error.message });
                });

            // Return true to indicate we will send a response asynchronously
            return true;
        }

        if (message.type === 'ANALYZE_URLS') {
            // Handle URL analysis request
            console.log('Analyzing URLs:', message.payload?.urls);
            // TODO: Implement URL analysis logic
            sendResponse({ success: true });
            return true;
        }
    }
);

export {};
