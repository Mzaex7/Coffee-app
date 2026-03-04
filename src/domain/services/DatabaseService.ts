import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

// Web Adapter Interface to match expo-sqlite's basic usage
interface DBInterface {
    getAllAsync<T>(sql: string, params?: any[] | undefined): Promise<T[]>;
    getFirstAsync<T>(sql: string, params?: any[] | undefined): Promise<T | null>;
    runAsync(sql: string, params?: any[] | undefined): Promise<{ lastInsertRowId: number }>;
    execAsync(sql: string): Promise<void>;
}

class WebDatabaseAdapter implements DBInterface {
    async getAllAsync<T>(sql: string, params: any[] = []): Promise<T[]> {
        const table = this.getTableName(sql);
        if (!table) return [];
        const data = this.getData(table);

        // Extract WHERE conditions
        const conditions = this.parseWhereConditions(sql, params);
        if (conditions.length > 0) {
            return data.filter((item: any) => {
                return conditions.every(cond => item[cond.column] === cond.value);
            }) as T[];
        }

        return data as T[];
    }

    async getFirstAsync<T>(sql: string, params: any[] = []): Promise<T | null> {
        const rows = await this.getAllAsync<T>(sql, params);
        return rows.length > 0 ? rows[0] : null;
    }

    async runAsync(sql: string, params: any[] = []): Promise<{ lastInsertRowId: number }> {
        const table = this.getTableName(sql);
        if (!table) return { lastInsertRowId: 0 };

        const operation = sql.split(' ')[0].toUpperCase();
        let data = this.getData(table);
        let lastId = 0;

        if (operation === 'INSERT') {
            lastId = this.getLastId(table) + 1;
            const newItem: any = { id: lastId };

            // Extract columns: find the FIRST parenthesized group AFTER the table name
            // SQL: INSERT INTO table_name (col1, col2, ...) VALUES (?, ?, ...)
            const afterTable = sql.substring(sql.toLowerCase().indexOf(table.toLowerCase()) + table.length);
            const columnsMatch = afterTable.match(/\(([^)]+)\)/);
            if (columnsMatch) {
                const columns = columnsMatch[1].split(',').map(c => c.trim());
                columns.forEach((col, index) => {
                    if (index < params.length) {
                        newItem[col] = params[index];
                    }
                });
            }
            data.push(newItem);
            this.saveData(table, data);
            this.saveLastId(table, lastId);
        } else if (operation === 'DELETE') {
            const conditions = this.parseWhereConditions(sql, params);
            if (conditions.length > 0) {
                data = data.filter((item: any) =>
                    !conditions.every(cond => item[cond.column] === cond.value)
                );
                this.saveData(table, data);
            } else {
                // DELETE FROM table (no WHERE) — wipe all rows and reset counter
                this.saveData(table, []);
                this.saveLastId(table, 0);
            }
        } else if (operation === 'UPDATE') {
            // Not implemented yet
        }

        return { lastInsertRowId: lastId };
    }

    async execAsync(_sql: string): Promise<void> {
        // Initialize empty arrays in localStorage if missing
        if (!localStorage.getItem('users')) localStorage.setItem('users', '[]');
        if (!localStorage.getItem('coffees')) localStorage.setItem('coffees', '[]');
        if (!localStorage.getItem('grinders')) localStorage.setItem('grinders', '[]');
        if (!localStorage.getItem('brew_logs')) localStorage.setItem('brew_logs', '[]');
    }

    /**
     * Parse simple WHERE conditions from SQL.
     * Supports: WHERE col1 = ? AND col2 = ?
     */
    private parseWhereConditions(sql: string, params: any[]): { column: string; value: any }[] {
        const conditions: { column: string; value: any }[] = [];
        const whereMatch = sql.toLowerCase().indexOf('where');
        if (whereMatch === -1 || params.length === 0) return conditions;

        const wherePart = sql.substring(whereMatch);
        const condRegex = /(\w+)\s*=\s*\?/gi;
        let match;
        let paramIndex = 0;

        while ((match = condRegex.exec(wherePart)) !== null && paramIndex < params.length) {
            conditions.push({
                column: match[1],
                value: params[paramIndex],
            });
            paramIndex++;
        }

        return conditions;
    }

    private getTableName(sql: string): string | null {
        const match = sql.match(/(FROM|INTO|UPDATE)\s+(\w+)/i);
        return match ? match[2] : null;
    }

    private getData(table: string): any[] {
        const json = localStorage.getItem(table);
        if (!json) return [];
        try {
            const parsed = JSON.parse(json);
            if (!Array.isArray(parsed)) return [];
            // Filter out corrupt entries (must have an id)
            return parsed.filter((item: any) => item != null && typeof item === 'object' && item.id != null);
        } catch {
            // Corrupt localStorage — reset this table
            localStorage.removeItem(table);
            return [];
        }
    }

    private saveData(table: string, data: any[]) {
        localStorage.setItem(table, JSON.stringify(data));
    }

    private getLastId(table: string): number {
        const id = localStorage.getItem(`${table}_last_id`);
        return id ? parseInt(id, 10) || 0 : 0;
    }

    private saveLastId(table: string, id: number) {
        localStorage.setItem(`${table}_last_id`, id.toString());
    }
}

class DatabaseService {
    private static instance: DatabaseService;
    private db: DBInterface | null = null;

    private constructor() { }

    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    public async initialize(): Promise<void> {
        if (this.db) return;

        try {
            if (Platform.OS === 'web') {
                this.db = new WebDatabaseAdapter();
                await this.db.execAsync(''); // ensure tables init
            } else {
                this.db = await SQLite.openDatabaseAsync('coffee_app.db') as any;
                await this.migrate();
            }
        } catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }

    private async migrate(): Promise<void> {
        if (!this.db || Platform.OS === 'web') return;

        await this.db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS grinders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        brand TEXT,
        model TEXT,
        description TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS coffees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        roastery TEXT NOT NULL,
        origin TEXT,
        variety TEXT,
        process TEXT,
        roast_date TEXT,
        notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS brew_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        coffee_id INTEGER,
        grinder_id INTEGER,
        date TEXT NOT NULL,
        dose_in REAL NOT NULL,
        dose_out REAL NOT NULL,
        time_seconds REAL NOT NULL,
        temperature REAL,
        grind_setting TEXT,
        rating_body INTEGER,
        rating_acidity INTEGER,
        rating_bitterness INTEGER,
        taste_notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (coffee_id) REFERENCES coffees(id),
        FOREIGN KEY (grinder_id) REFERENCES grinders(id)
      );
    `);
    }

    public getDatabase(): DBInterface {
        if (!this.db) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.db;
    }

    public async nukeAllData(): Promise<void> {
        const db = this.getDatabase();
        await db.runAsync('DELETE FROM brew_logs');
        await db.runAsync('DELETE FROM coffees');
        await db.runAsync('DELETE FROM grinders');
    }
}

export const databaseService = DatabaseService.getInstance();
