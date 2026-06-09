import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@shopify/restyle';
import theme from '../src/presentation/theme';
import { useColorScheme } from 'react-native';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../src/domain/context/AuthContext';
import { ActivityIndicator, View, Platform, useWindowDimensions } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';

function AppNavigator() {
    const { user, isLoading } = useAuth();

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
        </Stack>
    );
}

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const { width } = useWindowDimensions();
    // On native tablets (iPad) we center the app in a comfortable column instead
    // of stretching the phone layout across the full screen.
    const isTablet = Platform.OS !== 'web' && width >= 700;

    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_600SemiBold,
        Inter_700Bold,
        JetBrainsMono_400Regular,
    });

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
                            {/* Centered container: web preview + iPad use a column; phones go full-bleed. */}
                            <View style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? '#0E0E0E' : (isTablet ? '#000000' : theme.colors.mainBackground), alignItems: 'center', justifyContent: 'center' }}>
                                <View style={{
                                    flex: 1,
                                    width: '100%',
                                    maxWidth: Platform.OS === 'web' ? 500 : (isTablet ? 560 : '100%'),
                                    maxHeight: Platform.OS === 'web' ? '95%' : '100%',
                                    backgroundColor: theme.colors.mainBackground,
                                    borderRadius: Platform.OS === 'web' ? 20 : 0,
                                    overflow: 'hidden',
                                    ...(Platform.OS === 'web' ? {
                                        borderWidth: 1,
                                        borderColor: '#333',
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 10 },
                                        shadowOpacity: 0.5,
                                        shadowRadius: 20,
                                        paddingBottom: 0,
                                    } : {})
                                }}>
                                    <AppNavigator />
                                </View>
                            </View>
                            <StatusBar style="light" />
                        </AuthProvider>
                    </NavigationThemeProvider>
                </ThemeProvider>
            </GestureHandlerRootView>
        </SafeAreaProvider>
    );
}
