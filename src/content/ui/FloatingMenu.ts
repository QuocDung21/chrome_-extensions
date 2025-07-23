import { fillSampleData, getFormData } from '../utils/formFiller';
import { analyzePage as analyzePageElements, showAnalysisResults } from '../utils/pageAnalyzer';

export function createFloatingMenu(): void {
    // Check if menu already exists
    if (document.getElementById('chrome-extension-floating-menu')) {
        return;
    }

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'chrome-extension-floating-menu';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(5px);
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

    // Create menu container
    const menuContainer = document.createElement('div');
    menuContainer.style.cssText = `
        background: white;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        min-width: 320px;
        max-width: 400px;
        transform: scale(0.8);
        transition: transform 0.3s ease;
        position: relative;
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid #e0e0e0;
    `;

    const title = document.createElement('h2');
    title.textContent = 'Chrome Extension Tools';
    title.style.cssText = `
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #333;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.2s ease;
    `;

    closeButton.addEventListener('mouseenter', () => {
        closeButton.style.backgroundColor = '#f0f0f0';
    });

    closeButton.addEventListener('mouseleave', () => {
        closeButton.style.backgroundColor = 'transparent';
    });

    header.appendChild(title);
    header.appendChild(closeButton);

    // Create menu items
    const menuItems = document.createElement('div');
    menuItems.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 12px;
    `;

    // URL Input section
    const urlSection = document.createElement('div');
    urlSection.style.cssText = `
        margin-bottom: 16px;
    `;

    const urlLabel = document.createElement('label');
    urlLabel.textContent = 'Current Page URL:';
    urlLabel.style.cssText = `
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: #555;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
    `;

    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.value = window.location.href;
    urlInput.style.cssText = `
        width: 100%;
        padding: 12px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transition: border-color 0.2s ease;
        box-sizing: border-box;
    `;

    urlInput.addEventListener('focus', () => {
        urlInput.style.borderColor = '#667eea';
        urlInput.style.outline = 'none';
    });

    urlInput.addEventListener('blur', () => {
        urlInput.style.borderColor = '#e0e0e0';
    });

    urlSection.appendChild(urlLabel);
    urlSection.appendChild(urlInput);

    // Action buttons
    const buttons = [
        { text: 'Analyze Page', color: '#4CAF50', action: () => analyzePage() },
        { text: 'Fill Form', color: '#2196F3', action: () => fillForm() },
        { text: 'Extract Data', color: '#FF9800', action: () => extractData() },
        { text: 'Open Admin', color: '#9C27B0', action: () => openAdmin() }
    ];

    buttons.forEach(button => {
        const btn = document.createElement('button');
        btn.textContent = button.text;
        btn.style.cssText = `
            background: ${button.color};
            color: white;
            border: none;
            padding: 12px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        `;

        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateY(-2px)';
            btn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
        });

        btn.addEventListener('click', () => {
            button.action();
            closeMenu();
        });

        menuItems.appendChild(btn);
    });

    // Assemble menu
    menuContainer.appendChild(header);
    menuContainer.appendChild(urlSection);
    menuContainer.appendChild(menuItems);
    overlay.appendChild(menuContainer);

    // Close handlers
    const closeMenu = () => {
        overlay.style.opacity = '0';
        menuContainer.style.transform = 'scale(0.8)';
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);
    };

    closeButton.addEventListener('click', closeMenu);

    overlay.addEventListener('click', e => {
        if (e.target === overlay) {
            closeMenu();
        }
    });

    // ESC key handler
    const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            closeMenu();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);

    // Add to page
    document.body.appendChild(overlay);

    // Animate in
    setTimeout(() => {
        overlay.style.opacity = '1';
        menuContainer.style.transform = 'scale(1)';
    }, 10);
}

// Action functions
function analyzePage() {
    console.log('Analyzing page...');
    const elements = analyzePageElements();
    showAnalysisResults(elements);
}

function fillForm() {
    console.log('Filling form...');
    fillSampleData();
}

function extractData() {
    console.log('Extracting data...');
    const formData = getFormData();
    console.log('Extracted form data:', formData);

    // Show notification with extracted data count
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #FF9800;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10002;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    `;
    notification.textContent = `Extracted data from ${formData.length} fields. Check console for details.`;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

function openAdmin() {
    chrome.runtime.sendMessage({ action: 'openAdmin' });
}
