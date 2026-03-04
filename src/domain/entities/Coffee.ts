export interface Coffee {
    id?: number;
    userId?: number;
    name: string;
    roastery: string;
    origin?: string;
    variety?: string;
    process?: string;
    roastDate?: string; // ISO 8601 YYYY-MM-DD
    notes?: string;
}
