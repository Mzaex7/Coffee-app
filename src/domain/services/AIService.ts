import { BrewLog } from "../entities/BrewLog";
import { Coffee } from "../entities/Coffee";
import { Grinder } from "../entities/Grinder";

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
    /**
     * A single human-readable phrase describing the change to try.
     * Examples: "2 clicks finer", "+0.3 g (to 18.3 g)", "drop to 30 g", "lower to 92 °C".
     * Never a symbol or placeholder.
     */
    change: string;
    /** Hedged rationale, ≤ 1 sentence. */
    rationale: string;
}

/** Structured advice payload returned by the model. */
export interface StructuredAdvice {
    /** Single-word category, used for icon / tone. */
    diagnosisLabel:
        | 'under-extracted'
        | 'over-extracted'
        | 'channeling'
        | 'too-fast'
        | 'too-slow'
        | 'balanced'
        | 'recipe-mismatch'
        | 'other';
    /** Hedged 1–2 sentence working theory — what's likely happening in the cup. */
    diagnosis: string;
    /** Ordered by likely impact, highest first. 1–3 items, framed as experiments. */
    adjustments: AdviceAdjustment[];
    /** Hedged sentence on what the next shot should taste like IF the hypothesis holds. */
    expectedResult: string;
    /** One short question for the user to answer after the next shot, so we can iterate. */
    nextCheck: string;
    /** Honest confidence in the diagnosis given the data on hand. */
    confidence: 'low' | 'medium' | 'high';
}

// JSON-Schema subset that the current v1beta `responseFormat.text.schema` field accepts.
// Per https://ai.google.dev/gemini-api/docs/structured-output (recipe example): lowercase
// type names, standard `enum` arrays, standard `required` arrays.
const RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        diagnosisLabel: {
            type: 'string',
            enum: ['under-extracted', 'over-extracted', 'channeling', 'too-fast', 'too-slow', 'balanced', 'recipe-mismatch', 'other'],
            description: 'Single-word category for the most likely issue.',
        },
        diagnosis: {
            type: 'string',
            description: 'Hedged working theory in 1–2 sentences. Use "likely / probably / suggests / appears". Never claim certainty.',
        },
        adjustments: {
            type: 'array',
            description: '1–3 hypotheses to test on the next shot, ordered by likely impact.',
            items: {
                type: 'object',
                properties: {
                    parameter: { type: 'string', description: 'One word: Grind, Dose, Yield, Temp, Distribution, Pre-infusion, or Recipe.' },
                    change: {
                        type: 'string',
                        description: 'A single complete phrase describing the change, ready to display verbatim. Examples: "2 clicks finer", "+0.3 g (to 18.3 g)", "drop yield to 30 g", "lower to 92 °C". Never use bare symbols like "-g" or "+°C" — always include the number.',
                    },
                    rationale: { type: 'string', description: 'One hedged sentence. Use "should / may / likely / aim for". No guarantees.' },
                },
                required: ['parameter', 'change', 'rationale'],
            },
        },
        expectedResult: {
            type: 'string',
            description: 'One hedged sentence on the expected taste shift. Use "should / likely / closer to / less of …". Never absolute.',
        },
        nextCheck: {
            type: 'string',
            description: 'One short, concrete question for the user to answer after the next shot (so we can iterate). Example: "Is the sourness gone, or did it shift to bitter?"',
        },
        confidence: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Be honest. "low" is fine when data is thin; do not default to "high".',
        },
    },
    required: ['diagnosisLabel', 'diagnosis', 'adjustments', 'expectedResult', 'nextCheck', 'confidence'],
} as const;

