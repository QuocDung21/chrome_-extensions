import { ChromeMessage, ChromeMessageType } from '@/common/chrome-api-wrapper';
import { FormFillData, ScraperCommand, ScraperMessage } from '@/common/types/scraper';
import {
    FormFiller,
    RowClickOptions,
    enableRowClickHandler,
    getClickableElements,
    getElementsWithIndices,
    showNotification
} from '@/utils/formFiller';

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

    // Create floating assistant card
    const floatingCard = document.createElement('div');
    floatingCard.id = 'floating-extension-card';
    floatingCard.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); border: 1px solid #e0e0e0;">
            <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                <div style="width: 8px; height: 8px; background: #4caf50; border-radius: 50%;"></div>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 14px; font-weight: 600; color: #333; margin: 0; line-height: 1.2;">NTS DocumentAI</span>
                    <span style="font-size: 12px; color: #666; margin: 0; line-height: 1.2;">Biến tài liệu giấy thành dữ liệu thông minh</span>
                </div>
            </div>
            <button id="floating-extension-button" style="
                width: 32px;
                height: 32px;
                border-radius: 8px;
                background: #2196f3;
                color: white;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease-in-out;
                box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
            ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
            </button>
        </div>
    `;
    floatingCard.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        pointer-events: auto;
        transition: all 0.2s ease-in-out;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    `;

    // Get the button element from the card
    const floatingButton = floatingCard.querySelector(
        '#floating-extension-button'
    ) as HTMLButtonElement;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'floating-extension-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 400px;
        max-height: 1000px;
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
                <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">Click Mode: Chọn class để click</h3>
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500; font-size: 14px;">Class name để click:</label>
                    <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                        <input id="target-class-input" type="text" placeholder="Nhập class name (vd: editor-click)" style="flex: 1; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                        <button id="enable-class-click-btn" style="padding: 8px 16px; background: #ff5722; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Bật Click</button>
                    </div>
                    <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                        <button id="show-clickable-btn" style="padding: 6px 12px; background: #607d8b; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; flex: 1;">
                            🖱️ Hiển thị danh sách Click Elements
                        </button>
                        <button id="enable-click-mode-btn" style="padding: 6px 12px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; flex: 1;">
                            ⚡ Bật chế độ Click tổng quát
                        </button>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 500; font-size: 14px;">Sequential Click - Click theo trình tự:</label>
                        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                            <input id="sequence-delay-input" type="number" placeholder="Delay (ms)" value="1000" style="width: 100px; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                            <button id="start-sequence-btn" style="padding: 8px 16px; background: #9c27b0; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; flex: 1;">
                                ▶️ Bắt đầu Click theo trình tự
                            </button>
                        </div>
                        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                            <button id="stop-sequence-btn" style="padding: 6px 12px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; flex: 1;" disabled>
                                ⏹️ Dừng
                            </button>
                            <button id="pause-sequence-btn" style="padding: 6px 12px; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; flex: 1;" disabled>
                                ⏸️ Tạm dừng
                            </button>
                            <button id="resume-sequence-btn" style="padding: 6px 12px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; flex: 1;" disabled>
                                ▶️ Tiếp tục
                            </button>
                        </div>
                        <div style="margin-bottom: 8px;">
                            <label style="display: block; margin-bottom: 4px; font-weight: 500; font-size: 12px;">Interactive Mode - Dừng và điền dữ liệu:</label>
                            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                                <input type="checkbox" id="interactive-mode-checkbox" style="margin-right: 8px;">
                                <label for="interactive-mode-checkbox" style="font-size: 12px;">Dừng tại mỗi element để điền dữ liệu</label>
                            </div>
                            <textarea id="sequence-data-input" placeholder='Dữ liệu JSON cho sequence:
{"data": ["Giá trị 1", "Giá trị 2", "Giá trị 3"]}' style="width: 100%; height: 60px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; font-family: monospace; resize: vertical; box-sizing: border-box;"></textarea>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button id="next-step-btn" style="padding: 6px 12px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; flex: 1;" disabled>
                                ➡️ Tiếp tục bước tiếp theo
                            </button>
                            <button id="fill-current-btn" style="padding: 6px 12px; background: #673ab7; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; flex: 1;" disabled>
                                📝 Điền dữ liệu hiện tại
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <hr style="border: none; border-top: 1px solid #eee; margin-bottom: 20px;">

            <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">Test chức năng: Điền dữ liệu vào Form</h3>
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
    container.appendChild(floatingCard);
    container.appendChild(overlay);
    document.body.appendChild(container);

    console.log('Floating UI elements added to DOM');

    // State management
    let urls: string[] = [];
    let isOverlayOpen = false;
    let clickModeEnabled = false;
    let clickModeCleanup: (() => void) | null = null;

    // Sequential click state
    let sequenceRunning = false;
    let sequencePaused = false;
    let sequenceTimeouts: number[] = [];
    let currentSequenceIndex = 0;
    let sequenceElements: Element[] = [];
    let interactiveMode = false;
    let sequenceData: string[] = [];
    let currentElement: Element | null = null;

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
        floatingButton.style.background = isOverlayOpen ? '#f44336' : '#2196f3';
        console.log('Overlay is now:', isOverlayOpen ? 'open' : 'closed');
    });

    document.getElementById('close-overlay')?.addEventListener('click', () => {
        isOverlayOpen = false;
        overlay.style.display = 'none';
        floatingButton.style.background = '#2196f3';
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
    document
        .getElementById('show-clickable-btn')
        ?.addEventListener('click', showClickableElementsList);
    document.getElementById('enable-click-mode-btn')?.addEventListener('click', toggleClickMode);
    document.getElementById('enable-class-click-btn')?.addEventListener('click', enableClassClick);
    document.getElementById('target-class-input')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') enableClassClick();
    });

    // Sequential click event listeners
    document.getElementById('start-sequence-btn')?.addEventListener('click', startSequentialClick);
    document.getElementById('stop-sequence-btn')?.addEventListener('click', stopSequentialClick);
    document.getElementById('pause-sequence-btn')?.addEventListener('click', pauseSequentialClick);
    document
        .getElementById('resume-sequence-btn')
        ?.addEventListener('click', resumeSequentialClick);

    // Interactive mode event listeners
    document.getElementById('next-step-btn')?.addEventListener('click', nextSequenceStep);
    document.getElementById('fill-current-btn')?.addEventListener('click', fillCurrentElement);

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
                    {
                        '1': 'Nguyễn Văn A',
                        '2': 'helloword@gmail.com',
                        '3': '0856768739',
                        '4': '123 Đường ABC, Quận 1',
                        '5': 'Hồ Chí Minh',
                        '6': 'Việt Nam',
                        '7': '700000',
                        '8': 'quocdung112001@gmail.com',
                        '9': '0856768739',
                        '10': 'Công ty TNHH ABC',
                        '11': '09/07/2025',
                        '12': 'Giám đốc',
                        '13': 'IT',
                        '14': '6836bc24cfd0c57611ffb663',
                        '15': 'ABC123456',
                        '16': 'Ngân hàng Vietcombank',
                        '17': 'P8 Vĩnh Long',
                        '18': 'Chi nhánh Sài Gòn',
                        '19': '1000000',
                        '20': 'VND',
                        '21': 'Chuyển khoản',
                        '22': 'Thanh toán hóa đơn',
                        '23': 'Hàng tháng',
                        '24': 'Cao',
                        '25': 'Đã xác nhận',
                        '26': 'Đây là nơi ghi chú',
                        '27': '2025-07-09',
                        '28': '14:30',
                        '29': 'Nam',
                        '30': '1990-01-01',
                        '31': 'Kỹ sư phần mềm',
                        '32': 'Đại học Bách Khoa',
                        '33': 'Cử nhân',
                        '34': 'Độc thân',
                        '35': 'Không',
                        '36': 'A+',
                        '37': '175cm',
                        '38': '70kg',
                        '39': 'Tốt',
                        '40': 'Không có',
                        '41': 'Tiếng Anh',
                        '42': 'Trung cấp',
                        '43': '5def47c5f47614018c000092',
                        '44': 'JavaScript, Python',
                        '45': '5 năm',
                        '46': 'Senior Developer',
                        '47': 'Remote',
                        '48': 'Full-time',
                        '49': 'Có thể',
                        '50': 'Linh hoạt',
                        '51': 'Laptop Dell',
                        '52': 'Windows 11',
                        '53': 'Visual Studio Code',
                        '54': 'Git, Docker',
                        '55': 'React, Node.js',
                        '56': 'MySQL, MongoDB',
                        '57': 'AWS, Azure',
                        '58': 'Agile, Scrum',
                        '59': 'Jira, Trello',
                        '60': 'Slack, Teams',
                        '61': 'Photoshop',
                        '62': 'Figma',
                        '63': 'Adobe XD',
                        '64': 'Sketch',
                        '65': 'InVision',
                        '66': 'Zeplin',
                        '67': 'Principle',
                        '68': 'Framer',
                        '69': 'After Effects',
                        '70': 'Premiere Pro',
                        '71': 'Illustrator',
                        '72': 'InDesign',
                        '73': 'Lightroom',
                        '74': 'Cinema 4D',
                        '75': 'Blender',
                        '76': 'Unity',
                        '77': 'Unreal Engine',
                        '78': 'Maya',
                        '79': '3ds Max',
                        '80': 'ZBrush',
                        '81': 'Substance Painter',
                        '82': 'Houdini',
                        '83': 'Nuke',
                        '84': 'DaVinci Resolve',
                        '85': 'Pro Tools',
                        '86': 'Logic Pro',
                        '87': 'Ableton Live',
                        '88': 'FL Studio',
                        '89': 'Cubase',
                        '90': 'Reaper',
                        '91': 'Audacity',
                        '92': 'GarageBand',
                        '93': 'Reason',
                        '94': 'Studio One',
                        '95': 'Bitwig',
                        '96': 'Maschine',
                        '97': 'Kontakt',
                        '98': 'Omnisphere',
                        '99': 'Serum',
                        '100': 'Massive X'
                    }
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

    function showClickableElementsList() {
        // Use the new clickable elements function
        const clickableElements = getClickableElements({
            includeTableRows: true,
            includeListItems: true,
            includeGridItems: true,
            includeCustomSelectors: ['.vue-grid-item', '.data-row', '.list-row', '.editor-click']
        });

        // Create a detailed list
        let elementsList = `🖱️ DANH SÁCH CLICKABLE ELEMENTS (${clickableElements.length} elements):\n\n`;

        clickableElements.forEach(({ index, info, xpath, cssSelector }) => {
            elementsList += `[${index}] ${info}\n`;
            elementsList += `    XPath: ${xpath}\n`;
            elementsList += `    CSS: ${cssSelector}\n\n`;
        });

        // Show in console
        console.log(elementsList);

        // Show notification
        showNotification(
            `Đã tìm thấy ${clickableElements.length} clickable elements. Xem console để biết chi tiết.`,
            'success'
        );

        // Also create a modal to show the list
        showClickableElementsModal(clickableElements);
    }

    function showClickableElementsModal(
        clickableElements: ReturnType<typeof getClickableElements>
    ) {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.id = 'clickable-elements-modal';
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
                <h2 style="margin: 0; font-size: 18px; font-weight: 600;">🖱️ Danh sách Clickable Elements (${clickableElements.length})</h2>
                <button id="close-clickable-modal" style="background: none; border: none; font-size: 20px; cursor: pointer; padding: 4px;">×</button>
            </div>
            <div style="font-size: 12px; font-family: monospace; line-height: 1.4;">
        `;

        clickableElements.forEach(({ element, index, info, xpath, cssSelector }) => {
            const tagName = element.tagName.toLowerCase();
            const textContent = element.textContent?.trim().substring(0, 100) || 'empty';

            content += `
                <div style="border: 1px solid #eee; border-radius: 4px; padding: 8px; margin-bottom: 8px; background: #f9f9f9;">
                    <strong style="color: #ff5722;">[${index}] ${tagName}</strong><br>
                    <span style="color: #666;">Info:</span> ${info}<br>
                    <span style="color: #666;">Text:</span> ${textContent}<br>
                    <span style="color: #666;">XPath:</span> ${xpath}<br>
                    <span style="color: #666;">CSS:</span> ${cssSelector}
                </div>
            `;
        });

        content += `</div>`;
        modalContent.innerHTML = content;
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Close modal event
        document.getElementById('close-clickable-modal')?.addEventListener('click', () => {
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

    function toggleClickMode() {
        const button = document.getElementById('enable-click-mode-btn') as HTMLButtonElement;

        if (!clickModeEnabled) {
            // Enable click mode
            clickModeCleanup = enableRowClickHandler({
                highlightOnHover: true,
                highlightColor: '#e3f2fd',
                includeTableRows: true,
                includeListItems: true,
                includeGridItems: true,
                includeCustomSelectors: [
                    '.vue-grid-item',
                    '.data-row',
                    '.list-row',
                    '.editor-click'
                ],
                clickCallback: (element, index) => {
                    // Custom click behavior
                    const elementInfo = `${element.tagName.toLowerCase()}[${index}]`;
                    const textContent = element.textContent?.trim().substring(0, 50) || '';

                    console.log(`🖱️ Clicked on element [${index}]:`, element);
                    showNotification(
                        `Clicked: [${index}] ${elementInfo} - "${textContent}"`,
                        'info',
                        { duration: 2000 }
                    );

                    // You can add more custom logic here
                    // For example: extract data, fill forms, etc.
                }
            });

            clickModeEnabled = true;
            button.textContent = '🛑 Tắt chế độ Click';
            button.style.background = '#f44336';

            showNotification(
                'Đã bật chế độ Click! Hover và click vào các elements để tương tác.',
                'success'
            );
        } else {
            // Disable click mode
            if (clickModeCleanup) {
                clickModeCleanup();
                clickModeCleanup = null;
            }

            clickModeEnabled = false;
            button.textContent = '⚡ Bật chế độ Click';
            button.style.background = '#4caf50';

            showNotification('Đã tắt chế độ Click.', 'info');
        }
    }

    function enableClassClick() {
        const input = document.getElementById('target-class-input') as HTMLInputElement;
        const button = document.getElementById('enable-class-click-btn') as HTMLButtonElement;

        if (!input || !button) return;

        const className = input.value.trim();
        if (!className) {
            showNotification('Vui lòng nhập class name!', 'warning');
            return;
        }

        // Add dot prefix if not present
        const selector = className.startsWith('.') ? className : `.${className}`;

        // Check if elements with this class exist
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0) {
            showNotification(`Không tìm thấy elements với class "${className}"`, 'warning');
            return;
        }

        // Disable current click mode if active
        if (clickModeEnabled && clickModeCleanup) {
            clickModeCleanup();
            clickModeCleanup = null;
            clickModeEnabled = false;

            // Reset general click mode button
            const generalButton = document.getElementById(
                'enable-click-mode-btn'
            ) as HTMLButtonElement;
            if (generalButton) {
                generalButton.textContent = '⚡ Bật chế độ Click tổng quát';
                generalButton.style.background = '#4caf50';
            }
        }

        // Enable click mode for specific class
        clickModeCleanup = enableRowClickHandler({
            highlightOnHover: true,
            highlightColor: '#ffeb3b',
            includeTableRows: false,
            includeListItems: false,
            includeGridItems: false,
            includeCustomSelectors: [selector],
            clickCallback: (element, index) => {
                const elementInfo = `${element.tagName.toLowerCase()}[${index}]`;
                const textContent = element.textContent?.trim().substring(0, 50) || '';

                console.log(`🎯 Clicked on ${className} element [${index}]:`, element);
                showNotification(
                    `Clicked ${className}: [${index}] ${elementInfo} - "${textContent}"`,
                    'success',
                    { duration: 3000 }
                );

                // You can add custom logic here for specific class
                // For example: extract data, trigger actions, etc.
            }
        });

        clickModeEnabled = true;
        button.textContent = `🛑 Tắt click ${className}`;
        button.style.background = '#f44336';

        showNotification(
            `Đã bật click mode cho class "${className}" (${elements.length} elements)`,
            'success'
        );

        // Update button click handler to toggle
        button.onclick = () => {
            if (clickModeCleanup) {
                clickModeCleanup();
                clickModeCleanup = null;
            }

            clickModeEnabled = false;
            button.textContent = 'Bật Click';
            button.style.background = '#ff5722';
            button.onclick = enableClassClick;

            showNotification(`Đã tắt click mode cho class "${className}"`, 'info');
        };
    }

    function startSequentialClick() {
        const input = document.getElementById('target-class-input') as HTMLInputElement;
        const delayInput = document.getElementById('sequence-delay-input') as HTMLInputElement;
        const interactiveCheckbox = document.getElementById(
            'interactive-mode-checkbox'
        ) as HTMLInputElement;
        const dataInput = document.getElementById('sequence-data-input') as HTMLTextAreaElement;

        if (!input || !delayInput) return;

        const className = input.value.trim();
        if (!className) {
            showNotification('Vui lòng nhập class name trước!', 'warning');
            return;
        }

        const delay = parseInt(delayInput.value) || 1000;
        const selector = className.startsWith('.') ? className : `.${className}`;

        // Get elements to click
        sequenceElements = Array.from(document.querySelectorAll(selector));
        if (sequenceElements.length === 0) {
            showNotification(`Không tìm thấy elements với class "${className}"`, 'warning');
            return;
        }

        // Check interactive mode
        interactiveMode = interactiveCheckbox?.checked || false;

        // Parse sequence data if provided
        sequenceData = [];
        if (dataInput?.value.trim()) {
            try {
                const parsedData = JSON.parse(dataInput.value);
                if (parsedData.data && Array.isArray(parsedData.data)) {
                    sequenceData = parsedData.data;
                }
            } catch (error) {
                showNotification('Dữ liệu JSON không hợp lệ!', 'warning');
                return;
            }
        }

        // Reset state
        sequenceRunning = true;
        sequencePaused = false;
        currentSequenceIndex = 0;
        sequenceTimeouts = [];
        currentElement = null;

        // Update UI
        updateSequenceButtons();

        const modeText = interactiveMode ? 'Interactive Mode' : 'Auto Mode';
        showNotification(
            `Bắt đầu ${modeText} cho ${sequenceElements.length} elements với delay ${delay}ms`,
            'info'
        );

        // Start the sequence
        if (interactiveMode) {
            executeInteractiveSequence();
        } else {
            executeSequence(delay);
        }
    }

    function executeSequence(delay: number) {
        if (!sequenceRunning || sequencePaused) return;

        if (currentSequenceIndex >= sequenceElements.length) {
            // Sequence completed
            stopSequentialClick();
            showNotification('Hoàn thành click sequence!', 'success');
            return;
        }

        const element = sequenceElements[currentSequenceIndex];

        // Highlight current element
        const originalStyle = element.getAttribute('style') || '';
        (element as HTMLElement).style.cssText =
            originalStyle +
            '; background-color: #ff5722 !important; transition: background-color 0.3s ease;';

        // Click the element
        setTimeout(() => {
            if (!sequenceRunning || sequencePaused) return;

            // Trigger click event
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            element.dispatchEvent(clickEvent);

            console.log(
                `🔄 Sequential click [${currentSequenceIndex + 1}/${sequenceElements.length}]:`,
                element
            );
            showNotification(
                `Click [${currentSequenceIndex + 1}/${sequenceElements.length}]: ${element.tagName.toLowerCase()}`,
                'info',
                { duration: 1000 }
            );

            // Restore original style
            setTimeout(() => {
                (element as HTMLElement).style.cssText = originalStyle;
            }, 300);

            currentSequenceIndex++;

            // Schedule next click
            if (currentSequenceIndex < sequenceElements.length) {
                const timeoutId = window.setTimeout(() => executeSequence(delay), delay);
                sequenceTimeouts.push(timeoutId);
            } else {
                // Sequence completed
                stopSequentialClick();
                showNotification('Hoàn thành click sequence!', 'success');
            }
        }, 100);
    }

    function stopSequentialClick() {
        sequenceRunning = false;
        sequencePaused = false;

        // Clear all timeouts
        sequenceTimeouts.forEach(id => clearTimeout(id));
        sequenceTimeouts = [];

        // Reset interactive mode state
        if (currentElement) {
            // Restore original style
            const originalStyle =
                currentElement
                    .getAttribute('style')
                    ?.replace(
                        /background-color: #ff5722 !important; border: 3px solid #f44336 !important; transition: all 0.3s ease;/g,
                        ''
                    ) || '';
            (currentElement as HTMLElement).style.cssText = originalStyle;
        }

        // Reset state
        currentSequenceIndex = 0;
        currentElement = null;
        interactiveMode = false;
        sequenceData = [];

        // Update UI
        updateSequenceButtons();

        showNotification('Đã dừng click sequence', 'info');
    }

    function pauseSequentialClick() {
        if (!sequenceRunning) return;

        sequencePaused = true;

        // Clear pending timeouts
        sequenceTimeouts.forEach(id => clearTimeout(id));
        sequenceTimeouts = [];

        // Update UI
        updateSequenceButtons();

        showNotification('Đã tạm dừng click sequence', 'warning');
    }

    function resumeSequentialClick() {
        if (!sequenceRunning || !sequencePaused) return;

        sequencePaused = false;

        // Update UI
        updateSequenceButtons();

        // Get delay and continue
        const delayInput = document.getElementById('sequence-delay-input') as HTMLInputElement;
        const delay = parseInt(delayInput.value) || 1000;

        showNotification('Tiếp tục click sequence', 'info');

        // Continue sequence
        executeSequence(delay);
    }

    function updateSequenceButtons() {
        const startBtn = document.getElementById('start-sequence-btn') as HTMLButtonElement;
        const stopBtn = document.getElementById('stop-sequence-btn') as HTMLButtonElement;
        const pauseBtn = document.getElementById('pause-sequence-btn') as HTMLButtonElement;
        const resumeBtn = document.getElementById('resume-sequence-btn') as HTMLButtonElement;
        const nextBtn = document.getElementById('next-step-btn') as HTMLButtonElement;
        const fillBtn = document.getElementById('fill-current-btn') as HTMLButtonElement;

        if (startBtn) startBtn.disabled = sequenceRunning;
        if (stopBtn) stopBtn.disabled = !sequenceRunning;
        if (pauseBtn) pauseBtn.disabled = !sequenceRunning || sequencePaused || interactiveMode;
        if (resumeBtn) resumeBtn.disabled = !sequenceRunning || !sequencePaused || interactiveMode;
        if (nextBtn) nextBtn.disabled = !sequenceRunning || !interactiveMode || !currentElement;
        if (fillBtn) fillBtn.disabled = !sequenceRunning || !interactiveMode || !currentElement;
    }

    function executeInteractiveSequence() {
        if (!sequenceRunning || currentSequenceIndex >= sequenceElements.length) {
            stopSequentialClick();
            showNotification('Hoàn thành interactive sequence!', 'success');
            return;
        }

        // Get current element
        currentElement = sequenceElements[currentSequenceIndex];

        // Highlight current element
        const originalStyle = currentElement.getAttribute('style') || '';
        (currentElement as HTMLElement).style.cssText =
            originalStyle +
            '; background-color: #ff5722 !important; border: 3px solid #f44336 !important; transition: all 0.3s ease;';

        // Update UI
        updateSequenceButtons();

        // Show notification
        showNotification(
            `Dừng tại element [${currentSequenceIndex + 1}/${sequenceElements.length}]. Điền dữ liệu và click "Tiếp tục"`,
            'info',
            { duration: 5000 }
        );

        console.log(
            `🛑 Interactive stop at element [${currentSequenceIndex + 1}/${sequenceElements.length}]:`,
            currentElement
        );

        // Scroll to element
        currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function nextSequenceStep() {
        if (!sequenceRunning || !interactiveMode || !currentElement) return;

        // Restore original style
        const originalStyle =
            currentElement
                .getAttribute('style')
                ?.replace(
                    /background-color: #ff5722 !important; border: 3px solid #f44336 !important; transition: all 0.3s ease;/g,
                    ''
                ) || '';
        (currentElement as HTMLElement).style.cssText = originalStyle;

        // Move to next element
        currentSequenceIndex++;
        currentElement = null;

        // Continue sequence
        executeInteractiveSequence();
    }

    function fillCurrentElement() {
        if (!sequenceRunning || !interactiveMode || !currentElement) return;

        // Get data for current index
        const dataValue =
            sequenceData[currentSequenceIndex] || `Dữ liệu ${currentSequenceIndex + 1}`;

        // Try to fill the element
        const element = currentElement;

        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            // Direct input element
            element.focus();
            element.value = dataValue;

            // Trigger events for Vue.js compatibility
            const events = ['focus', 'input', 'change', 'blur'];
            events.forEach(eventType => {
                const event = new Event(eventType, { bubbles: true, cancelable: true });
                element.dispatchEvent(event);
            });

            showNotification(`Đã điền: "${dataValue}"`, 'success');
        } else {
            // Try to find input inside the element
            const input = element.querySelector('input, textarea, select') as
                | HTMLInputElement
                | HTMLTextAreaElement
                | HTMLSelectElement;

            if (input) {
                input.focus();
                input.value = dataValue;

                // Trigger events
                const events = ['focus', 'input', 'change', 'blur'];
                events.forEach(eventType => {
                    const event = new Event(eventType, { bubbles: true, cancelable: true });
                    input.dispatchEvent(event);
                });

                showNotification(`Đã điền vào input con: "${dataValue}"`, 'success');
            } else {
                // Set text content as fallback
                if (element.textContent !== null) {
                    element.textContent = dataValue;
                    showNotification(`Đã set text content: "${dataValue}"`, 'info');
                } else {
                    showNotification('Không thể điền dữ liệu vào element này', 'warning');
                }
            }
        }

        console.log(
            `📝 Filled element [${currentSequenceIndex + 1}] with data:`,
            dataValue,
            element
        );
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
    floatingCard.addEventListener('mouseenter', () => {
        floatingCard.style.transform = 'scale(1.02)';
        floatingButton.style.background = '#1976d2';
    });

    floatingCard.addEventListener('mouseleave', () => {
        floatingCard.style.transform = 'scale(1)';
        floatingButton.style.background = isOverlayOpen ? '#f44336' : '#2196f3';
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
