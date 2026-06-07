export type RoastLevel = 'Light' | 'Medium-Light' | 'Medium' | 'Medium-Dark' | 'Dark';

export interface Coffee {
    id?: number;
    userId?: string;
    name: string;
    roastery: string;
    origin?: string;
    variety?: string;
    process?: string;
    roastLevel?: RoastLevel;
    roastDate?: string; // ISO 8601 YYYY-MM-DD
    notes?: string;
}
