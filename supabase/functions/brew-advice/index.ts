// Supabase Edge Function: brew-advice
//
// The AI "brain" lives here, server-side, for two reasons:
//   1. Security — the Gemini API key is a function secret (GEMINI_API_KEY) and
//      never ships to the client bundle.
//   2. Community data — it calls get_community_bean_stats() (anonymized, opt-in,
//      k-anonymized) and folds other brewers' results for the same bean into the
//      prompt, so advice is informed by the wider community without ever exposing
//      individual rows.
//
// Deploy:  supabase functions deploy brew-advice
// Secret:  supabase secrets set GEMINI_API_KEY=...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// Types (mirror src/domain/services/AIService.ts — keep in sync)
// ---------------------------------------------------------------------------
interface Score { body: number; acidity: number; bitterness: number; tasteNotes: string[] }
interface BrewLog {
    id?: number; coffeeId?: number; grinderId?: number; date: string;
    doseIn: number; doseOut: number; timeSeconds: number;
    temperature?: number; grindSetting?: string; rating?: number; score: Score;
}
interface Coffee {
    id?: number; name: string; roastery: string; origin?: string; variety?: string;
    process?: string; roastLevel?: string; roastDate?: string;
}
interface Grinder { id?: number; name: string; brand?: string; model?: string; description?: string }

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ---------------------------------------------------------------------------
// Structured-output schema.
// The Gemini REST API expects an OpenAPI-3 subset under generationConfig.
// responseSchema, with UPPERCASE Type enum values (OBJECT/STRING/ARRAY) and
// generationConfig.responseMimeType = "application/json".
// ---------------------------------------------------------------------------
const RESPONSE_SCHEMA = {
    type: 'OBJECT',
    properties: {
        diagnosisLabel: {
            type: 'STRING',
            enum: ['under-extracted', 'over-extracted', 'channeling', 'too-fast', 'too-slow', 'balanced', 'recipe-mismatch', 'other'],
            description: 'Single-word category for the most likely issue.',
        },
        diagnosis: {
            type: 'STRING',
            description: 'Hedged working theory in 1–2 sentences. Use "likely / probably / suggests / appears". Never claim certainty.',
        },
        adjustments: {
            type: 'ARRAY',
            description: '1–3 hypotheses to test on the next shot, ordered by likely impact.',
            items: {
                type: 'OBJECT',
                properties: {
                    parameter: { type: 'STRING', description: 'One word: Grind, Dose, Yield, Temp, Distribution, Pre-infusion, or Recipe.' },
                    change: {
                        type: 'STRING',
                        description: 'A single complete phrase describing the change, ready to display verbatim. Examples: "2 clicks finer", "+0.3 g (to 18.3 g)", "drop yield to 30 g", "lower to 92 °C". Never use bare symbols like "-g" or "+°C" — always include the number.',
                    },
                    rationale: { type: 'STRING', description: 'One hedged sentence. Use "should / may / likely / aim for". No guarantees.' },
                },
                required: ['parameter', 'change', 'rationale'],
            },
        },
        expectedResult: {
            type: 'STRING',
            description: 'One hedged sentence on the expected taste shift. Use "should / likely / closer to / less of …". Never absolute.',
        },
        nextCheck: {
            type: 'STRING',
            description: 'One short, concrete question for the user to answer after the next shot (so we can iterate).',
        },
        confidence: {
            type: 'STRING',
            enum: ['low', 'medium', 'high'],
            description: 'Be honest. "low" is fine when data is thin; do not default to "high".',
        },
    },
    required: ['diagnosisLabel', 'diagnosis', 'adjustments', 'expectedResult', 'nextCheck', 'confidence'],
};

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

# Community reference (when provided)
If a "Community reference" block is present, it summarizes anonymized shots from OTHER brewers on this exact bean. Use it as corroborating evidence to sanity-check your direction — e.g. if their best-rated shots run finer/longer than this user's, that supports going finer. But their grinder, water and technique differ, so never copy their numbers blindly and never claim certainty because of it. If it conflicts with the in-cup taste, trust the taste.

# Lever discipline
Recommend ONE primary lever (usually grind), plus 0–2 supporting tweaks. Pick the smallest change likely to move the needle — typically 1–3 grinder clicks, ±0.3–1 g dose, ±2–5 g yield, ±1–2 °C. Don't change everything at once — you can't isolate the cause.

# How to phrase recommendations (CRITICAL)
This is coaching, not prescribing. Every recommendation is a hypothesis to test.
- Use hedged language: "likely", "should", "may", "try", "aim for", "this often", "in your case probably". Avoid "will", "always", "guarantees".
- Frame as next-shot experiments, not fixes.
- Diagnosis ends as a working theory.
- Set confidence honestly. "low" is the right answer when you only have 1–2 brews of context. Don't default to "high".
- For "change", write a single complete phrase including the number. NEVER produce template placeholders like "-g", "+°C", or "X clicks". Always concrete numbers.
- "nextCheck" should be ONE short question — what should the user pay attention to next shot so we can adjust?

