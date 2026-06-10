import React, { useState } from 'react';
import { ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Box, Text, useTheme } from '../src/presentation/theme';
import { useAuth } from '../src/domain/context/AuthContext';
import { authService } from '../src/domain/services/AuthService';
import { Stack, Redirect } from 'expo-router';

export default function AuthScreen() {
    const theme = useTheme();
    const { login, register, user, isLoading } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [loading, setLoading] = useState(false);

    // Redirect to dashboard if already logged in
    if (!isLoading && user) {
        return <Redirect href="/(tabs)" />;
    }

    const handleSubmit = async () => {
        setError('');
        setNotice('');
        setLoading(true);
        try {
            if (!email.trim() || !password) {
                throw new Error('Please enter email and password');
            }
            if (!isLogin) {
                if (password !== confirmPassword) {
                    throw new Error('Passwords do not match');
                }
                await register(email, password);
            } else {
                await login(email, password);
            }
        } catch (e: any) {
            // Email-confirmation projects throw a friendly "check your inbox" message
            // on register — surface it as a notice rather than an error.
            const msg = e.message || 'An error occurred';
            if (/confirm your email/i.test(msg)) setNotice(msg);
            else setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        setError('');
        setNotice('');
        if (!email.trim()) {
            setError('Enter your email above first, then tap "Forgot password?" again.');
            return;
        }
        try {
            await authService.requestPasswordReset(email);
            setNotice('Password reset link sent — check your inbox.');
        } catch (e: any) {
            setError(e.message || 'Could not send the reset email.');
        }
    };

    const handleResendConfirmation = async () => {
        setError('');
        try {
            await authService.resendConfirmation(email);
            setNotice('Confirmation email sent again — check your inbox (and spam).');
        } catch (e: any) {
            setError(e.message || 'Could not resend the confirmation email.');
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
                        width: '100%',
                        maxWidth: 480,
                        alignSelf: 'center',
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
                            placeholder="Email"
                            placeholderTextColor={theme.colors.textSecondary + '80'}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                            textContentType="emailAddress"
                        />

                        <View style={{ height: 20 }} />

                        <TextInput
                            style={inputStyle}
                            placeholder={isLogin ? 'Password' : 'Password (min. 6 characters)'}
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

                    {/* Notice (e.g. email confirmation) */}
                    {notice ? (
                        <Text variant="body" color="accent" fontSize={13} marginBottom="m" style={{ opacity: 0.95 }}>
                            {notice}
                        </Text>
                    ) : null}

                    {/* Resend confirmation — offered once the confirm-email notice appears */}
                    {notice && /confirm/i.test(notice) ? (
                        <TouchableOpacity onPress={handleResendConfirmation} style={{ marginBottom: 16 }}>
                            <Text variant="body" color="primary" fontSize={13} fontWeight="bold">
                                Resend confirmation email
                            </Text>
                        </TouchableOpacity>
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

                    {/* Forgot password — login mode only */}
                    {isLogin ? (
                        <TouchableOpacity onPress={handleForgotPassword} style={{ alignItems: 'center', marginBottom: 18 }}>
                            <Text variant="body" color="textSecondary" fontSize={13} style={{ opacity: 0.7 }}>
                                Forgot password?
                            </Text>
                        </TouchableOpacity>
                    ) : null}

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
