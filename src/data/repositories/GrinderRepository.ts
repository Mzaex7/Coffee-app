import { databaseService } from '../../domain/services/DatabaseService';
import { Grinder } from '../../domain/entities/Grinder';

export class GrinderRepository {
    async getAll(userId?: number): Promise<Grinder[]> {
        const db = databaseService.getDatabase();
        if (userId) {
            return await db.getAllAsync<Grinder>('SELECT * FROM grinders WHERE user_id = ?', [userId]);
        }
        return await db.getAllAsync<Grinder>('SELECT * FROM grinders');
    }

    /** Get ALL grinders from ALL users — used by AI for cross-user analysis */
    async getAllGlobal(): Promise<Grinder[]> {
        const db = databaseService.getDatabase();
        return await db.getAllAsync<Grinder>('SELECT * FROM grinders');
    }

    async getById(id: number): Promise<Grinder | null> {
        const db = databaseService.getDatabase();
        return await db.getFirstAsync<Grinder>('SELECT * FROM grinders WHERE id = ?', [id]);
    }

    async create(grinder: Grinder): Promise<number> {
        const db = databaseService.getDatabase();
        const result = await db.runAsync(
            'INSERT INTO grinders (user_id, name, brand, model, description) VALUES (?, ?, ?, ?, ?)',
            [grinder.userId || null, grinder.name, grinder.brand, grinder.model, grinder.description || null]
        );
        return result.lastInsertRowId;
    }

    async update(grinder: Grinder): Promise<void> {
        if (!grinder.id) throw new Error('Grinder ID required for update');
        const db = databaseService.getDatabase();
        await db.runAsync(
            'UPDATE grinders SET name = ?, brand = ?, model = ?, description = ? WHERE id = ?',
            [grinder.name, grinder.brand, grinder.model, grinder.description || null, grinder.id]
        );
    }

    async delete(id: number): Promise<void> {
        const db = databaseService.getDatabase();
        await db.runAsync('DELETE FROM grinders WHERE id = ?', [id]);
    }
}
