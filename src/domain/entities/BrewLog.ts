export interface Score {
    body: number; // 0-2 (Light, Medium, Heavy) - mapped to zones
    acidity: number; // 0-10
    bitterness: number; // 0-10
    tasteNotes: string[];
}

export interface BrewLog {
    id?: number;
    userId?: number;
    coffeeId: number;
    grinderId: number;
    date: string; // ISO 8601
    doseIn: number; // grams
    doseOut: number; // grams
    timeSeconds: number;
    temperature?: number; // Celsius
    grindSetting?: string;
    score: Score;
}
