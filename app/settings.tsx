import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, Alert, Platform, Switch } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Box, Text, useTheme, radii } from '../src/presentation/theme';
import { Button } from '../src/presentation/components/Button';
import { Card } from '../src/presentation/components/Card';
import { SectionHeader } from '../src/presentation/components/SectionHeader';
import { useAuth } from '../src/domain/context/AuthContext';
import { supabase } from '../src/data/supabase';
import { generateMockData, clearAllData } from '../src/utils/mockData';

const APP_VERSION = '3.0';

export default function SettingsScreen() {
    const theme = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, logout } = useAuth();
    const [busy, setBusy] = useState<'mock' | 'nuke' | null>(null);
    const [shareBrews, setShareBrews] = useState(true);
    const [shareLoading, setShareLoading] = useState(true);

    // Load the user's community-sharing preference.
    useEffect(() => {
        let active = true;
        (async () => {
            if (!user?.id) return;
            const { data } = await supabase.from('profiles').select('share_brews').eq('id', user.id).maybeSingle();
            if (active && data) setShareBrews(data.share_brews ?? true);
            if (active) setShareLoading(false);
        })();
        return () => { active = false; };
    }, [user?.id]);

    const toggleShare = async (value: boolean) => {
        if (!user?.id) return;
        setShareBrews(value); // optimistic
        const { error } = await supabase.from('profiles').update({ share_brews: value }).eq('id', user.id);
        if (error) setShareBrews(!value); // revert on failure
    };

    const handleLogout = async () => {
        await logout();
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
            if (!user?.id) return;
            setBusy('nuke');
            try {
                await clearAllData(user.id);
                if (Platform.OS === 'web') alert('All brews, beans and grinders cleared.');
                else Alert.alert('Cleared', 'All brews, beans and grinders cleared.');
            } finally {
                setBusy(null);
            }
        };
        if (Platform.OS === 'web') {
            if (confirm('Delete ALL your brews, beans and grinders? This cannot be undone.')) doNuke();
        } else {
            Alert.alert('Clear all data', 'Delete ALL your brews, beans and grinders? This cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete All', style: 'destructive', onPress: doNuke },
            ]);
        }
    };

    const displayName = user?.username || user?.email?.split('@')[0] || 'Guest';
    const initial = (displayName[0] || '?').toUpperCase();

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
                            <Text variant="title">{displayName}</Text>
                            <Text variant="caption" color="textSecondary" marginTop="xs">{user?.email || 'Signed in'}</Text>
                        </Box>
                    </Box>
                </Card>

                <Box height={theme.spacing.l} />
                <SectionHeader title="Community" />
                <Card padding="m">
                    <Box flexDirection="row" alignItems="center" gap="m">
                        <Box flex={1}>
                            <Text variant="body" color="textPrimary" style={{ fontFamily: 'Inter_600SemiBold' }}>Share my brews</Text>
                            <Text variant="caption" color="textSecondary" marginTop="xs">
                                Contribute your shots anonymously so the Brew Doctor can compare notes across everyone brewing the same bean. Only aggregated numbers are ever shared — never your identity.
                            </Text>
                        </Box>
                        <Switch
                            value={shareBrews}
                            onValueChange={toggleShare}
                            disabled={shareLoading}
                            trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
                            thumbColor={'#fff'}
                        />
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
                        A dialing-in companion for espresso lovers — track beans, freshness, recipes and the shots that nailed it, with AI advice informed by the whole community.
                    </Text>
                </Card>
            </ScrollView>
        </Box>
    );
}
