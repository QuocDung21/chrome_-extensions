export function getXPath(element: Element): string {
    if (element.id) return `//*[@id="${element.id}"]`;

    const parts = [];
    let current: Element | null = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
        let index = 1;
        let sibling = current.previousElementSibling;

        while (sibling) {
            if (sibling.tagName === current.tagName) index++;
            sibling = sibling.previousElementSibling;
        }

        const tagName = current.tagName.toLowerCase();
        parts.unshift(`${tagName}[${index}]`);
        current = current.parentElement;
    }

    return '/' + parts.join('/');
}
