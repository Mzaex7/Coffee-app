import { BrewRepository } from '../data/repositories/BrewRepository';
import { BrewLog } from '../domain/entities/BrewLog';
import { Coffee } from '../domain/entities/Coffee';
import { CoffeeRepository } from '../data/repositories/CoffeeRepository';
import { GrinderRepository } from '../data/repositories/GrinderRepository';

const daysAgoISO = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
};

const SAMPLE_COFFEES: Omit<Coffee, 'id' | 'userId'>[] = [
    { name: 'Ethiopia Sidamo', roastery: 'The Barn', origin: 'Ethiopia', variety: 'Heirloom', process: 'Washed', roastLevel: 'Light', roastDate: daysAgoISO(8), notes: 'Jasmine, bergamot, peach' },
    { name: 'Colombia Huila', roastery: 'Five Elephant', origin: 'Colombia', variety: 'Caturra', process: 'Washed', roastLevel: 'Medium', roastDate: daysAgoISO(14), notes: 'Red apple, caramel, cocoa' },
    { name: 'Brazil Cerrado', roastery: 'Square Mile', origin: 'Brazil', variety: 'Yellow Bourbon', process: 'Natural', roastLevel: 'Medium-Dark', roastDate: daysAgoISO(30), notes: 'Hazelnut, milk chocolate' },
];

export const generateMockData = async (count: number = 50, userId?: number) => {
    const brewRepo = new BrewRepository();
    const coffeeRepo = new CoffeeRepository();
    const grinderRepo = new GrinderRepository();

    // Ensure we have a varied set of coffees.
    let coffees = userId ? await coffeeRepo.getAll(userId) : await coffeeRepo.getAll();
    if (coffees.length === 0) {
        for (const c of SAMPLE_COFFEES) {
            await coffeeRepo.create({ ...c, userId });
        }
        coffees = userId ? await coffeeRepo.getAll(userId) : await coffeeRepo.getAll();
    }

    let grinders = userId ? await grinderRepo.getAll(userId) : await grinderRepo.getAll();
    if (grinders.length === 0) {
        await grinderRepo.create({ userId, name: 'Niche Zero', brand: 'Niche', model: 'Zero', description: 'Single-dose conical burr grinder' });
        grinders = userId ? await grinderRepo.getAll(userId) : await grinderRepo.getAll();
    }

    const grinderId = grinders[0].id;
    if (!grinderId) throw new Error('Failed to get grinder ID for mock data generation');

    const baseRecipe = { doseIn: 18, doseOut: 36, time: 30, temp: 93, grind: 15 };

    for (let i = 0; i < count; i++) {
        const coffee = coffees[i % coffees.length];
        if (!coffee.id) continue;

        const doseIn = baseRecipe.doseIn + (Math.random() - 0.5) * 0.5;
        const doseOut = baseRecipe.doseOut + (Math.random() - 0.5) * 5;

        // Finer grind (lower number) -> slower flow (higher time)
        const grindOffset = (Math.random() - 0.5) * 10;
        const grindSetting = (baseRecipe.grind + grindOffset).toFixed(1);
        const timeBase = baseRecipe.time - grindOffset * 2;
        const time = timeBase + (Math.random() - 0.5) * 4;
        const temp = baseRecipe.temp + Math.floor((Math.random() - 0.5) * 2);

        let body = 1;
        let acidity = 5;
        let bitterness = 5;
        let rating = 4;
        const notes: string[] = [];

        const ratio = doseOut / doseIn;
        if (ratio < 1.8) {
            body = 2;
            acidity = Math.min(10, 7 + Math.random() * 2);
            rating = 2 + Math.round(Math.random());
            notes.push('SOUR', 'SALTY');
        } else if (ratio > 2.5) {
            body = 0;
            bitterness = Math.min(10, 7 + Math.random() * 2);
            rating = 2 + Math.round(Math.random());
            notes.push('BITTER', 'DRY', 'ASTRINGENT');
        } else {
            body = 1;
            acidity = 4 + Math.random() * 4;
            bitterness = 4 + Math.random() * 4;
            rating = 4 + Math.round(Math.random());
            notes.push('SWEET', 'FRUITY', 'CHOCOLATE');
        }

        if (Math.random() > 0.7) notes.push('FLORAL');
        if (Math.random() > 0.7) notes.push('NUTTY');

        const brew: Omit<BrewLog, 'id'> = {
            userId,
            date: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30).toISOString(),
            coffeeId: coffee.id,
            grinderId,
            doseIn: parseFloat(doseIn.toFixed(1)),
            doseOut: parseFloat(doseOut.toFixed(1)),
            timeSeconds: parseFloat(time.toFixed(1)),
            temperature: temp,
            grindSetting,
            rating: Math.min(5, rating),
            score: {
                body,
                acidity: Math.round(acidity),
                bitterness: Math.round(bitterness),
                tasteNotes: notes,
            },
        };

        await brewRepo.create(brew);
    }
    console.log(`Generated ${count} mock brew logs.`);
};
