type FreshnessTone = 'neutral' | 'primary' | 'success' | 'error' | 'accent';

export interface Freshness {
    days: number;
    label: string;
    tone: FreshnessTone;
    detail: string;
}

/**
 * Espresso degasses for a few days after roasting and then hits a sweet spot
 * roughly one to three weeks off roast before slowly fading. Map days-off-roast
 * to a human-readable freshness window.
 */
export function getFreshness(roastDate?: string): Freshness | null {
    if (!roastDate) return null;
    const roast = new Date(roastDate);
    if (isNaN(roast.getTime())) return null;

    const now = new Date();
    const days = Math.floor((now.getTime() - roast.getTime()) / (1000 * 60 * 60 * 24));

    if (days < 0) {
        return { days, label: 'Not roasted yet', tone: 'neutral', detail: 'Roast date is in the future' };
    }
    if (days <= 3) {
        return { days, label: 'Degassing', tone: 'accent', detail: 'Let it rest a few more days' };
    }
    if (days <= 21) {
        return { days, label: 'Peak', tone: 'success', detail: 'In the sweet spot' };
    }
    if (days <= 40) {
        return { days, label: 'Mature', tone: 'primary', detail: 'Still good, fading slowly' };
    }
    return { days, label: 'Past prime', tone: 'error', detail: 'Flavours are dropping off' };
}

export function daysSince(dateStr?: string): number | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}
