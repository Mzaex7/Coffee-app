// URL polyfill must be imported before supabase-js on React Native.
import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
    // Surfaced once at startup so a missing .env is obvious in the logs.
    console.warn(
        '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Copy .env.example to .env and fill in your project values.',
    );
}

/**
 * Single shared Supabase client.
 *
 * - The anon key is safe to ship in the client bundle: Row Level Security on
 *   every table is what actually protects user data.
 * - On native we persist the session in AsyncStorage; on web supabase-js falls
 *   back to localStorage and handles the magic-link/redirect parsing itself.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // Only the web build parses the session out of the URL fragment.
        detectSessionInUrl: Platform.OS === 'web',
    },
});

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

// On native, token auto-refresh only runs reliably while the app is foregrounded.
// Tie it to AppState (Supabase-recommended pattern) so sessions stay fresh after
// long backgrounding instead of appearing expired.
if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
        if (state === 'active') supabase.auth.startAutoRefresh();
        else supabase.auth.stopAutoRefresh();
    });
}
