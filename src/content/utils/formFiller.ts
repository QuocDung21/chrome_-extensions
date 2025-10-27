// export interface FormData {
//     index: number;
//     value: string;
// }

// export function fillFormByIndex(formData: FormData[]): void {
//     const inputs = document.querySelectorAll('input, textarea, select');
    
//     formData.forEach(data => {
//         if (data.index >= 0 && data.index < inputs.length) {
//             const element = inputs[data.index] as HTMLInputElement;
//             fillElement(element, data.value);
//         }
//     });
    
//     showNotification(`Filled ${formData.length} form fields`, 'success');
// }

// export function fillElement(element: HTMLInputElement, value: string): void {
//     if (!element || element.disabled || element.readOnly) {
//         return;
//     }
    
//     // Focus the element first
//     element.focus();
    
//     // Clear existing value
//     element.value = '';
    
//     // Set the new value using different methods for better compatibility
//     if (element.type === 'checkbox' || element.type === 'radio') {
//         element.checked = value.toLowerCase() === 'true' || value === '1';
//     } else {
//         // Use setNativeValue for React/Vue compatibility
//         setNativeValue(element, value);
//     }
    
//     // Trigger events to ensure the change is detected
//     triggerEvents(element);
    
//     // Blur the element
//     element.blur();
// }

// function setNativeValue(element: HTMLInputElement, value: string): void {
//     const valueSetter = Object.getOwnPropertyDescriptor(element, 'value') ||
//                        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');
    
//     if (valueSetter && valueSetter.set) {
//         valueSetter.set.call(element, value);
//     } else {
//         element.value = value;
//     }
// }

// function triggerEvents(element: HTMLInputElement): void {
//     const events = [
//         new Event('input', { bubbles: true }),
//         new Event('change', { bubbles: true }),
//         new Event('blur', { bubbles: true }),
//         new KeyboardEvent('keydown', { bubbles: true }),
//         new KeyboardEvent('keyup', { bubbles: true })
//     ];
    
//     events.forEach(event => {
//         element.dispatchEvent(event);
//     });
// }

// export function simulateTyping(element: HTMLInputElement, text: string, delay: number = 50): Promise<void> {
//     return new Promise((resolve) => {
//         element.focus();
//         element.value = '';
        
//         let index = 0;
        
//         const typeChar = () => {
//             if (index < text.length) {
//                 const char = text[index];
//                 element.value += char;
                
//                 // Trigger input event for each character
//                 element.dispatchEvent(new Event('input', { bubbles: true }));
                
//                 index++;
//                 setTimeout(typeChar, delay);
//             } else {
//                 // Trigger final events
//                 element.dispatchEvent(new Event('change', { bubbles: true }));
//                 element.dispatchEvent(new Event('blur', { bubbles: true }));
//                 element.blur();
//                 resolve();
//             }
//         };
        
//         typeChar();
//     });
// }

// export function getFormData(): FormData[] {
//     const inputs = document.querySelectorAll('input, textarea, select');
//     const formData: FormData[] = [];
    
//     inputs.forEach((element, index) => {
//         const inputElement = element as HTMLInputElement;
//         let value = '';
        
//         if (inputElement.type === 'checkbox' || inputElement.type === 'radio') {
//             value = inputElement.checked ? 'true' : 'false';
//         } else {
//             value = inputElement.value || '';
//         }
        
//         formData.push({
//             index,
//             value
//         });
//     });
    
//     return formData;
// }

// export function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
//     const colors = {
//         success: '#4CAF50',
//         error: '#f44336',
//         info: '#2196F3'
//     };
    
//     const notification = document.createElement('div');
//     notification.style.cssText = `
//         position: fixed;
//         top: 20px;
//         left: 50%;
//         transform: translateX(-50%);
//         background: ${colors[type]};
//         color: white;
//         padding: 12px 24px;
//         border-radius: 8px;
//         z-index: 10002;
//         font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
//         box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
//         max-width: 400px;
//         text-align: center;
//         opacity: 0;
//         transition: opacity 0.3s ease;
//     `;
//     notification.textContent = message;
    
//     document.body.appendChild(notification);
    
//     // Animate in
//     setTimeout(() => {
//         notification.style.opacity = '1';
//     }, 10);
    
//     // Remove after 3 seconds
//     setTimeout(() => {
//         notification.style.opacity = '0';
//         setTimeout(() => {
//             if (notification.parentNode) {
//                 notification.parentNode.removeChild(notification);
//             }
//         }, 300);
//     }, 3000);
// }

// // Sample form data for testing
// export const sampleFormData: FormData[] = [
//     { index: 0, value: 'John Doe' },
//     { index: 1, value: 'john.doe@example.com' },
//     { index: 2, value: '+1234567890' },
//     { index: 3, value: '123 Main St' },
//     { index: 4, value: 'New York' },
//     { index: 5, value: '10001' }
// ];

// export function fillSampleData(): void {
//     fillFormByIndex(sampleFormData);
// }
