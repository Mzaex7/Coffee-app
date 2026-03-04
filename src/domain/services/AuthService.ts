import { databaseService } from './DatabaseService';
import { User } from '../entities/User';
import { Platform } from 'react-native';

/**
 * AuthService — local-only authentication using SHA-256 hashed passwords.
 * Persists login state in localStorage (web) or a simple in-memory flag (native).
 */
class AuthService {
    private static instance: AuthService;
    private currentUser: User | null = null;

    private constructor() { }

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    /**
     * Hash a password using SHA-256 via SubtleCrypto (available in both web and RN).
     */
    private async hashPassword(password: string): Promise<string> {
        // Use a simple hash approach that works cross-platform
        // For web: use SubtleCrypto. For native: a simple fallback.
        if (typeof globalThis.crypto?.subtle !== 'undefined') {
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }
        // Fallback: simple hash for environments without SubtleCrypto
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16).padStart(8, '0');
    }

    /**
     * Register a new user. Throws if username already exists.
     */
    async register(username: string, password: string): Promise<User> {
        const db = databaseService.getDatabase();
        const trimmedUsername = username.trim().toLowerCase();

        if (!trimmedUsername || !password) {
            throw new Error('Username and password are required');
        }
        if (password.length < 4) {
            throw new Error('Password must be at least 4 characters');
        }

        // Check if username exists
        const existing = await db.getFirstAsync<{ id: number }>(
            'SELECT id FROM users WHERE username = ?',
            [trimmedUsername]
        );
        if (existing) {
            throw new Error('Username already exists');
        }

        const passwordHash = await this.hashPassword(password);
        const now = new Date().toISOString();

        const result = await db.runAsync(
            'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)',
            [trimmedUsername, passwordHash, now]
        );

        const user: User = {
            id: result.lastInsertRowId,
            username: trimmedUsername,
            passwordHash,
            createdAt: now,
        };

        this.currentUser = user;
        this.persistLoginState(user.id!);

        return user;
    }

    /**
     * Login with username and password. Throws if credentials are invalid.
     */
    async login(username: string, password: string): Promise<User> {
        const db = databaseService.getDatabase();
        const trimmedUsername = username.trim().toLowerCase();

        const passwordHash = await this.hashPassword(password);

        const row = await db.getFirstAsync<{
            id: number;
            username: string;
            password_hash: string;
            created_at: string;
        }>(
            'SELECT * FROM users WHERE username = ? AND password_hash = ?',
            [trimmedUsername, passwordHash]
        );

        if (!row) {
            throw new Error('Invalid username or password');
        }

        const user: User = {
            id: row.id,
            username: row.username,
            passwordHash: row.password_hash,
            createdAt: row.created_at,
        };

        this.currentUser = user;
        this.persistLoginState(user.id!);

        return user;
    }

    /**
     * Logout the current user.
     */
    logout(): void {
        this.currentUser = null;
        this.clearLoginState();
    }

    /**
     * Get the currently logged-in user, or null.
     */
    getCurrentUser(): User | null {
        return this.currentUser;
    }

    /**
     * Try to restore login state from persisted storage on app startup.
     */
    async tryRestoreSession(): Promise<User | null> {
        const userId = this.getPersistedUserId();
        if (!userId) return null;

        const db = databaseService.getDatabase();
        const row = await db.getFirstAsync<{
            id: number;
            username: string;
            password_hash: string;
            created_at: string;
        }>(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );

        if (!row) {
            this.clearLoginState();
            return null;
        }

        const user: User = {
            id: row.id,
            username: row.username,
            passwordHash: row.password_hash,
            createdAt: row.created_at,
        };

        this.currentUser = user;
        return user;
    }

    private persistLoginState(userId: number): void {
        try {
            if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
                localStorage.setItem('brewref_logged_in_user', userId.toString());
            }
        } catch { }
    }

    private clearLoginState(): void {
        try {
            if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
                localStorage.removeItem('brewref_logged_in_user');
            }
        } catch { }
    }

    private getPersistedUserId(): number | null {
        try {
            if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
                const val = localStorage.getItem('brewref_logged_in_user');
                return val ? parseInt(val, 10) : null;
            }
        } catch { }
        return null;
    }
}

export const authService = AuthService.getInstance();
