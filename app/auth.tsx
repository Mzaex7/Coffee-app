import React, { useState } from 'react';
import { ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Box, Text, useTheme } from '../src/presentation/theme';
import { useAuth } from '../src/domain/context/AuthContext';
import { Stack, Redirect } from 'expo-router';

export default function AuthScreen() {
    const theme = useTheme();
    const { login, register, user, isLoading } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Redirect to dashboard if already logged in
    if (!isLoading && user) {
        return <Redirect href="/(tabs)" />;
    }

    const handleSubmit = async () => {
        setError('');
        setLoading(true);
        try {
            if (!username.trim() || !password) {
                throw new Error('Please enter username and password');
            }
            if (!isLogin) {
                if (password !== confirmPassword) {
                    throw new Error('Passwords do not match');
                }
                await register(username, password);
            } else {
                await login(username, password);
            }
        } catch (e: any) {
            setError(e.message || 'An error occurred');
        } finally {
            setLoading(false);
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
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={{
                        flexGrow: 1,
                        justifyContent: 'center',
                        paddingHorizontal: 40,
                    }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Branding — just the name */}
                    <Box marginBottom="xl">
                        <Text
                            variant="header"
                            fontSize={42}
                            color="primary"
                            fontWeight="900"
                            style={{ letterSpacing: -1.5 }}
                        >
                            BrewRef
                        </Text>
                        <Text
                            variant="body"
                            color="textSecondary"
                            fontSize={13}
                            style={{ opacity: 0.5, marginTop: 2 }}
                        >
                            {isLogin ? 'Welcome back.' : 'Create your account.'}
                        </Text>
                    </Box>

                    {/* Fields */}
                    <Box marginBottom="l">
                        <TextInput
                            style={inputStyle}
                            placeholder="Username"
                            placeholderTextColor={theme.colors.textSecondary + '80'}
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                        <View style={{ height: 20 }} />

                        <TextInput
                            style={inputStyle}
                            placeholder="Password"
                            placeholderTextColor={theme.colors.textSecondary + '80'}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />

                        {!isLogin && (
                            <>
                                <View style={{ height: 20 }} />
                                <TextInput
                                    style={inputStyle}
                                    placeholder="Confirm password"
                                    placeholderTextColor={theme.colors.textSecondary + '80'}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry
                                />
                            </>
                        )}
                    </Box>

                    {/* Error */}
                    {error ? (
                        <Text variant="body" color="error" fontSize={13} marginBottom="m" style={{ opacity: 0.9 }}>
                            {error}
                        </Text>
                    ) : null}

                    {/* Submit */}
                    <TouchableOpacity
                        onPress={handleSubmit}
                        activeOpacity={0.8}
                        style={{
                            backgroundColor: theme.colors.primary,
                            paddingVertical: 16,
                            borderRadius: 10,
                            alignItems: 'center',
                            marginBottom: 24,
                        }}
                    >
                        <Text
                            variant="body"
                            color="white"
                            fontWeight="bold"
                            fontSize={15}
                        >
                            {loading ? '...' : (isLogin ? 'Login' : 'Create Account')}
                        </Text>
                    </TouchableOpacity>

                    {/* Toggle */}
                    <TouchableOpacity
                        onPress={() => { setIsLogin(!isLogin); setError(''); }}
                        style={{ alignItems: 'center' }}
                    >
                        <Text variant="body" color="textSecondary" fontSize={13} style={{ opacity: 0.6 }}>
                            {isLogin ? "Don't have an account? " : 'Already have an account? '}
                            <Text color="primary" fontWeight="bold">
                                {isLogin ? 'Register' : 'Login'}
                            </Text>
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </Box>
    );
}
