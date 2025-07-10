export enum ScraperCommand {
    SCRAPE
}

export interface ScraperMessage {
    command: ScraperCommand;
}

// Form filling types
export interface FormFieldData {
    [fieldId: string]: string;
}

export interface FormFillData {
    data: FormFieldData[];
}

export interface FormFillMessage {
    type: 'FILL_FORM_DATA';
    payload: FormFillData;
}