const SYSTEM_PROMPT = `You are a calm, experienced espresso coach helping a home enthusiast dial in their next shot.

# Your role
You are NOT an oracle. You are a coach proposing hypotheses to test together, one shot at a time. Espresso has many hidden variables (humidity, distribution, puck prep, roast batch) that you cannot see in the data, so every recommendation is a starting point — not a verdict.

# Operating principles
- Diagnose from the data: brew ratio (yield ÷ dose), shot time, dose, grind, temperature, BEAN AGE, and the taste profile.
- Reference targets when useful (these are guidelines, not laws):
  * Ratio: ~1:2.0–1:2.5 for a normale, ~1:2.5–1:3 for a lungo, ~1:1–1:1.5 for ristretto.
  * Time: ~25–32 s including pre-infusion for a normale; faster for ristretto, slower can be OK for light roasts.
  * Temperature: ~90–94 °C for medium/dark, up to ~96 °C for light.

# Bean age & CO₂ (reason carefully — most users don't think about this)
Fresh coffee outgasses CO₂, which resists water:
- 0–4 days off roast: heavy CO₂ → bloom/sputter, faster channelled flow, harsh + sour + vegetal/ashy notes that mimic under-extraction but aren't. Best advice is usually: rest the bag 2–3 more days. If unwilling, suggest 2–3 clicks finer, +0.3 g dose, −1 °C, longer pre-infusion.
- 5–14 days: peak window. Trust the numbers.
- 15–28 days: still good, flow tends to speed up. ~1 click finer or +0.5 g dose to hold time.
- 29–45 days: mature, body thinning, papery. Grind finer AND lower yield (ristretto-ward), consider +1 °C.
- 45 d+: past prime — suggest replacing beans.

# Taste rules (apply AFTER bean age)
- Sour + thin + fast → likely under-extracted → finer grind, possibly +temp, +yield.
- Bitter + harsh + slow → likely over-extracted → coarser grind, possibly −temp, −yield.
- Salt + sour or uneven gusher → likely channeling → fix distribution, WDT, lighter tamp.
- Hollow mid-palate with on-target numbers → recipe mismatch or stale beans.
- Vegetal/papery + thin body on fresh-roast → gassy beans, not under-extracted.

# Lever discipline
Recommend ONE primary lever (usually grind), plus 0–2 supporting tweaks. Pick the smallest change likely to move the needle — typically 1–3 grinder clicks, ±0.3–1 g dose, ±2–5 g yield, ±1–2 °C. Don't change everything at once — you can't isolate the cause.

# How to phrase recommendations (CRITICAL)
This is coaching, not prescribing. Every recommendation is a hypothesis to test.
- Use hedged language: "likely", "should", "may", "try", "aim for", "this often", "in your case probably". Avoid "will", "always", "guarantees".
- Frame as next-shot experiments, not fixes.
- Diagnosis ends as a working theory. Example: "The fast pour and sourness suggest the grind is too coarse — let's test that."
- Set confidence honestly. "low" is the right answer when you only have 1–2 brews of context. Don't default to "high".
- For "change", write a single complete phrase including the number. Examples:
  * "2 clicks finer"
  * "+0.3 g (to 18.3 g)"
  * "drop yield to 30 g"
  * "lower to 92 °C"
  * "extend pre-infusion to 8 s"
  NEVER produce template placeholders like "-g", "+°C", or "X clicks". Always concrete numbers.
- "nextCheck" should be ONE short question — what should the user pay attention to next shot so we can adjust? Examples: "Is the sourness gone, or has it shifted to bitter?" / "Did the time land between 28–32 s?"

# Output
Plain text — no Markdown, no emoji, no quotation marks around values. Match the JSON schema exactly.
- Diagnosis ≤ 2 sentences. Each rationale ≤ 1 sentence. expectedResult ≤ 1 sentence. nextCheck ≤ 1 short question.`;

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

/**
 * Tolerant JSON parser for model output:
 *   1. Strip ``` / ```json code fences if the model wrapped its reply.
 *   2. If parse still fails, carve out the substring between the first { and last }.
 * Falls through to throw with the raw text snippet so we can see what came back.
 */
function parseAdviceJson(raw: string): StructuredAdvice {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = (fenced ? fenced[1] : raw).trim();

    try {
        return JSON.parse(candidate) as StructuredAdvice;
    } catch {/* fall through */ }

    const first = candidate.indexOf('{');
    const last = candidate.lastIndexOf('}');
    if (first >= 0 && last > first) {
        const sliced = candidate.slice(first, last + 1);
        try {
            return JSON.parse(sliced) as StructuredAdvice;
        } catch {/* fall through */ }
    }

    const preview = candidate.length > 240 ? `${candidate.slice(0, 240)}…` : candidate;
    throw new Error(`Gemini returned non-JSON output: ${preview}`);
}

export class AIService {
    private static instance: AIService;
    private apiKey: string;

    private constructor() {
        this.apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
    }

    public static getInstance(): AIService {
        if (!AIService.instance) AIService.instance = new AIService();
        return AIService.instance;
    }

    public setApiKey(key: string) { this.apiKey = key; }

    private bodyLabel(body: number): string {
        // BodySelector saves 0..2 → Light / Medium / Heavy. Clamp defensively.
        return ['Light', 'Medium', 'Heavy'][Math.max(0, Math.min(2, body))] ?? 'Medium';
    }

