import React, { useState } from 'react';
import { ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Box, Text, useTheme } from '../src/presentation/theme';
import { useAuth } from '../src/domain/context/AuthContext';
import { authService } from '../src/domain/services/AuthService';

/**
 * Set a new password. Reached via the password-reset email link
 * (PASSWORD_RECOVERY session) — AuthContext routes here automatically.
 */
export default function ResetPasswordScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setError('');
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }
        setSaving(true);
        try {
            await authService.updatePassword(password);
            router.replace('/(tabs)');
        } catch (e: any) {
            setError(e.message || 'Could not update the password.');
        } finally {
            setSaving(false);
        }
    };

    const inputStyle = {
        backgroundColor: 'transparent',
        color: theme.colors.textPrimary,
        paddingVertical: 14,
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surface,
    } as any;

    return (
        <Box flex={1} backgroundColor="mainBackground">
            <Stack.Screen options={{ headerShown: false }} />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 40, width: '100%', maxWidth: 480, alignSelf: 'center' }}
                    keyboardShouldPersistTaps="handled"
                >
                    <Box marginBottom="xl">
                        <Text variant="header" fontSize={30} color="primary" fontWeight="900" style={{ letterSpacing: -1 }}>
                            New password
                        </Text>
                        <Text variant="body" color="textSecondary" fontSize={13} style={{ opacity: 0.6, marginTop: 4 }}>
                            {user
                                ? 'Choose a new password for your account.'
                                : 'This link has expired or was already used. Request a new reset email from the sign-in screen.'}
                        </Text>
                    </Box>

                    {user && !isLoading ? (
                        <>
                            <Box marginBottom="l">
                                <TextInput
                                    style={inputStyle}
                                    placeholder="New password (min. 6 characters)"
                                    placeholderTextColor={theme.colors.textSecondary + '80'}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                                <View style={{ height: 20 }} />
                                <TextInput
                                    style={inputStyle}
                                    placeholder="Confirm new password"
                                    placeholderTextColor={theme.colors.textSecondary + '80'}
                                    value={confirm}
                                    onChangeText={setConfirm}
                                    secureTextEntry
                                />
                            </Box>

                            {error ? (
                                <Text variant="body" color="error" fontSize={13} marginBottom="m" style={{ opacity: 0.9 }}>
                                    {error}
                                </Text>
                            ) : null}

                            <TouchableOpacity
                                onPress={handleSave}
                                activeOpacity={0.8}
                                disabled={saving}
                                style={{
                                    backgroundColor: theme.colors.primary,
                                    paddingVertical: 16,
                                    borderRadius: 10,
                                    alignItems: 'center',
                                    opacity: saving ? 0.7 : 1,
                                }}
                            >
                                <Text variant="body" color="white" fontWeight="bold" fontSize={15}>
                                    {saving ? '...' : 'Save new password'}
                                </Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity onPress={() => router.replace('/auth')} style={{ alignItems: 'center' }}>
                            <Text variant="body" color="primary" fontWeight="bold">Back to sign in</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </Box>
    );
}
