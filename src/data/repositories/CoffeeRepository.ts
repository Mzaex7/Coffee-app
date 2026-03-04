import { databaseService } from '../../domain/services/DatabaseService';
import { Coffee } from '../../domain/entities/Coffee';

export class CoffeeRepository {
    async getAll(userId?: number): Promise<Coffee[]> {
        const db = databaseService.getDatabase();
        if (userId) {
            return await db.getAllAsync<Coffee>('SELECT * FROM coffees WHERE user_id = ?', [userId]);
        }
        return await db.getAllAsync<Coffee>('SELECT * FROM coffees');
    }

    /** Get ALL coffees from ALL users — used by AI for cross-user analysis */
    async getAllGlobal(): Promise<Coffee[]> {
        const db = databaseService.getDatabase();
        return await db.getAllAsync<Coffee>('SELECT * FROM coffees');
    }

    async getById(id: number): Promise<Coffee | null> {
        const db = databaseService.getDatabase();
        return await db.getFirstAsync<Coffee>('SELECT * FROM coffees WHERE id = ?', [id]);
    }

    async create(coffee: Coffee): Promise<number> {
        const db = databaseService.getDatabase();
        const result = await db.runAsync(
            'INSERT INTO coffees (user_id, name, roastery, origin, variety, process, roast_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [coffee.userId || null, coffee.name, coffee.roastery, coffee.origin || null, coffee.variety || null, coffee.process || null, coffee.roastDate || null, coffee.notes || null]
        );
        return result.lastInsertRowId;
    }

    async delete(id: number): Promise<void> {
        const db = databaseService.getDatabase();
        await db.runAsync('DELETE FROM coffees WHERE id = ?', [id]);
    }
}
