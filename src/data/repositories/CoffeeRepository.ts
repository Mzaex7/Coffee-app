import { databaseService } from '../../domain/services/DatabaseService';
import { Coffee, RoastLevel } from '../../domain/entities/Coffee';

interface CoffeeRow {
    id: number;
    user_id: number | null;
    name: string;
    roastery: string;
    origin: string | null;
    variety: string | null;
    process: string | null;
    roast_level: string | null;
    roast_date: string | null;
    notes: string | null;
}

export class CoffeeRepository {
    async getAll(userId?: number): Promise<Coffee[]> {
        const db = databaseService.getDatabase();
        if (userId) {
            const rows = await db.getAllAsync<CoffeeRow>('SELECT * FROM coffees WHERE user_id = ?', [userId]);
            return rows.map(this.mapRow);
        }
        const rows = await db.getAllAsync<CoffeeRow>('SELECT * FROM coffees');
        return rows.map(this.mapRow);
    }

    /** Get ALL coffees from ALL users — used by AI for cross-user analysis */
    async getAllGlobal(): Promise<Coffee[]> {
        const db = databaseService.getDatabase();
        const rows = await db.getAllAsync<CoffeeRow>('SELECT * FROM coffees');
        return rows.map(this.mapRow);
    }

    async getById(id: number): Promise<Coffee | null> {
        const db = databaseService.getDatabase();
        const row = await db.getFirstAsync<CoffeeRow>('SELECT * FROM coffees WHERE id = ?', [id]);
        return row ? this.mapRow(row) : null;
    }

    async create(coffee: Coffee): Promise<number> {
        const db = databaseService.getDatabase();
        const result = await db.runAsync(
            'INSERT INTO coffees (user_id, name, roastery, origin, variety, process, roast_level, roast_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                coffee.userId || null, coffee.name, coffee.roastery,
                coffee.origin || null, coffee.variety || null, coffee.process || null,
                coffee.roastLevel || null, coffee.roastDate || null, coffee.notes || null,
            ]
        );
        return result.lastInsertRowId;
    }

    async update(coffee: Coffee): Promise<void> {
        if (!coffee.id) throw new Error('Coffee ID required for update');
        const db = databaseService.getDatabase();
        await db.runAsync(
            'UPDATE coffees SET name = ?, roastery = ?, origin = ?, variety = ?, process = ?, roast_level = ?, roast_date = ?, notes = ? WHERE id = ?',
            [
                coffee.name, coffee.roastery, coffee.origin || null, coffee.variety || null,
                coffee.process || null, coffee.roastLevel || null, coffee.roastDate || null,
                coffee.notes || null, coffee.id,
            ]
        );
    }

    async delete(id: number): Promise<void> {
        const db = databaseService.getDatabase();
        await db.runAsync('DELETE FROM coffees WHERE id = ?', [id]);
    }

    private mapRow(row: CoffeeRow): Coffee {
        return {
            id: row.id,
            userId: row.user_id ?? undefined,
            name: row.name,
            roastery: row.roastery,
            origin: row.origin ?? undefined,
            variety: row.variety ?? undefined,
            process: row.process ?? undefined,
            roastLevel: (row.roast_level as RoastLevel) ?? undefined,
            roastDate: row.roast_date ?? undefined,
            notes: row.notes ?? undefined,
        };
    }
}
