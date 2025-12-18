export interface TemplateSpecialFieldSetting {
    placeholder: string;
    value: string;
    note?: string;
}

export const TEMPLATE_SPECIAL_FIELDS_STORAGE_KEY = 'template_special_fields';
export const TEMPLATE_SPECIAL_FIELDS_EVENT = 'template-special-fields:updated';

const sanitizeEntry = (entry: any): TemplateSpecialFieldSetting | null => {
    if (!entry || typeof entry !== 'object') return null;

    const placeholderSource =
        typeof entry.placeholder === 'string'
            ? entry.placeholder
            : typeof entry.key === 'string'
                ? entry.key
                : '';
    const placeholder = placeholderSource.trim();
    if (!placeholder) return null;

    let value = '';
    if (typeof entry.value === 'string') value = entry.value;
    else if (typeof entry.value === 'number' || typeof entry.value === 'boolean')
        value = String(entry.value);
    else if (typeof entry.value !== 'undefined' && entry.value !== null)
        value = String(entry.value);

    const noteSource =
        typeof entry.note === 'string'
            ? entry.note
            : typeof entry.description === 'string'
                ? entry.description
                : '';
    const note = noteSource.trim();

    return note
        ? {
            placeholder,
            value,
            note
        }
        : {
            placeholder,
            value
        };
};

const parseStoredValue = (raw: string | null): TemplateSpecialFieldSetting[] => {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map(sanitizeEntry)
            .filter((entry): entry is TemplateSpecialFieldSetting => Boolean(entry));
    } catch {
        return [];
    }
};

const serializeSettings = (settings: TemplateSpecialFieldSetting[]): string => {
    const sanitized = settings
        .map(sanitizeEntry)
        .filter((entry): entry is TemplateSpecialFieldSetting => Boolean(entry));
    return JSON.stringify(sanitized);
};

const load = (): TemplateSpecialFieldSetting[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(TEMPLATE_SPECIAL_FIELDS_STORAGE_KEY);
        return parseStoredValue(raw);
    } catch {
        return [];
    }
};

const save = (settings: TemplateSpecialFieldSetting[]): void => {
    if (typeof window === 'undefined') return;
    try {
        const serialized = serializeSettings(settings);
        window.localStorage.setItem(TEMPLATE_SPECIAL_FIELDS_STORAGE_KEY, serialized);
        window.dispatchEvent(new CustomEvent(TEMPLATE_SPECIAL_FIELDS_EVENT));
    } catch (error) {
        console.warn('Không thể lưu thiết lập trường đặc biệt:', error);
    }
};

const toDictionary = (
    settings: TemplateSpecialFieldSetting[]
): Record<string, TemplateSpecialFieldSetting> => {
    return settings.reduce<Record<string, TemplateSpecialFieldSetting>>((acc, setting) => {
        acc[setting.placeholder] = setting;
        return acc;
    }, {});
};

export const templateSpecialFieldsService = {
    load,
    save,
    toDictionary
};
