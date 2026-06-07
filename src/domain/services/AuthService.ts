import { supabase } from '../../data/supabase';
import { User } from '../entities/User';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

/**
 * AuthService — thin wrapper over Supabase Auth (email + password).
 *
 * Replaces the old local SHA-256 scheme. Session persistence, token refresh and
 * restore-on-startup are all handled by the Supabase client (see data/supabase.ts);
 * AuthContext subscribes to onAuthStateChange for live updates.
 */
class AuthService {
    private static instance: AuthService;
    private constructor() { }

    public static getInstance(): AuthService {
        if (!AuthService.instance) AuthService.instance = new AuthService();
        return AuthService.instance;
    }

    /** Map a Supabase user into our domain User. */
    public toUser(u: SupabaseUser | null | undefined): User | null {
        if (!u) return null;
        return {
            id: u.id,
            email: u.email ?? undefined,
            username: (u.user_metadata?.username as string | undefined) ?? u.email?.split('@')[0],
            createdAt: u.created_at,
        };
    }

    /** Register with email + password. A username can be carried in metadata. */
    async register(email: string, password: string, username?: string): Promise<User> {
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: username ? { data: { username: username.trim() } } : undefined,
        });
        if (error) throw new Error(this.friendly(error.message));
        const user = this.toUser(data.user);
        if (!user) {
            // Email confirmation is enabled on the project — no session yet.
            throw new Error('Check your inbox to confirm your email, then sign in.');
        }
        return user;
    }

    /** Sign in with email + password. */
    async login(email: string, password: string): Promise<User> {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });
        if (error) throw new Error(this.friendly(error.message));
        const user = this.toUser(data.user);
        if (!user) throw new Error('Sign-in failed. Please try again.');
        return user;
    }

    async logout(): Promise<void> {
        await supabase.auth.signOut();
    }

    /** Current session's user, or null. */
    async getCurrentUser(): Promise<User | null> {
        const { data } = await supabase.auth.getSession();
        return this.toUser(data.session?.user);
    }

    async getSession(): Promise<Session | null> {
        const { data } = await supabase.auth.getSession();
        return data.session;
    }

    private friendly(message: string): string {
        const m = message.toLowerCase();
        if (m.includes('invalid login')) return 'Invalid email or password.';
        if (m.includes('already registered') || m.includes('already been registered')) {
            return 'That email is already registered. Try signing in.';
        }
        if (m.includes('password should be')) return 'Password must be at least 6 characters.';
        return message;
    }
}

export const authService = AuthService.getInstance();
