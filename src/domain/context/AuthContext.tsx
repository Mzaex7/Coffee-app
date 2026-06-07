import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../entities/User';
import { authService } from '../services/AuthService';
import { supabase } from '../../data/supabase';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    /** Sign in with email + password. */
    login: (email: string, password: string) => Promise<void>;
    /** Register with email + password (optional display username). */
    register: (email: string, password: string, username?: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    login: async () => { },
    register: async () => { },
    logout: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Restore any persisted session on startup.
        supabase.auth.getSession()
            .then(({ data }) => setUser(authService.toUser(data.session?.user)))
            .catch((e) => console.error('Failed to restore session:', e))
            .finally(() => setIsLoading(false));

        // Keep React state in sync with sign-in / sign-out / token refresh.
        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(authService.toUser(session?.user));
            setIsLoading(false);
        });

        return () => sub.subscription.unsubscribe();
    }, []);

    // Note: we set state from onAuthStateChange (single source of truth), but
    // also set eagerly here so callers awaiting login() see the user immediately.
    const login = useCallback(async (email: string, password: string) => {
        const u = await authService.login(email, password);
        setUser(u);
    }, []);

    const register = useCallback(async (email: string, password: string, username?: string) => {
        const u = await authService.register(email, password, username);
        setUser(u);
    }, []);

    const logout = useCallback(async () => {
        await authService.logout();
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
