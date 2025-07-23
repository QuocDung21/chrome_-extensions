export interface ElementInfo {
    tagName: string;
    id?: string;
    className?: string;
    name?: string;
    type?: string;
    placeholder?: string;
    value?: string;
    xpath: string;
    cssSelector: string;
    isVisible: boolean;
    isEnabled: boolean;
    hasLabel: boolean;
    labelText?: string;
}

export function analyzePage(): ElementInfo[] {
    const elements: ElementInfo[] = [];
    
    // Get all input elements
    const inputs = document.querySelectorAll('input, textarea, select');
    
    inputs.forEach((element, index) => {
        const htmlElement = element as HTMLElement;
        const inputElement = element as HTMLInputElement;
        
        // Generate XPath
        const xpath = getXPath(htmlElement);
        
        // Generate CSS selector
        const cssSelector = getCSSSelector(htmlElement);
        
        // Check visibility
        const isVisible = isElementVisible(htmlElement);
        
        // Check if enabled
        const isEnabled = !inputElement.disabled;
        
        // Find associated label
        const labelInfo = findLabel(inputElement);
        
        const elementInfo: ElementInfo = {
            tagName: htmlElement.tagName.toLowerCase(),
            id: htmlElement.id || undefined,
            className: htmlElement.className || undefined,
            name: inputElement.name || undefined,
            type: inputElement.type || undefined,
            placeholder: inputElement.placeholder || undefined,
            value: inputElement.value || undefined,
            xpath,
            cssSelector,
            isVisible,
            isEnabled,
            hasLabel: labelInfo.hasLabel,
            labelText: labelInfo.labelText
        };
        
        elements.push(elementInfo);
    });
    
    return elements;
}

function getXPath(element: HTMLElement): string {
    if (element.id) {
        return `//*[@id="${element.id}"]`;
    }
    
    const parts: string[] = [];
    let current: HTMLElement | null = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
        let index = 1;
        let sibling = current.previousElementSibling;
        
        while (sibling) {
            if (sibling.tagName === current.tagName) {
                index++;
            }
            sibling = sibling.previousElementSibling;
        }
        
        const tagName = current.tagName.toLowerCase();
        const part = index > 1 ? `${tagName}[${index}]` : tagName;
        parts.unshift(part);
        
        current = current.parentElement;
    }
    
    return '/' + parts.join('/');
}

function getCSSSelector(element: HTMLElement): string {
    if (element.id) {
        return `#${element.id}`;
    }
    
    const parts: string[] = [];
    let current: HTMLElement | null = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
        let selector = current.tagName.toLowerCase();
        
        if (current.className) {
            const classes = current.className.trim().split(/\s+/);
            selector += '.' + classes.join('.');
        }
        
        // Add nth-child if needed for uniqueness
        const siblings = Array.from(current.parentElement?.children || []);
        const sameTagSiblings = siblings.filter(sibling => 
            sibling.tagName === current!.tagName
        );
        
        if (sameTagSiblings.length > 1) {
            const index = sameTagSiblings.indexOf(current) + 1;
            selector += `:nth-child(${index})`;
        }
        
        parts.unshift(selector);
        
        // Stop if we have a unique selector
        if (current.id || (current.className && 
            document.querySelectorAll(parts.join(' > ')).length === 1)) {
            break;
        }
        
        current = current.parentElement;
    }
    
    return parts.join(' > ');
}

function isElementVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    
    return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        element.offsetWidth > 0 &&
        element.offsetHeight > 0
    );
}

function findLabel(element: HTMLInputElement): { hasLabel: boolean; labelText?: string } {
    // Check for label with for attribute
    if (element.id) {
        const label = document.querySelector(`label[for="${element.id}"]`);
        if (label) {
            return {
                hasLabel: true,
                labelText: label.textContent?.trim()
            };
        }
    }
    
    // Check for parent label
    const parentLabel = element.closest('label');
    if (parentLabel) {
        return {
            hasLabel: true,
            labelText: parentLabel.textContent?.trim()
        };
    }
    
    // Check for aria-label
    if (element.getAttribute('aria-label')) {
        return {
            hasLabel: true,
            labelText: element.getAttribute('aria-label')!
        };
    }
    
    // Check for aria-labelledby
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
        const labelElement = document.getElementById(labelledBy);
        if (labelElement) {
            return {
                hasLabel: true,
                labelText: labelElement.textContent?.trim()
            };
        }
    }
    
    // Check for placeholder as fallback
    if (element.placeholder) {
        return {
            hasLabel: true,
            labelText: element.placeholder
        };
    }
    
    return { hasLabel: false };
}

export function showAnalysisResults(elements: ElementInfo[]): void {
    console.log('Page Analysis Results:', elements);
    
    // Create a simple notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #4CAF50;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10002;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    `;
    notification.textContent = `Found ${elements.length} form elements. Check console for details.`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}
