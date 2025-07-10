import { ChromeMessage, ChromeMessageType } from '@/common/chrome-api-wrapper';
import { FormFillData, ScraperCommand, ScraperMessage } from '@/common/types/scraper';
import { FormFiller, getElementsWithIndices, showNotification } from '@/utils/formFiller';

async function handleScrapeCommand() {
    const pageTitle = document.title;
    const message = new ChromeMessage(ChromeMessageType.SCRAPING_RESULTS, pageTitle);
    await chrome.runtime.sendMessage(chrome.runtime.id, message);
}
chrome.runtime.onMessage.addListener(message => {
    console.debug('Received message', message);

    if (message.type === ChromeMessageType.SCRAPER_COMMAND) {
        const scraperMessage = message as ChromeMessage<ScraperMessage>;
        if (scraperMessage.payload.command === ScraperCommand.SCRAPE) {
            handleScrapeCommand().catch(error => console.error(error));
        }
        return false;
    }

    if (message.type === ChromeMessageType.FILL_FORM_DATA) {
        const fillMessage = message as ChromeMessage<FormFillData>;
        handleFillFormData(fillMessage.payload).catch(error => console.error(error));
        return false;
    }

    return false;
});

async function handleFillFormData(data: FormFillData) {
    console.log('Filling form with data:', data);

    try {
        const formFiller = new FormFiller({
            includeHidden: true,
            triggerEvents: true,
            onElementFilled: (element, value, identifier) => {
                const elementInfo =
                    element.id ||
                    (element as HTMLInputElement).name ||
                    `${element.tagName}[${(element as HTMLInputElement).type}]`;
                console.log(`✅ Filled field ${identifier} (${elementInfo}) with value: ${value}`);
            },
            onElementNotFound: identifier => {
                console.warn(`❌ Could not find element with identifier: ${identifier}`);
            }
        });

        const result = await formFiller.fillForm(data);

        // Show notification to user
        if (result.filledCount > 0) {
            showNotification(`Đã điền ${result.filledCount} trường thành công!`, 'success');
        }
        if (result.notFoundCount > 0) {
            showNotification(`Không tìm thấy ${result.notFoundCount} trường`, 'warning');
        }
        if (result.errors.length > 0) {
            console.error('Form filling errors:', result.errors);
            showNotification('Có lỗi xảy ra khi điền form', 'error');
        }
    } catch (error) {
        console.error('Error filling form:', error);
        showNotification('Có lỗi xảy ra khi điền form', 'error');
    }
}

