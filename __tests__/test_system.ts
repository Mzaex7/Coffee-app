/**
 * ============================================================
 *  test_system.ts — Systemtest (1 Test)
 * ============================================================
 *
 * Testet den vollständigen technischen Ablauf über alle Schichten:
 * Domain (BrewBuilder) → Data (BrewRepository) → Supabase-Client.
 *
 * Nur die Infrastrukturebene (Supabase-Client) wird durch ein
 * In-Memory-Mock ersetzt — der restliche Durchstich ist echt.
 *
 * Framework: Jest + ts-jest
 */

jest.mock('../src/data/supabase', () => {
    const { createMockSupabase } = require('./helpers/MockSupabase');
    return { supabase: createMockSupabase(), hasSupabaseConfig: true };
});

import { supabase } from '../src/data/supabase';
import { BrewBuilder } from '../src/domain/builders/BrewBuilder';
import { CoffeeRepository } from '../src/data/repositories/CoffeeRepository';
import { GrinderRepository } from '../src/data/repositories/GrinderRepository';
import { BrewRepository } from '../src/data/repositories/BrewRepository';

const mock = supabase as unknown as import('./helpers/MockSupabase').MockSupabase;

describe('Systemtest — Vollständiger Brew-Logging-Workflow', () => {

    beforeEach(() => {
        mock.__reset();
    });

    // ─────────────────────────────────────────────────────────
    // Use Case: Benutzer legt Kaffee + Mühle an, erstellt einen
    //           Brew via Builder, speichert ihn und ruft ihn ab.
    //
    // Schichten: BrewBuilder (Domain)
    //          → CoffeeRepository / GrinderRepository / BrewRepository (Data)
    //          → Supabase-Client (Mock, Infrastruktur)
    // ─────────────────────────────────────────────────────────
    test('Brew erstellen, persistieren und abrufen — alle Felder konsistent', async () => {
        const coffeeRepo = new CoffeeRepository();
        const grinderRepo = new GrinderRepository();
        const brewRepo = new BrewRepository();

        const coffeeId = await coffeeRepo.create({
            name: 'Colombia Huila',
            roastery: 'Five Elephant',
            origin: 'Colombia',
            variety: 'Caturra',
            process: 'Washed',
        });

        const grinderId = await grinderRepo.create({
            name: 'Comandante C40',
            brand: 'Comandante',
            model: 'C40 MK4',
        });

        const brew = new BrewBuilder()
            .setEquipment(coffeeId, grinderId)
            .setRecipe(18, 36, 28, 93)
            .setGrindSetting('22 Clicks')
            .setScore({ body: 1, acidity: 7, bitterness: 3, tasteNotes: ['Jasmine', 'Peach'] })
            .build();

        const brewId = await brewRepo.create(brew);
        const allBrews = await brewRepo.getAll();

        expect(allBrews).toHaveLength(1);

        const savedBrew = allBrews[0];
        expect(savedBrew.id).toBe(brewId);
        expect(savedBrew.coffeeId).toBe(coffeeId);
        expect(savedBrew.grinderId).toBe(grinderId);
        expect(savedBrew.doseIn).toBe(18);
        expect(savedBrew.doseOut).toBe(36);
        expect(savedBrew.timeSeconds).toBe(28);
        expect(savedBrew.temperature).toBe(93);
        expect(savedBrew.grindSetting).toBe('22 Clicks');
        expect(savedBrew.score.body).toBe(1);
        expect(savedBrew.score.acidity).toBe(7);
        expect(savedBrew.score.bitterness).toBe(3);
        expect(savedBrew.score.tasteNotes).toEqual(['Jasmine', 'Peach']);
    });

});
