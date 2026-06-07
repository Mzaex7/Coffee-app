/**
 * ============================================================
 *  test_integration.ts — Integrationstests
 * ============================================================
 *
 * Testet das Zusammenspiel zwischen Repository-Schicht und dem
 * Supabase-Client (durch ein In-Memory-Mock ersetzt), sowie den
 * AIService-Client gegen die gemockte Edge Function.
 *
 * Fokus: Interaktionsketten über Schichtgrenzen hinweg,
 * deterministisch (kein Netzwerk, keine echte DB).
 *
 * Framework: Jest + ts-jest
 */

// Replace the Supabase client with an in-memory mock for the whole module.
jest.mock('../src/data/supabase', () => {
    const { createMockSupabase } = require('./helpers/MockSupabase');
    return { supabase: createMockSupabase(), hasSupabaseConfig: true };
});

import { supabase } from '../src/data/supabase';
import { CoffeeRepository } from '../src/data/repositories/CoffeeRepository';
import { GrinderRepository } from '../src/data/repositories/GrinderRepository';
import { aiService, StructuredAdvice } from '../src/domain/services/AIService';
import { Coffee } from '../src/domain/entities/Coffee';
import { Grinder } from '../src/domain/entities/Grinder';
import { BrewLog } from '../src/domain/entities/BrewLog';

const mock = supabase as unknown as import('./helpers/MockSupabase').MockSupabase;

describe('Integrationstests — Repository + Supabase-Mock', () => {

    beforeEach(() => {
        mock.__reset();
        mock.functions.invoke.mockReset();
    });

    // ─────────────────────────────────────────────────────────
    // Test 1: Coffee erstellen und wieder abrufen
    // Komponenten: CoffeeRepository → Supabase-Client (Mock)
    // ─────────────────────────────────────────────────────────
    test('CoffeeRepository: create() speichert einen Kaffee, getAll() gibt ihn zurück', async () => {
        const repo = new CoffeeRepository();
        const coffee: Coffee = {
            name: 'Ethiopia Yirgacheffe',
            roastery: 'The Barn',
            origin: 'Ethiopia',
            variety: 'Heirloom',
            process: 'Washed',
        };

        const insertedId = await repo.create(coffee);
        const allCoffees = await repo.getAll();

        expect(insertedId).toBe(1);
        expect(allCoffees).toHaveLength(1);
        expect(allCoffees[0].id).toBe(1);
        expect(allCoffees[0].name).toBe('Ethiopia Yirgacheffe');
        expect(allCoffees[0].roastery).toBe('The Barn');
        expect(allCoffees[0].origin).toBe('Ethiopia');
        // user_id is stamped from the signed-in user when not supplied.
        expect(allCoffees[0].userId).toBe(mock.__userId);
    });

    // ─────────────────────────────────────────────────────────
    // Test 2: Grinder erstellen, löschen, Konsistenz prüfen
    // Komponenten: GrinderRepository → Supabase-Client (Mock)
    // ─────────────────────────────────────────────────────────
    test('GrinderRepository: nach create() + delete() ist die Liste leer', async () => {
        const repo = new GrinderRepository();
        const grinder: Grinder = {
            name: 'Comandante C40',
            brand: 'Comandante',
            model: 'C40 MK4',
            description: 'Premium hand grinder',
        };

        const insertedId = await repo.create(grinder);
        const afterCreate = await repo.getAll();

        await repo.delete(insertedId);
        const afterDelete = await repo.getAll();

        expect(afterCreate).toHaveLength(1);
        expect(afterCreate[0].name).toBe('Comandante C40');
        expect(afterDelete).toHaveLength(0);
    });

    // ─────────────────────────────────────────────────────────
    // Test 3: AIService gibt die strukturierte Antwort der Edge
    //         Function durch (inkl. Community-Feld).
    // Komponenten: AIService → supabase.functions.invoke (Mock)
    // ─────────────────────────────────────────────────────────
    test('AIService.getStructuredAdvice gibt das Ergebnis der Edge Function zurück', async () => {
        const advice: StructuredAdvice = {
            diagnosisLabel: 'under-extracted',
            diagnosis: 'The fast pour and sourness suggest the grind is likely too coarse.',
            adjustments: [{ parameter: 'Grind', change: '2 clicks finer', rationale: 'Should slow the flow and raise extraction.' }],
            expectedResult: 'Less sour, a touch sweeter.',
            nextCheck: 'Is the sourness gone or has it shifted to bitter?',
            confidence: 'medium',
            community: { brewers: 3, shots: 12 },
        };
        mock.functions.invoke.mockResolvedValueOnce({ data: advice, error: null });

        const current: BrewLog = {
            coffeeId: 1, grinderId: 1, date: new Date().toISOString(),
            doseIn: 18, doseOut: 40, timeSeconds: 22,
            score: { body: 0, acidity: 8, bitterness: 3, tasteNotes: ['SOUR'] },
        };

        const result = await aiService.getStructuredAdvice(current, [], 'sweeter', {});

        expect(mock.functions.invoke).toHaveBeenCalledWith('brew-advice', expect.objectContaining({
            body: expect.objectContaining({ currentLog: current, goal: 'sweeter' }),
        }));
        expect(result.diagnosisLabel).toBe('under-extracted');
        expect(result.community).toEqual({ brewers: 3, shots: 12 });
    });

    // ─────────────────────────────────────────────────────────
    // Test 4: AIService reicht Server-Fehler als Exception durch.
    // ─────────────────────────────────────────────────────────
    test('AIService.getStructuredAdvice wirft bei Edge-Function-Fehler', async () => {
        mock.functions.invoke.mockResolvedValueOnce({ data: null, error: { message: 'Gemini 502: upstream' } });

        const current: BrewLog = {
            coffeeId: 1, grinderId: 1, date: new Date().toISOString(),
            doseIn: 18, doseOut: 36, timeSeconds: 30,
            score: { body: 1, acidity: 5, bitterness: 5, tasteNotes: [] },
        };

        await expect(aiService.getStructuredAdvice(current, [], undefined, {})).rejects.toThrow('Gemini 502: upstream');
    });

});