# Output
Plain text — no Markdown, no emoji, no quotation marks around values. Match the JSON schema exactly.
- Diagnosis ≤ 2 sentences. Each rationale ≤ 1 sentence. expectedResult ≤ 1 sentence. nextCheck ≤ 1 short question.`;

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

// ---------------------------------------------------------------------------
// Prompt-building helpers (ported from the old client AIService)
// ---------------------------------------------------------------------------
const bodyLabel = (b: number) => ['Light', 'Medium', 'Heavy'][Math.max(0, Math.min(2, b))] ?? 'Medium';

const daysSince = (iso?: string): number | null => {
    if (!iso) return null;
    const d = new Date(iso).getTime();
    if (Number.isNaN(d)) return null;
    return Math.floor((Date.now() - d) / 86400000);
};

const beanKey = (c?: Coffee | null): string | null =>
    c ? `${(c.roastery ?? '').trim().toLowerCase()}|${(c.name ?? '').trim().toLowerCase()}` : null;

function formatBrewSummary(brew: BrewLog, allCoffees: Record<number, Coffee>, allGrinders: Record<number, Grinder>): string {
    const coffee = brew.coffeeId ? allCoffees?.[brew.coffeeId] : undefined;
    const grinder = brew.grinderId ? allGrinders?.[brew.grinderId] : undefined;
    const ratio = brew.doseIn > 0 ? (brew.doseOut / brew.doseIn).toFixed(2) : '?';
    const parts: string[] = [new Date(brew.date).toISOString().slice(0, 10)];
    if (coffee) parts.push(`coffee=${coffee.name}`);
    if (grinder) parts.push(`grinder=${`${grinder.brand ?? ''} ${grinder.model ?? ''}`.trim()}`);
    parts.push(`${brew.doseIn}g→${brew.doseOut}g (1:${ratio}) in ${brew.timeSeconds}s`);
    if (brew.temperature) parts.push(`${brew.temperature}°C`);
    if (brew.grindSetting) parts.push(`grind=${brew.grindSetting}`);
    parts.push(`body=${bodyLabel(brew.score.body)}`);
    parts.push(`acidity=${brew.score.acidity}/10`);
    parts.push(`bitterness=${brew.score.bitterness}/10`);
    if (brew.rating) parts.push(`rating=${brew.rating}/5`);
    if (brew.score.tasteNotes?.length) parts.push(`notes=${brew.score.tasteNotes.join('|')}`);
    return `- ${parts.join(' · ')}`;
}

interface CommunityStats {
    brewers: number;
    shots: number;
    median?: { doseIn: number; doseOut: number; ratio: number; timeSeconds: number; temperature: number; rating: number };
    topRecipe?: { shots: number; doseIn: number; doseOut: number; ratio: number; timeSeconds: number; temperature: number; rating: number };
}

function communityBlock(stats: CommunityStats | null): string {
    if (!stats?.median) return '';
    const m = stats.median;
    const lines = [
        `\n\n# Community reference (anonymized — ${stats.brewers} other brewers, ${stats.shots} shots on this exact bean)`,
        `Median across shared shots: ${m.doseIn}g→${m.doseOut}g (1:${m.ratio}) in ${m.timeSeconds}s${m.temperature ? ` @ ${m.temperature}°C` : ''}, median rating ${m.rating}/5.`,
    ];
    if (stats.topRecipe) {
        const t = stats.topRecipe;
        lines.push(`Best-rated shots (rating ≥ 4, ${t.shots} shots): ${t.doseIn}g→${t.doseOut}g (1:${t.ratio}) in ${t.timeSeconds}s${t.temperature ? ` @ ${t.temperature}°C` : ''}.`);
    }
    return lines.join('\n');
}

