import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@shopify/restyle';
import theme from '../src/presentation/theme';
import { useColorScheme } from 'react-native';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';

import { AuthProvider, useAuth } from '../src/domain/context/AuthContext';
import { useEffect } from 'react';
import { ActivityIndicator, View, Platform, Dimensions } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';

function AppNavigator() {
    const { isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.colors.mainBackground, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: {
                    backgroundColor: theme.colors.mainBackground,
                },
            }}
        >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="reset-password" />
        </Stack>
    );
}

export default function RootLayout() {
    const colorScheme = useColorScheme();

    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_600SemiBold,
        Inter_700Bold,
        JetBrainsMono_400Regular,
    });

    // Phones stay portrait; tablets (iPad) may rotate freely — the adaptive
    // layout (useIsWide) re-flows on rotation and Split View resizes.
    useEffect(() => {
        if (Platform.OS === 'web') return;
        const { width, height } = Dimensions.get('screen');
        const isTabletDevice = Math.min(width, height) >= 600;
        if (isTabletDevice) {
            ScreenOrientation.unlockAsync().catch(() => { });
        } else {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => { });
        }
    }, []);

    if (!fontsLoaded) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.colors.mainBackground, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <ThemeProvider theme={theme}>
                    <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                        <AuthProvider>
                            {/* Full-bleed on every platform — screens center their own
                                content column on wide windows (iPad / desktop web). */}
                            <View style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
                                <AppNavigator />
                            </View>
                            <StatusBar style="light" />
                        </AuthProvider>
                    </NavigationThemeProvider>
                </ThemeProvider>
            </GestureHandlerRootView>
        </SafeAreaProvider>
    );
}
