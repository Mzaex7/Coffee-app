import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Box, Text, useTheme, radii } from '../src/presentation/theme';
import { Button } from '../src/presentation/components/Button';
import { Card } from '../src/presentation/components/Card';
import { SectionHeader } from '../src/presentation/components/SectionHeader';
import { useAuth } from '../src/domain/context/AuthContext';
import { databaseService } from '../src/domain/services/DatabaseService';
import { generateMockData } from '../src/utils/mockData';

const APP_VERSION = '2.0';

export default function SettingsScreen() {
    const theme = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, logout } = useAuth();
    const [busy, setBusy] = useState<'mock' | 'nuke' | null>(null);

    const handleLogout = () => {
        logout();
        router.replace('/auth');
    };

    const handleGenerate = async () => {
        if (!user?.id) return;
        setBusy('mock');
        try {
            await generateMockData(40, user.id);
            if (Platform.OS === 'web') alert('Added 40 sample brews.');
            else Alert.alert('Done', 'Added 40 sample brews.');
        } catch (e) {
            alert('Error generating data: ' + e);
        } finally {
            setBusy(null);
        }
    };

    const handleNuke = () => {
        const doNuke = async () => {
            setBusy('nuke');
            try {
                await databaseService.nukeAllData();
                if (Platform.OS === 'web') alert('All brews, beans and grinders cleared.');
                else Alert.alert('Cleared', 'All brews, beans and grinders cleared.');
            } finally {
                setBusy(null);
            }
        };
        if (Platform.OS === 'web') {
            if (confirm('Delete ALL brews, beans and grinders? This cannot be undone.')) doNuke();
        } else {
            Alert.alert('Clear all data', 'Delete ALL brews, beans and grinders? This cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete All', style: 'destructive', onPress: doNuke },
            ]);
        }
    };

    const initial = (user?.username?.[0] || '?').toUpperCase();

    return (
        <Box flex={1} backgroundColor="mainBackground">
            <Stack.Screen options={{ headerShown: false }} />

            {/* Crema header — explicit 40×40 back pill, optically-centered chevron. */}
            <Box
                flexDirection="row"
                alignItems="center"
                paddingHorizontal="m"
                style={{ paddingTop: (insets.top || 12) + 8, paddingBottom: 10 }}
            >
                <TouchableOpacity onPress={() => router.back()} activeOpacity={0.85} hitSlop={8}>
                    <Box
                        width={40}
                        height={40}
                        borderRadius={radii.full}
                        backgroundColor="cardElevated"
                        borderWidth={1}
                        borderColor="border"
                        alignItems="center"
                        justifyContent="center"
                    >
                        {/* Optical nudge: the chevron's visual mass sits right of geometric center, so shift -1px. */}
                        <Ionicons name="chevron-back" size={22} color={theme.colors.primary} style={{ marginLeft: -1 }} />
                    </Box>
                </TouchableOpacity>
                <Box flex={1} alignItems="center" style={{ marginLeft: -40 }} pointerEvents="none">
                    <Text color="textPrimary" style={{ fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.3 }}>Settings</Text>
                </Box>
            </Box>

            <ScrollView contentContainerStyle={{ padding: theme.spacing.m, paddingBottom: theme.spacing.xl }}>
                {/* Profile */}
                <Card padding="l">
                    <Box flexDirection="row" alignItems="center" gap="m">
                        <Box width={56} height={56} borderRadius={radii.full} backgroundColor="primaryMuted" alignItems="center" justifyContent="center">
                            <Text variant="subheader" color="primary">{initial}</Text>
                        </Box>
                        <Box flex={1}>
                            <Text variant="title">{user?.username || 'Guest'}</Text>
                            <Text variant="caption" color="textSecondary" marginTop="xs">Signed in</Text>
                        </Box>
                    </Box>
                </Card>

                <Box height={theme.spacing.l} />
                <SectionHeader title="Account" />
                <Button label="Log Out" variant="outline" onPress={handleLogout} icon={<Ionicons name="log-out-outline" size={18} color={theme.colors.primary} />} />

                <Box height={theme.spacing.l} />
                <SectionHeader title="Data" />
                <Card padding="m">
                    <Text variant="body" color="textSecondary" marginBottom="m">
                        Seed sample brews to explore the app, or clear everything to start fresh.
                    </Text>
                    <Button label="Add Sample Data" variant="outline" onPress={handleGenerate} loading={busy === 'mock'} disabled={busy !== null} />
                    <Box height={theme.spacing.s} />
                    <Button label="Clear All Data" variant="danger" onPress={handleNuke} loading={busy === 'nuke'} disabled={busy !== null} />
                </Card>

                <Box height={theme.spacing.l} />
                <SectionHeader title="About" />
                <Card padding="l">
                    <Text variant="subheader" color="primary">BrewRef</Text>
                    <Text variant="caption" color="textSecondary" marginTop="xs">Version {APP_VERSION}</Text>
                    <Text variant="body" color="textSecondary" marginTop="m">
                        A dialing-in companion for espresso lovers — track beans, freshness, recipes and the shots that nailed it.
                    </Text>
                </Card>
            </ScrollView>
        </Box>
    );
}