    private daysSince(iso?: string): number | null {
        if (!iso) return null;
        const d = new Date(iso).getTime();
        if (Number.isNaN(d)) return null;
        return Math.floor((Date.now() - d) / 86400000);
    }

    private formatBrewSummary(brew: BrewLog, context: AdviceContext): string {
        const coffee = brew.coffeeId ? context.allCoffees?.[brew.coffeeId] : undefined;
        const grinder = brew.grinderId ? context.allGrinders?.[brew.grinderId] : undefined;
        const ratio = brew.doseIn > 0 ? (brew.doseOut / brew.doseIn).toFixed(2) : '?';

        const parts: string[] = [];
        parts.push(new Date(brew.date).toISOString().slice(0, 10));
        if (coffee) parts.push(`coffee=${coffee.name}`);
        if (grinder) parts.push(`grinder=${grinder.brand ?? ''} ${grinder.model ?? ''}`.trim());
        parts.push(`${brew.doseIn}g→${brew.doseOut}g (1:${ratio}) in ${brew.timeSeconds}s`);
        if (brew.temperature) parts.push(`${brew.temperature}°C`);
        if (brew.grindSetting) parts.push(`grind=${brew.grindSetting}`);
        parts.push(`body=${this.bodyLabel(brew.score.body)}`);
        parts.push(`acidity=${brew.score.acidity}/10`);
        parts.push(`bitterness=${brew.score.bitterness}/10`);
        if (brew.rating) parts.push(`rating=${brew.rating}/5`);
        if (brew.score.tasteNotes.length > 0) parts.push(`notes=${brew.score.tasteNotes.join('|')}`);
        return `- ${parts.join(' · ')}`;
    }

