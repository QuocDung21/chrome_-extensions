import { createFloatingMenu } from './FloatingMenu';

// Inject CSS styles
function injectStyles(): void {
    if (document.getElementById('chrome-extension-floating-styles')) {
        return;
    }
    const link = document.createElement('link');
    link.id = 'chrome-extension-floating-styles';
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('src/content/styles/floating-ui.css');
    document.head.appendChild(link);
}

export function createFloatingIcon(): void {
    // Inject styles first
    injectStyles();
    // Check if floating icon already exists
    if (document.getElementById('chrome-extension-floating-icon')) {
        return;
    }
    // Create floating icon container
    const iconContainer = document.createElement('div');
    iconContainer.id = 'chrome-extension-floating-icon';
    iconContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        cursor: pointer;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        user-select: none;
        border: 3px solid rgba(255, 255, 255, 0.2);
    `;
    // Create icon element
    const icon = document.createElement('div');
    icon.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" stroke-width="2" stroke-linejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="white" stroke-width="2" stroke-linejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="white" stroke-width="2" stroke-linejoin="round"/>
        </svg>
    `;
    icon.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    iconContainer.appendChild(icon);
    // Add hover effects
    iconContainer.addEventListener('mouseenter', () => {
        iconContainer.style.transform = 'scale(1.1)';
        iconContainer.style.boxShadow = '0 6px 25px rgba(0, 0, 0, 0.4)';
    });

    iconContainer.addEventListener('mouseleave', () => {
        iconContainer.style.transform = 'scale(1)';
        iconContainer.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    });

    // Add click handler to show floating menu
    let isMenuOpen = false;
    iconContainer.addEventListener('click', e => {
        e.stopPropagation();
        if (!isMenuOpen) {
            createFloatingMenu();
            isMenuOpen = true;

            // Add pulse animation when menu is open
            iconContainer.style.animation = 'pulse 2s infinite';

            // Listen for menu close
            const checkMenuClosed = () => {
                const menu = document.getElementById('chrome-extension-floating-menu');
                if (!menu) {
                    isMenuOpen = false;
                    iconContainer.style.animation = '';
                    return;
                }
                setTimeout(checkMenuClosed, 100);
            };
            setTimeout(checkMenuClosed, 100);
        }
    });

    // Add pulse animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% {
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(102, 126, 234, 0.7);
            }
            70% {
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 10px rgba(102, 126, 234, 0);
            }
            100% {
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(102, 126, 234, 0);
            }
        }
    `;
    document.head.appendChild(style);

    // Make icon draggable
    let isDragging = false;
    const dragOffset = { x: 0, y: 0 };

    iconContainer.addEventListener('mousedown', e => {
        isDragging = true;
        dragOffset.x = e.clientX - iconContainer.offsetLeft;
        dragOffset.y = e.clientY - iconContainer.offsetTop;
        iconContainer.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', e => {
        if (isDragging) {
            e.preventDefault();
            const x = e.clientX - dragOffset.x;
            const y = e.clientY - dragOffset.y;

            // Keep icon within viewport bounds
            const maxX = window.innerWidth - iconContainer.offsetWidth;
            const maxY = window.innerHeight - iconContainer.offsetHeight;

            iconContainer.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
            iconContainer.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
            iconContainer.style.right = 'auto';
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            iconContainer.style.cursor = 'pointer';
        }
    });

    // Add to page
    document.body.appendChild(iconContainer);

    // Add entrance animation
    setTimeout(() => {
        iconContainer.style.transform = 'scale(1)';
        iconContainer.style.opacity = '1';
    }, 100);

    // Initial state for animation
    iconContainer.style.transform = 'scale(0)';
    iconContainer.style.opacity = '0';
}