// Create floating button and overlay
function createFloatingUI() {
    console.log('Creating floating UI...');

    // Check if already exists
    if (document.getElementById('chrome-extension-floating-ui')) {
        console.log('Floating UI already exists');
        return;
    }

    // Create container
    const container = document.createElement('div');
    container.id = 'chrome-extension-floating-ui';
    container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 2147483647;
    `;

    // Create floating button
    const floatingButton = document.createElement('button');
    floatingButton.id = 'floating-extension-button';
    floatingButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"/>
        </svg>
    `;
    floatingButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: #1976d2;
        color: white;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        transition: all 0.2s ease-in-out;
        z-index: 2147483647;
    `;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'floating-extension-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 400px;
        max-height: 600px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        z-index: 2147483646;
        pointer-events: auto;
        display: none;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    `;

    overlay.innerHTML = `
        <div style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 18px; font-weight: 600;">NTSOFT Document AI</h2>
                <button id="close-overlay" style="background: none; border: none; font-size: 20px; cursor: pointer; padding: 4px;">×</button>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin-bottom: 20px;">

            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 500; font-size: 14px;">Thêm URL để phân tích:</label>
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                    <input id="url-input" type="text" placeholder="https://example.com" style="flex: 1; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                    <button id="add-url" style="padding: 8px 16px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Thêm</button>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button id="add-current-url" style="padding: 6px 12px; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; flex: 1;">
                        📍 Thêm trang hiện tại
                    </button>
                    <button id="fill-current-url" style="padding: 6px 12px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; flex: 1;">
                        ✏️ Điền vào ô
                    </button>
                </div>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">Danh sách URLs (<span id="url-count">0</span>)</h3>
                <div id="url-list" style="max-height: 200px; overflow-y: auto; border: 1px solid #eee; border-radius: 4px; padding: 8px;">
                    <p style="text-align: center; color: #666; margin: 20px 0;">Chưa có URL nào. Thêm URL để bắt đầu phân tích.</p>
                </div>
            </div>

            <hr style="border: none; border-top: 1px solid #eee; margin-bottom: 20px;">

            <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">Điền dữ liệu vào Form</h3>
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500; font-size: 14px;">Dữ liệu JSON:</label>
                    <textarea id="form-data-input" placeholder='{"data": [{"26": "Đây là nơi ghi chú"}, {"14": "6836bc24cfd0c57611ffb663"}]}' style="width: 100%; height: 120px; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; font-family: monospace; resize: vertical; box-sizing: border-box;"></textarea>
                </div>
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                    <button id="fill-form-btn" style="padding: 8px 16px; background: #9c27b0; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; flex: 1;">
                        Điền Form
                    </button>
                    <button id="clear-form-btn" style="padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                        Xóa
                    </button>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button id="show-inputs-btn" style="padding: 6px 12px; background: #607d8b; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; flex: 1;">
                        📋 Hiển thị danh sách Input (Index)
                    </button>
                </div>
            </div>

            <hr style="border: none; border-top: 1px solid #eee; margin-bottom: 20px;">

            <div style="text-align: center; display: flex; gap: 12px; justify-content: center;">
                <button id="analyze-btn" style="padding: 12px 24px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; min-width: 120px;" disabled>
                    Phân tích
                </button>
                <button id="dashboard-btn" style="padding: 12px 24px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; min-width: 120px;">
                    Dashboard
                </button>
            </div>
        </div>
    `;

    // Add elements to container
    container.appendChild(floatingButton);
    container.appendChild(overlay);
    document.body.appendChild(container);

    console.log('Floating UI elements added to DOM');

    // State management
    let urls: string[] = [];
    let isOverlayOpen = false;

    // Load saved URLs
    chrome.storage.local.get(['urls'], result => {
        if (result.urls) {
            urls = result.urls;
            updateUrlList();
        }
    });

    // Event handlers
    floatingButton.addEventListener('click', () => {
        console.log('Floating button clicked');
        isOverlayOpen = !isOverlayOpen;
        overlay.style.display = isOverlayOpen ? 'block' : 'none';
        floatingButton.style.background = isOverlayOpen ? '#f44336' : '#1976d2';
        console.log('Overlay is now:', isOverlayOpen ? 'open' : 'closed');
    });

    document.getElementById('close-overlay')?.addEventListener('click', () => {
        isOverlayOpen = false;
        overlay.style.display = 'none';
        floatingButton.style.background = '#1976d2';
    });

    document.getElementById('add-url')?.addEventListener('click', addUrl);
    document.getElementById('url-input')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') addUrl();
    });

    document.getElementById('add-current-url')?.addEventListener('click', addCurrentUrl);
    document.getElementById('fill-current-url')?.addEventListener('click', fillCurrentUrl);

    document.getElementById('fill-form-btn')?.addEventListener('click', fillFormData);
    document.getElementById('clear-form-btn')?.addEventListener('click', clearFormData);
    document.getElementById('show-inputs-btn')?.addEventListener('click', showInputsList);

    document.getElementById('analyze-btn')?.addEventListener('click', analyzeUrls);
    document.getElementById('dashboard-btn')?.addEventListener('click', openDashboard);

    function addUrl() {
        const input = document.getElementById('url-input') as HTMLInputElement;
        const url = input.value.trim();

        if (url && !urls.includes(url)) {
            urls.push(url);
            input.value = '';
            updateUrlList();
            saveUrls();
        }
    }

    function addCurrentUrl() {
        const currentUrl = window.location.href;
        if (currentUrl && !urls.includes(currentUrl)) {
            urls.push(currentUrl);
            updateUrlList();
            saveUrls();
            console.log('Added current URL:', currentUrl);
        } else if (urls.includes(currentUrl)) {
            console.log('Current URL already in list');
        }
    }

    function fillCurrentUrl() {
        const input = document.getElementById('url-input') as HTMLInputElement;
        const currentUrl = window.location.href;
        if (input && currentUrl) {
            input.value = currentUrl;
            input.focus();
            console.log('Filled current URL into input:', currentUrl);
        }
    }

    function removeUrl(url: string) {
        urls = urls.filter(u => u !== url);
        updateUrlList();
        saveUrls();
    }

    function updateUrlList() {
        const urlList = document.getElementById('url-list');
        const urlCount = document.getElementById('url-count');
        const analyzeBtn = document.getElementById('analyze-btn') as HTMLButtonElement;

        if (urlCount) {
            urlCount.textContent = urls.length.toString();
        }

        if (analyzeBtn) {
            analyzeBtn.disabled = urls.length === 0;
        }

        if (urlList) {
            if (urls.length === 0) {
                urlList.innerHTML =
                    '<p style="text-align: center; color: #666; margin: 20px 0;">Chưa có URL nào. Thêm URL để bắt đầu phân tích.</p>';
            } else {
                urlList.innerHTML = urls
                    .map(
                        url => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee;">
                        <span style="font-size: 12px; word-break: break-all; flex: 1;">${url}</span>
                        <button onclick="removeUrl('${url}')" style="background: #f44336; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 12px; margin-left: 8px;">Xóa</button>
                    </div>
                `
                    )
                    .join('');
            }
        }
    }

    function saveUrls() {
        chrome.storage.local.set({ urls });
    }

    function fillFormData() {
        const textarea = document.getElementById('form-data-input') as HTMLTextAreaElement;
        if (!textarea) return;

        const jsonData = textarea.value.trim();
        if (!jsonData) {
            // Fill with example data if empty
            const exampleData = {
                data: [
                    { '26': 'Đây là nơi ghi chú' },
                    { '14': '6836bc24cfd0c57611ffb663' },
                    { '11': '09/07/2025' },
                    { '17': 'P8 Vĩnh Long' },
                    { '43': '5def47c5f47614018c000092' },
                    { '8': 'quocdung112001@gmail.com' },
                    { '9': '0856768739' },
                    { '2': 'helloword@gmail.com' },
                    { '3': '0856768739' }
                ]
            };
            textarea.value = JSON.stringify(exampleData, null, 2);
            showNotification('Đã điền dữ liệu mẫu. Bạn có thể chỉnh sửa và thử lại.', 'success');
            return;
        }

        try {
            const data = JSON.parse(jsonData) as FormFillData;
            if (!data.data || !Array.isArray(data.data)) {
                alert('Dữ liệu JSON không đúng định dạng. Cần có thuộc tính "data" là một mảng.');
                return;
            }

            // Send message to fill form
            handleFillFormData(data).catch(error => {
                console.error('Error filling form:', error);
                alert('Có lỗi xảy ra khi điền form: ' + error.message);
            });
        } catch (error) {
            alert('Dữ liệu JSON không hợp lệ: ' + (error as Error).message);
        }
    }

    function clearFormData() {
        const textarea = document.getElementById('form-data-input') as HTMLTextAreaElement;
        if (textarea) {
            textarea.value = '';
        }
    }

    function showInputsList() {
        // Use the FormFiller utils to get elements with indices
        const elementsWithIndices = getElementsWithIndices({ includeHidden: true });

        // Create a detailed list
        let inputsList = `📋 DANH SÁCH INPUT ELEMENTS (${elementsWithIndices.length} elements):\n\n`;

        elementsWithIndices.forEach(({ index, info }) => {
            inputsList += `[${index}] ${info}\n\n`;
        });

        // Show in console
        console.log(inputsList);

        // Show notification
        showNotification(
            `Đã tìm thấy ${elementsWithIndices.length} input elements. Xem console để biết chi tiết.`,
            'success'
        );

        // Also create a modal to show the list
        showInputsModal(elementsWithIndices.map(item => item.element));
    }

    function showInputsModal(
        inputs: (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[]
    ) {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.id = 'inputs-list-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 2147483648;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        `;

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 20px;
            max-width: 80%;
            max-height: 80%;
            overflow-y: auto;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        `;

        let content = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 18px; font-weight: 600;">📋 Danh sách Input Elements (${inputs.length})</h2>
                <button id="close-inputs-modal" style="background: none; border: none; font-size: 20px; cursor: pointer; padding: 4px;">×</button>
            </div>
            <div style="font-size: 12px; font-family: monospace; line-height: 1.4;">
        `;

        inputs.forEach((input, index) => {
            const tagName = input.tagName.toLowerCase();
            const type = input.type || 'text';
            const id = input.id || 'no-id';
            const name = input.name || 'no-name';
            const placeholder = (input as HTMLInputElement).placeholder || 'no-placeholder';
            const value = input.value || 'empty';

            content += `
                <div style="border: 1px solid #eee; border-radius: 4px; padding: 8px; margin-bottom: 8px; background: #f9f9f9;">
                    <strong style="color: #1976d2;">[${index}] ${tagName}[${type}]</strong><br>
                    <span style="color: #666;">ID:</span> ${id}<br>
                    <span style="color: #666;">Name:</span> ${name}<br>
                    <span style="color: #666;">Placeholder:</span> ${placeholder}<br>
                    <span style="color: #666;">Value:</span> ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}
                </div>
            `;
        });

        content += `</div>`;
        modalContent.innerHTML = content;
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Close modal event
        document.getElementById('close-inputs-modal')?.addEventListener('click', () => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        });

        // Close on overlay click
        modal.addEventListener('click', e => {
            if (e.target === modal) {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }
        });
    }

    async function analyzeUrls() {
        const analyzeBtn = document.getElementById('analyze-btn') as HTMLButtonElement;
        if (analyzeBtn) {
            analyzeBtn.textContent = 'Đang phân tích...';
            analyzeBtn.disabled = true;
        }

        try {
            await chrome.runtime.sendMessage({
                type: 'ANALYZE_URLS',
                payload: { urls }
            });
        } catch (error) {
            console.error('Error analyzing URLs:', error);
        } finally {
            if (analyzeBtn) {
                analyzeBtn.textContent = 'Phân tích';
                analyzeBtn.disabled = urls.length === 0;
            }
        }
    }

    async function openDashboard() {
        try {
            await chrome.runtime.sendMessage({
                type: 'OPEN_DASHBOARD'
            });
            console.log('Dashboard open request sent');
        } catch (error) {
            console.error('Error opening dashboard:', error);
        }
    }

    // Make removeUrl globally accessible
    (window as unknown as { removeUrl: typeof removeUrl }).removeUrl = removeUrl;

    // Hover effects
    floatingButton.addEventListener('mouseenter', () => {
        floatingButton.style.transform = 'scale(1.1)';
    });

    floatingButton.addEventListener('mouseleave', () => {
        floatingButton.style.transform = 'scale(1)';
    });
}

// Initialize floating UI when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFloatingUI);
} else {
    createFloatingUI();
}

console.debug('Chrome plugin content script loaded with floating UI');

export {};