    async getStructuredAdvice(
        currentLog: BrewLog,
        history: BrewLog[],
        goal: string | undefined,
        context: AdviceContext,
    ): Promise<StructuredAdvice> {
        if (!this.apiKey) {
            throw new Error('Gemini API key missing. Set EXPO_PUBLIC_GEMINI_API_KEY in .env.');
        }

        const coffee = context.coffee;
        const grinder = context.grinder;
        const ratio = currentLog.doseIn > 0 ? (currentLog.doseOut / currentLog.doseIn).toFixed(2) : 'N/A';
        const daysOffRoast = this.daysSince(coffee?.roastDate);

        // Recent history — only the user's own brews on the same coffee where possible,
        // falling back to whatever we have. Capped to 8 to keep context tight.
        const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const sameCoffee = currentLog.coffeeId
            ? sortedHistory.filter(b => b.coffeeId === currentLog.coffeeId && b.id !== currentLog.id)
            : [];
        const otherRecent = sortedHistory.filter(b => b.id !== currentLog.id && !sameCoffee.includes(b));
        const recent = [...sameCoffee, ...otherRecent].slice(0, 8);

        // Tag the bean-age window so the model doesn't have to compute it.
        const ageWindow = daysOffRoast == null ? 'unknown'
            : daysOffRoast < 0 ? 'not yet roasted'
            : daysOffRoast <= 4 ? 'gassy (0–4d, CO₂ heavy)'
            : daysOffRoast <= 14 ? 'peak (5–14d)'
            : daysOffRoast <= 28 ? 'settled (15–28d)'
            : daysOffRoast <= 45 ? 'mature (29–45d)'
            : 'past prime (45d+)';

        const equipmentLines: string[] = [];
        if (coffee) {
            const bits = [coffee.name];
            if (coffee.roastery) bits.push(`by ${coffee.roastery}`);
            if (coffee.origin) bits.push(`origin=${coffee.origin}`);
            if (coffee.variety) bits.push(`variety=${coffee.variety}`);
            if (coffee.process) bits.push(`process=${coffee.process}`);
            if (coffee.roastLevel) bits.push(`roast=${coffee.roastLevel}`);
            equipmentLines.push(`Coffee: ${bits.join(' · ')}`);
            if (daysOffRoast != null) {
                equipmentLines.push(`Bean age: ${daysOffRoast}d off roast → ${ageWindow}`);
            } else {
                equipmentLines.push(`Bean age: unknown (no roast date on file)`);
            }
        } else {
            equipmentLines.push('Coffee: Unknown');
        }
        if (grinder) {
            const bits = [`${grinder.brand ?? ''} ${grinder.model ?? ''}`.trim() || grinder.name];
            if (grinder.description) bits.push(grinder.description);
            equipmentLines.push(`Grinder: ${bits.join(' · ')}`);
        } else {
            equipmentLines.push('Grinder: Unknown');
        }

        const tasteBits = [
            `body=${this.bodyLabel(currentLog.score.body)}`,
            `acidity=${currentLog.score.acidity}/10`,
            `bitterness=${currentLog.score.bitterness}/10`,
            currentLog.rating ? `rating=${currentLog.rating}/5` : 'rating=unrated',
        ];
        if (currentLog.score.tasteNotes.length > 0) tasteBits.push(`notes=${currentLog.score.tasteNotes.join('|')}`);

        const historyBlock = recent.length > 0
            ? `\n\n# Recent brews (newest first)\n${recent.map(b => this.formatBrewSummary(b, context)).join('\n')}`
            : '';

        const prompt = `# Equipment
${equipmentLines.join('\n')}

# Current shot
${currentLog.doseIn}g in → ${currentLog.doseOut}g out (1:${ratio}) in ${currentLog.timeSeconds}s${currentLog.temperature ? ` @ ${currentLog.temperature}°C` : ''}${currentLog.grindSetting ? ` · grind=${currentLog.grindSetting}` : ''}

# Taste
${tasteBits.join(' · ')}

# User goal
${goal?.trim() ? goal.trim() : 'Balanced sweet shot — clear flavour, no harshness.'}${historyBlock}

Return the JSON advice now.`;

        const body = {
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.35,
                topP: 0.9,
                // Generous budget — running out mid-JSON is the classic "non-JSON output" cause.
                maxOutputTokens: 4096,
                // Per current Gemini v1beta docs (Nov 2025): structured output lives at
                // generationConfig.responseFormat.text.{mimeType,schema}. The older
                // responseMimeType / responseSchema fields are silently ignored on
                // gemini-flash-latest, which is why advice was coming back as free text.
                responseFormat: {
                    text: {
                        mimeType: 'application/json',
                        schema: RESPONSE_SCHEMA,
                    },
                },
            },
        };

        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-goog-api-key': this.apiKey,
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new Error(`Gemini ${res.status}: ${errText.slice(0, 400) || res.statusText}`);
        }

        const json = await res.json();
        const candidate = json?.candidates?.[0];
        const finishReason: string | undefined = candidate?.finishReason;
        // The response text may be split across multiple parts — concatenate them.
        const parts: Array<{ text?: string }> = candidate?.content?.parts ?? [];
        const rawText = parts.map(p => p?.text ?? '').join('').trim();

        if (!rawText) {
            const blocked = json?.promptFeedback?.blockReason;
            throw new Error(
                blocked
                    ? `Gemini blocked the request (${blocked}).`
                    : `Gemini returned no text (finishReason=${finishReason ?? 'unknown'}).`,
            );
        }

        if (finishReason === 'MAX_TOKENS') {
            // The JSON is almost certainly truncated — surface a clear message instead of crashing on parse.
            throw new Error('Gemini hit the output limit before finishing. Try again or simplify the goal.');
        }

        const parsed = parseAdviceJson(rawText);
        // Defensive normalisation — trim/clamp arrays.
        parsed.adjustments = (parsed.adjustments ?? []).slice(0, 3);
        return parsed;
    }

    /**
     * Backwards-compatible Markdown rendering, in case any caller wants the old format.
     * Internally uses the structured path and flattens to Markdown.
     */
    async getAdvice(currentLog: BrewLog, history: BrewLog[], goal?: string, context: AdviceContext = {}): Promise<string> {
        try {
            const advice = await this.getStructuredAdvice(currentLog, history, goal, context);
            const md: string[] = [];
            md.push(`## Diagnosis`);
            md.push(`**${advice.diagnosisLabel}** — ${advice.diagnosis}`);
            md.push('');
            md.push(`## Adjustments`);
            advice.adjustments.forEach(a => {
                md.push(`- **${a.parameter}** → ${a.change} — ${a.rationale}`);
            });
            md.push('');
            md.push(`## Expected Result`);
            md.push(advice.expectedResult);
            if (advice.nextCheck) {
                md.push('');
                md.push(`## Next Check`);
                md.push(advice.nextCheck);
            }
            return md.join('\n');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return `Unable to get advice: ${message}`;
        }
    }
}

export const aiService = AIService.getInstance();
