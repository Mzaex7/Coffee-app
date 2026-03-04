import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../entities/User';
import { authService } from '../services/AuthService';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    login: async () => { },
    register: async () => { },
    logout: () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const restoreSession = async () => {
            try {
                const restoredUser = await authService.tryRestoreSession();
                setUser(restoredUser);
            } catch (e) {
                console.error('Failed to restore session:', e);
            } finally {
                setIsLoading(false);
            }
        };
        restoreSession();
    }, []);

    const login = useCallback(async (username: string, password: string) => {
        const loggedInUser = await authService.login(username, password);
        setUser(loggedInUser);
    }, []);

    const register = useCallback(async (username: string, password: string) => {
        const newUser = await authService.register(username, password);
        setUser(newUser);
    }, []);

    const logout = useCallback(() => {
        authService.logout();
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
