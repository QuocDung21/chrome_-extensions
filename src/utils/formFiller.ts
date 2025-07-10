import { FormFillData } from '@/common/types/scraper';

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface NotificationOptions {
    duration?: number;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    zIndex?: number;
}

export interface FormFillerOptions {
    includeHidden?: boolean;
    includeReadonly?: boolean;
    triggerEvents?: boolean;
    onProgress?: (filled: number, total: number) => void;
    onElementFilled?: (element: HTMLElement, value: string, identifier: string) => void;
    onElementNotFound?: (identifier: string) => void;
}

export interface FormFillerResult {
    filledCount: number;
    notFoundCount: number;
    totalElements: number;
    errors: string[];
}

export class FormFiller {
    private options: FormFillerOptions;

    constructor(options: FormFillerOptions = {}) {
        this.options = {
            includeHidden: false,
            includeReadonly: false,
            triggerEvents: true,
            ...options
        };
    }

    /**
     * Get all fillable input elements on the page (including Vue.js elements)
     */
    public getFormElements(): (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[] {
        // Enhanced selectors to include Vue.js patterns
        const selectors = [
            'input',
            'textarea',
            'select',
            // Vue.js component selectors
            '.v-input input',
            '.v-text-field input',
            '.v-textarea textarea',
            '.v-select input',
            '.el-input input',
            '.el-textarea textarea',
            '.ant-input',
            '.ant-select',
            // Vue.js directive patterns
            '[v-model]',
            '[data-v-model]'
        ];

        const allInputs: (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[] = [];
        const foundElements = new Set<Element>();

        selectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (
                        !foundElements.has(el) &&
                        (el instanceof HTMLInputElement ||
                            el instanceof HTMLTextAreaElement ||
                            el instanceof HTMLSelectElement)
                    ) {
                        foundElements.add(el);
                        allInputs.push(el);
                    }
                });
            } catch (e) {
                console.warn(`Error with selector ${selector}:`, e);
            }
        });

        return allInputs.filter(input => this.isElementFillable(input));
    }

    /**
     * Check if an element is fillable based on options
     */
    private isElementFillable(
        input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    ): boolean {
        const isVisible = input.offsetParent !== null || input.type === 'hidden';
        const isEnabled = !input.disabled;

        // Check readonly only for input and textarea elements
        const isNotReadonly =
            this.options.includeReadonly ||
            !(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) ||
            !input.readOnly;

        // Include hidden elements if option is set
        const shouldInclude = this.options.includeHidden || input.type !== 'hidden' || isVisible;

        return isVisible && isEnabled && isNotReadonly && shouldInclude;
    }

    /**
     * Find element by identifier (index or ID/name)
     */
    public findElement(
        identifier: string,
        visibleInputs: (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[]
    ): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
        // Check if identifier is a number (index-based)
        const fieldIndex = parseInt(identifier);
        if (!isNaN(fieldIndex)) {
            if (fieldIndex >= 0 && fieldIndex < visibleInputs.length) {
                return visibleInputs[fieldIndex];
            }
            return null;
        }

        // Use ID/name-based approach (fallback)
        const strategies = [
            () => document.getElementById(identifier),
            () => document.querySelector(`[name="${identifier}"]`),
            () => document.querySelector(`[data-id="${identifier}"]`),
            () => document.querySelector(`input[id*="${identifier}"]`),
            () => document.querySelector(`input[name*="${identifier}"]`),
            () => document.querySelector(`textarea[id*="${identifier}"]`),
            () => document.querySelector(`select[id*="${identifier}"]`),
            () => document.querySelector(`[id$="_${identifier}"]`),
            () => document.querySelector(`[id^="${identifier}_"]`)
        ];

        for (const strategy of strategies) {
            const element = strategy() as
                | HTMLInputElement
                | HTMLTextAreaElement
                | HTMLSelectElement
                | null;
            if (element && this.isElementFillable(element)) {
                return element;
            }
        }

        return null;
    }

    /**
     * Fill a single element with value (enhanced for Vue.js)
     */
    public fillElement(
        element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
        value: string
    ): boolean {
        try {
            // Focus the element first (important for Vue.js)
            element.focus();

            // Set the value
            element.value = value;

            if (this.options.triggerEvents) {
                // Enhanced event triggering for Vue.js compatibility
                const events = ['focus', 'input', 'change', 'keydown', 'keyup', 'blur'];

                events.forEach(eventType => {
                    let event;
                    if (eventType === 'keydown' || eventType === 'keyup') {
                        event = new KeyboardEvent(eventType, {
                            bubbles: true,
                            cancelable: true,
                            key: 'Unidentified'
                        });
                    } else {
                        event = new Event(eventType, {
                            bubbles: true,
                            cancelable: true
                        });
                    }
                    element.dispatchEvent(event);
                });

                // Additional Vue.js specific events
                try {
                    // Trigger Vue.js v-model update
                    element.dispatchEvent(
                        new CustomEvent('vue:update', {
                            bubbles: true,
                            detail: { value }
                        })
                    );
                } catch (e) {
                    // Ignore if custom events are not supported
                }
            }

            return true;
        } catch (error) {
            console.error('Error filling element:', error);
            return false;
        }
    }

    /**
     * Fill form with data
     */
    public async fillForm(data: FormFillData): Promise<FormFillerResult> {
        const result: FormFillerResult = {
            filledCount: 0,
            notFoundCount: 0,
            totalElements: 0,
            errors: []
        };

        try {
            const visibleInputs = this.getFormElements();
            result.totalElements = visibleInputs.length;

            console.log(`Found ${visibleInputs.length} fillable input elements on the page`);

            for (const fieldData of data.data) {
                for (const [fieldIdentifier, value] of Object.entries(fieldData)) {
                    const element = this.findElement(fieldIdentifier, visibleInputs);

                    if (element) {
                        const success = this.fillElement(element, value);

                        if (success) {
                            result.filledCount++;

                            const elementInfo =
                                element.id || element.name || `${element.tagName}[${element.type}]`;
                            console.log(
                                `✅ Filled field ${fieldIdentifier} (${elementInfo}) with value: ${value}`
                            );

                            this.options.onElementFilled?.(element, value, fieldIdentifier);
                        } else {
                            result.notFoundCount++;
                            result.errors.push(`Failed to fill element ${fieldIdentifier}`);
                        }
                    } else {
                        result.notFoundCount++;
                        console.warn(
                            `❌ Could not find element with identifier: ${fieldIdentifier}`
                        );
                        this.options.onElementNotFound?.(fieldIdentifier);
                    }

                    // Report progress
                    this.options.onProgress?.(
                        result.filledCount,
                        result.filledCount + result.notFoundCount
                    );
                }
            }

            console.log(
                `Form filling completed! ✅ Filled: ${result.filledCount}, ❌ Not found: ${result.notFoundCount}`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            result.errors.push(errorMessage);
            console.error('Error filling form:', error);
        }

        return result;
    }

    /**
     * Get element info for debugging
     */
    public getElementInfo(
        element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    ): string {
        const tagName = element.tagName.toLowerCase();
        const type = element.type || 'text';
        const id = element.id || 'no-id';
        const name = element.name || 'no-name';
        const placeholder = (element as HTMLInputElement).placeholder || 'no-placeholder';
        const value = element.value || 'empty';

        return `${tagName}[${type}] - ID: ${id}, Name: ${name}, Placeholder: ${placeholder}, Value: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`;
    }

    /**
     * Get all elements with their indices for debugging
     */
    public getElementsWithIndices(): Array<{
        index: number;
        element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        info: string;
    }> {
        const elements = this.getFormElements();
        return elements.map((element, index) => ({
            index,
            element,
            info: this.getElementInfo(element)
        }));
    }
}

