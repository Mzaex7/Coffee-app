/**
 * Pure helpers for espresso brew metrics.
 * No refractometer data is assumed, so we report what can be derived
 * honestly from dose / yield / time rather than guessing an extraction %.
 */

export function ratio(doseIn: number, doseOut: number): number {
    if (!doseIn || doseIn <= 0) return 0;
    return doseOut / doseIn;
}

export function formatRatio(doseIn: number, doseOut: number): string {
    const r = ratio(doseIn, doseOut);
    return r > 0 ? `1:${r.toFixed(1)}` : '–';
}

/** Average flow rate over the shot, in grams per second. */
export function flowRate(doseOut: number, timeSeconds: number): number {
    if (!timeSeconds || timeSeconds <= 0) return 0;
    return doseOut / timeSeconds;
}

export function formatFlowRate(doseOut: number, timeSeconds: number): string {
    const f = flowRate(doseOut, timeSeconds);
    return f > 0 ? `${f.toFixed(2)} g/s` : '–';
}

export type BrewStyle = 'Ristretto' | 'Espresso' | 'Lungo' | 'Long';

export function brewStyle(doseIn: number, doseOut: number): BrewStyle {
    const r = ratio(doseIn, doseOut);
    if (r < 1.5) return 'Ristretto';
    if (r <= 2.4) return 'Espresso';
    if (r <= 3.5) return 'Lungo';
    return 'Long';
}
