import { supabase } from '../../data/supabase';
import { BrewLog } from '../entities/BrewLog';
import { Coffee } from '../entities/Coffee';
import { Grinder } from '../entities/Grinder';

export interface AdviceContext {
    coffee?: Coffee;
    grinder?: Grinder;
    allCoffees?: Record<number, Coffee>;
    allGrinders?: Record<number, Grinder>;
}

/** One hypothesis to test on the next shot. */
export interface AdviceAdjustment {
    /** Short label for the lever ("Grind", "Dose", "Yield", "Temp", "Distribution"). */
    parameter: string;
    /** A single human-readable phrase describing the change to try (e.g. "2 clicks finer"). */
    change: string;
    /** Hedged rationale, ≤ 1 sentence. */
    rationale: string;
}

/** Structured advice payload returned by the brew-advice Edge Function. */
export interface StructuredAdvice {
    diagnosisLabel:
        | 'under-extracted'
        | 'over-extracted'
        | 'channeling'
        | 'too-fast'
        | 'too-slow'
        | 'balanced'
        | 'recipe-mismatch'
        | 'other';
    diagnosis: string;
    adjustments: AdviceAdjustment[];
    expectedResult: string;
    nextCheck: string;
    confidence: 'low' | 'medium' | 'high';
    /**
     * Present when the advice was informed by anonymized community data for this
     * exact bean. Counts only — never any identifying detail.
     */
    community?: { brewers: number; shots: number };
}

/**
 * AIService — thin client over the `brew-advice` Supabase Edge Function.
 *
 * The prompt, schema, Gemini call and the anonymized cross-user community
 * lookup all live server-side (supabase/functions/brew-advice). This keeps the
 * Gemini key off the client and lets the function read other users' shared
 * brews safely. The client just ships the brew + context and renders the result.
 */
export class AIService {
    private static instance: AIService;
    private constructor() { }

    public static getInstance(): AIService {
        if (!AIService.instance) AIService.instance = new AIService();
        return AIService.instance;
    }

    async getStructuredAdvice(
        currentLog: BrewLog,
        history: BrewLog[],
        goal: string | undefined,
        context: AdviceContext,
    ): Promise<StructuredAdvice> {
        const { data, error } = await supabase.functions.invoke('brew-advice', {
            body: {
                currentLog,
                history,
                goal,
                coffee: context.coffee ?? null,
                grinder: context.grinder ?? null,
                allCoffees: context.allCoffees ?? {},
                allGrinders: context.allGrinders ?? {},
            },
        });

        if (error) {
            // Surface the server's JSON { error } message when present.
            let message = error.message;
            try {
                const ctx = await (error as { context?: { json?: () => Promise<{ error?: string }> } }).context?.json?.();
                if (ctx?.error) message = ctx.error;
            } catch { /* keep the generic message */ }
            throw new Error(message);
        }
        if (!data) throw new Error('No response from the Brew Doctor.');
        if ((data as { error?: string }).error) throw new Error((data as { error: string }).error);

        return data as StructuredAdvice;
    }
}

export const aiService = AIService.getInstance();