function parseAdviceJson(raw: string): Record<string, unknown> {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = (fenced ? fenced[1] : raw).trim();
    try { return JSON.parse(candidate); } catch { /* fall through */ }
    const first = candidate.indexOf('{');
    const last = candidate.lastIndexOf('}');
    if (first >= 0 && last > first) {
        try { return JSON.parse(candidate.slice(first, last + 1)); } catch { /* fall through */ }
    }
    const preview = candidate.length > 240 ? `${candidate.slice(0, 240)}…` : candidate;
    throw new Error(`Gemini returned non-JSON output: ${preview}`);
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

    const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

    try {
        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) return json({ error: 'Server missing GEMINI_API_KEY secret.' }, 500);

        const authHeader = req.headers.get('Authorization') ?? '';
        if (!authHeader) return json({ error: 'Missing Authorization header.' }, 401);

        const { currentLog, history = [], goal, coffee, grinder, allCoffees = {}, allGrinders = {} } =
            await req.json() as {
                currentLog: BrewLog; history?: BrewLog[]; goal?: string;
                coffee?: Coffee | null; grinder?: Grinder | null;
                allCoffees?: Record<number, Coffee>; allGrinders?: Record<number, Grinder>;
            };

        if (!currentLog) return json({ error: 'Missing currentLog.' }, 400);

        // --- Community lookup (RLS-respecting client using the caller's JWT) ---
        let community: CommunityStats | null = null;
        const key = beanKey(coffee);
        if (key) {
            const sb = createClient(
                Deno.env.get('SUPABASE_URL')!,
                Deno.env.get('SUPABASE_ANON_KEY')!,
                { global: { headers: { Authorization: authHeader } } },
            );
            const { data, error } = await sb.rpc('get_community_bean_stats', { p_bean_key: key });
            if (!error && data) community = data as CommunityStats;
        }

        // --- Build the prompt (same shape as the old client AIService) ---
        const ratio = currentLog.doseIn > 0 ? (currentLog.doseOut / currentLog.doseIn).toFixed(2) : 'N/A';
        const daysOffRoast = daysSince(coffee?.roastDate);
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
            equipmentLines.push(daysOffRoast != null
                ? `Bean age: ${daysOffRoast}d off roast → ${ageWindow}`
                : `Bean age: unknown (no roast date on file)`);
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
            `body=${bodyLabel(currentLog.score.body)}`,
            `acidity=${currentLog.score.acidity}/10`,
            `bitterness=${currentLog.score.bitterness}/10`,
            currentLog.rating ? `rating=${currentLog.rating}/5` : 'rating=unrated',
        ];
        if (currentLog.score.tasteNotes?.length) tasteBits.push(`notes=${currentLog.score.tasteNotes.join('|')}`);

        const sorted = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const sameCoffee = currentLog.coffeeId
            ? sorted.filter(b => b.coffeeId === currentLog.coffeeId && b.id !== currentLog.id)
            : [];
        const otherRecent = sorted.filter(b => b.id !== currentLog.id && !sameCoffee.includes(b));
        const recent = [...sameCoffee, ...otherRecent].slice(0, 8);
        const historyBlock = recent.length
            ? `\n\n# Recent brews (newest first)\n${recent.map(b => formatBrewSummary(b, allCoffees, allGrinders)).join('\n')}`
            : '';

        const prompt = `# Equipment
${equipmentLines.join('\n')}

# Current shot
${currentLog.doseIn}g in → ${currentLog.doseOut}g out (1:${ratio}) in ${currentLog.timeSeconds}s${currentLog.temperature ? ` @ ${currentLog.temperature}°C` : ''}${currentLog.grindSetting ? ` · grind=${currentLog.grindSetting}` : ''}

# Taste
${tasteBits.join(' · ')}

# User goal
${goal?.trim() ? goal.trim() : 'Balanced sweet shot — clear flavour, no harshness.'}${communityBlock(community)}${historyBlock}

Return the JSON advice now.`;

        const geminiBody = {
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.35,
                topP: 0.9,
                maxOutputTokens: 4096,
                responseMimeType: 'application/json',
                responseSchema: RESPONSE_SCHEMA,
            },
        };

        const res = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
            body: JSON.stringify(geminiBody),
        });
        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            return json({ error: `Gemini ${res.status}: ${errText.slice(0, 400) || res.statusText}` }, 502);
        }

        const data = await res.json();
        const candidate = data?.candidates?.[0];
        const finishReason: string | undefined = candidate?.finishReason;
        const parts: Array<{ text?: string }> = candidate?.content?.parts ?? [];
        const rawText = parts.map(p => p?.text ?? '').join('').trim();

        if (!rawText) {
            const blocked = data?.promptFeedback?.blockReason;
            return json({ error: blocked ? `Gemini blocked the request (${blocked}).` : `Gemini returned no text (finishReason=${finishReason ?? 'unknown'}).` }, 502);
        }
        if (finishReason === 'MAX_TOKENS') {
            return json({ error: 'Gemini hit the output limit before finishing. Try again or simplify the goal.' }, 502);
        }

        const advice = parseAdviceJson(rawText);
        if (Array.isArray((advice as { adjustments?: unknown[] }).adjustments)) {
            (advice as { adjustments: unknown[] }).adjustments = (advice as { adjustments: unknown[] }).adjustments.slice(0, 3);
        }
        // Attach the community footprint for the client UI (counts only — anonymized).
        if (community?.median) {
            (advice as Record<string, unknown>).community = { brewers: community.brewers, shots: community.shots };
        }

        return json(advice);
    } catch (e) {
        return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
    }
});