// Utility functions for backward compatibility
export async function fillFormData(
    data: FormFillData,
    options?: FormFillerOptions
): Promise<FormFillerResult> {
    const filler = new FormFiller(options);
    return await filler.fillForm(data);
}

export function getFormElements(
    options?: FormFillerOptions
): (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[] {
    const filler = new FormFiller(options);
    return filler.getFormElements();
}

export function getElementsWithIndices(options?: FormFillerOptions): Array<{
    index: number;
    element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    info: string;
}> {
    const filler = new FormFiller(options);
    return filler.getElementsWithIndices();
}

/**
 * Show notification to user
 */
export function showNotification(
    message: string,
    type: NotificationType = 'success',
    options: NotificationOptions = {}
): void {
    const { duration = 3000, position = 'top-right', zIndex = 2147483647 } = options;

    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        font-size: 14px;
        font-weight: 500;
        z-index: ${zIndex};
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-width: 300px;
        word-wrap: break-word;
        transition: all 0.3s ease-in-out;
        opacity: 0;
        pointer-events: auto;
        cursor: pointer;
    `;

    // Set position
    const [vPos, hPos] = position.split('-');
    if (vPos === 'top') {
        notification.style.top = '20px';
    } else {
        notification.style.bottom = '20px';
    }

    if (hPos === 'right') {
        notification.style.right = '20px';
        notification.style.transform = 'translateX(100%)';
    } else {
        notification.style.left = '20px';
        notification.style.transform = 'translateX(-100%)';
    }

    // Set background color based on type
    const colors = {
        success: '#4caf50',
        warning: '#ff9800',
        error: '#f44336',
        info: '#2196f3'
    };
    notification.style.background = colors[type];

    // Add icon based on type
    const icons = {
        success: '✅',
        warning: '⚠️',
        error: '❌',
        info: 'ℹ️'
    };

    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">${icons[type]}</span>
            <span>${message}</span>
            <span style="margin-left: auto; opacity: 0.7; font-size: 18px; cursor: pointer;" onclick="this.parentElement.parentElement.remove()">×</span>
        </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 100);

    // Auto remove after duration
    const timeoutId = setTimeout(() => {
        removeNotification(notification, hPos);
    }, duration);

    // Click to dismiss
    notification.addEventListener('click', () => {
        clearTimeout(timeoutId);
        removeNotification(notification, hPos);
    });
}

/**
 * Remove notification with animation
 */
function removeNotification(notification: HTMLElement, horizontalPosition: string): void {
    const translateX = horizontalPosition === 'right' ? '100%' : '-100%';
    notification.style.transform = `translateX(${translateX})`;
    notification.style.opacity = '0';

    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

/**
 * Show success notification
 */
export function showSuccessNotification(message: string, options?: NotificationOptions): void {
    showNotification(message, 'success', options);
}

/**
 * Show warning notification
 */
export function showWarningNotification(message: string, options?: NotificationOptions): void {
    showNotification(message, 'warning', options);
}

/**
 * Show error notification
 */
export function showErrorNotification(message: string, options?: NotificationOptions): void {
    showNotification(message, 'error', options);
}

/**
 * Show info notification
 */
export function showInfoNotification(message: string, options?: NotificationOptions): void {
    showNotification(message, 'info', options);
}
