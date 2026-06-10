import React, { useState, useCallback } from 'react';
import { Box, Text, useTheme, radii, useIsWide, contentColumn } from '../../src/presentation/theme';
import { RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { BrewRepository } from '../../src/data/repositories/BrewRepository';
import { CoffeeRepository } from '../../src/data/repositories/CoffeeRepository';
import { BrewLog } from '../../src/domain/entities/BrewLog';
import { Coffee } from '../../src/domain/entities/Coffee';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/presentation/components/Button';
import { StatCard } from '../../src/presentation/components/StatCard';
import { ActivityChart } from '../../src/presentation/components/ActivityChart';
import { ScreenHeader } from '../../src/presentation/components/ScreenHeader';
import { useAuth } from '../../src/domain/context/AuthContext';
import { formatRatio } from '../../src/utils/brewMetrics';
import { getFreshness } from '../../src/utils/freshness';

const ACTIVITY_DAYS = 14;

const MONO = 'JetBrainsMono_400Regular';

const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

export default function DashboardScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { user } = useAuth();
    const isWide = useIsWide();

    const [brews, setBrews] = useState<BrewLog[]>([]);
    const [coffees, setCoffees] = useState<Coffee[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        if (!user?.id) return;
        const allBrews = await new BrewRepository().getAll(user.id);
        allBrews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setBrews(allBrews);
        setCoffees(await new CoffeeRepository().getAll(user.id));
    };

    useFocusEffect(useCallback(() => { loadData(); }, [user?.id]));

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const coffeeById: Record<number, Coffee> = {};
    coffees.forEach(c => { if (c.id) coffeeById[c.id] = c; });

    const lastBrew = brews[0] ?? null;
    const lastBrewCoffee = lastBrew ? coffeeById[lastBrew.coffeeId] : undefined;
    const lastFresh = getFreshness(lastBrewCoffee?.roastDate);

    const ratedBrews = brews.filter(b => (b.rating ?? 0) > 0);
    const avgRating = ratedBrews.length
        ? (ratedBrews.reduce((s, b) => s + (b.rating ?? 0), 0) / ratedBrews.length)
        : 0;

    // Most-logged coffee → "dial in again" suggestion.
    const coffeeCounts: Record<number, number> = {};
    brews.forEach(b => { coffeeCounts[b.coffeeId] = (coffeeCounts[b.coffeeId] || 0) + 1; });
    let topCoffeeName = '';
    let topMax = 0;
    Object.entries(coffeeCounts).forEach(([id, count]) => {
        if (count > topMax) { topMax = count; topCoffeeName = coffeeById[Number(id)]?.name || ''; }
    });

    // 14-day activity (oldest → newest)
    const activity = new Array(ACTIVITY_DAYS).fill(0);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    brews.forEach(b => {
        const d = new Date(b.date);
        d.setHours(0, 0, 0, 0);
        const daysAgo = Math.floor((startOfToday.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (daysAgo >= 0 && daysAgo < ACTIVITY_DAYS) activity[ACTIVITY_DAYS - 1 - daysAgo] += 1;
    });
    const weekCount = activity.reduce((s, v) => s + v, 0);

    // Hero meta strings
    let heroDate = '';
    if (lastBrew) {
        const d = new Date(lastBrew.date);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const bd = new Date(lastBrew.date); bd.setHours(0, 0, 0, 0);
        heroDate = bd.getTime() === today.getTime()
            ? `Today · ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
            : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    }
    const heroRight = lastBrew
        ? [lastBrew.grindSetting ? `Grind ${lastBrew.grindSetting}` : null, lastBrew.temperature ? `${lastBrew.temperature}°` : null]
            .filter(Boolean).join(' · ')
        : '';

    const monoLabel = (t: string, color: 'primary' | 'textTertiary' | 'textSecondary' = 'textTertiary') => (
        <Text style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1 }} color={color} textTransform="uppercase">{t}</Text>
    );

    const Metric = ({ v, l }: { v: string; l: string }) => (
        <Box>
            <Text color="textPrimary" style={{ fontFamily: MONO, fontSize: 19, fontWeight: '600' }}>{v}</Text>
            {monoLabel(l)}
        </Box>
    );

    // Sections as elements so the wide (iPad/desktop) layout can re-arrange
    // them into two columns: hero + dial-in left, stats + activity right.
    const heroEl = lastBrew ? (
        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/(tabs)/history')}>
            <Box backgroundColor="cardElevated" borderRadius={radii.xl} borderWidth={1} borderColor="border" padding="m">
                <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                    {monoLabel(`Last shot · ${heroDate}`, 'primary')}
                    {heroRight ? <Text style={{ fontFamily: MONO, fontSize: 12 }} color="textSecondary">{heroRight}</Text> : null}
                </Box>
                <Text color="textPrimary" marginTop="s" style={{ fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.3 }} numberOfLines={1}>
                    {lastBrewCoffee?.name || 'Unknown Coffee'}
                </Text>
                <Box flexDirection="row" alignItems="center" gap="s">
                    <Text variant="caption" color="textSecondary">{lastBrewCoffee?.roastery || '—'}</Text>
                    {lastFresh ? <Text variant="caption" style={{ color: lastFresh.tone === 'neutral' ? theme.colors.textSecondary : theme.colors[lastFresh.tone] }}>· {lastFresh.label}</Text> : null}
                </Box>

                <Box flexDirection="row" alignItems="flex-end" gap="l" marginTop="l">
                    <Metric v={`${lastBrew.doseIn}g`} l="dose" />
                    <Feather name="arrow-right" size={16} color={theme.colors.textTertiary} style={{ marginBottom: 14 }} />
                    <Metric v={`${lastBrew.doseOut}g`} l="yield" />
                    <Box flex={1} />
                    <Box alignItems="flex-end">
                        <Text color="primary" style={{ fontFamily: MONO, fontSize: 30, fontWeight: '700', lineHeight: 32 }}>
                            {formatRatio(lastBrew.doseIn, lastBrew.doseOut)}
                        </Text>
                        <Text style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1 }} color="textTertiary" textTransform="uppercase">
                            {lastBrew.timeSeconds}s{lastBrew.rating ? ` · ${lastBrew.rating}/5` : ''}
                        </Text>
                    </Box>
                </Box>
            </Box>
        </TouchableOpacity>
    ) : (
        <Box backgroundColor="cardElevated" borderRadius={radii.xl} borderWidth={1} borderColor="border" padding="l" alignItems="center">
            <Text variant="body" color="textSecondary" textAlign="center" marginBottom="m">
                No brews yet. Pull the amber button to log your first shot.
            </Text>
            <Box width="100%">
                <Button label="Log a brew" onPress={() => router.push('/(tabs)/log')} icon={<Ionicons name="add-circle" size={19} color={theme.colors.onPrimary} />} />
            </Box>
        </Box>
    );

    const statsEl = (
        <Box flexDirection="row" gap="s">
            <StatCard icon={<MaterialCommunityIcons name="fire" size={20} color={theme.colors.primary} />} value={brews.length} label="Total brews" />
            <StatCard icon={<MaterialCommunityIcons name="coffee" size={20} color={theme.colors.accent} />} value={coffees.length} label="Beans" />
            <StatCard icon={<MaterialCommunityIcons name="star" size={20} color={theme.colors.gold} />} value={avgRating ? avgRating.toFixed(1) : '–'} label="Avg rating" />
        </Box>
    );

    const activityEl = brews.length > 0 ? (
        <Box marginTop="m" backgroundColor="cardPrimaryBackground" borderRadius={radii.l} borderWidth={1} borderColor="border" padding="m">
            <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="s">
                {monoLabel('Last 14 days')}
                <Text style={{ fontFamily: MONO, fontSize: 11 }} color="textSecondary">{weekCount} shot{weekCount === 1 ? '' : 's'}</Text>
            </Box>
            <ActivityChart values={activity} />
        </Box>
    ) : null;

    const dialEl = topCoffeeName ? (
        <Box marginTop="m" backgroundColor="cardPrimaryBackground" borderRadius={radii.l} borderWidth={1} borderColor="border" padding="m">
            <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="m">
                <Text variant="body" fontWeight="600" color="textPrimary">Dial in again</Text>
                <Text style={{ fontFamily: MONO }} color="primary" numberOfLines={1}>{topCoffeeName}</Text>
            </Box>
            <Button label="Log a brew" onPress={() => router.push('/(tabs)/log')} icon={<Ionicons name="add-circle" size={19} color={theme.colors.onPrimary} />} />
        </Box>
    ) : null;

    return (
        <Box flex={1} backgroundColor="mainBackground">
            <ScreenHeader
                eyebrow={greeting()}
                title={user?.username || 'Welcome'}
                titleSize={30}
                right={
                    <TouchableOpacity onPress={() => router.push('/settings')} hitSlop={8} activeOpacity={0.8}>
                        <Box width={42} height={42} borderRadius={radii.m} backgroundColor="cardElevated" borderWidth={1} borderColor="border" alignItems="center" justifyContent="center">
                            <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
                        </Box>
                    </TouchableOpacity>
                }
            />

            <ScrollView
                contentContainerStyle={{ paddingHorizontal: theme.spacing.m, paddingBottom: 130, ...contentColumn() }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            >
                {isWide ? (
                    <Box flexDirection="row" gap="m" alignItems="flex-start">
                        <Box flex={1.25}>
                            {heroEl}
                            {dialEl}
                        </Box>
                        <Box flex={1}>
                            {statsEl}
                            {activityEl}
                        </Box>
                    </Box>
                ) : (
                    <>
                        {heroEl}
                        <Box marginTop="m">{statsEl}</Box>
                        {activityEl}
                        {dialEl}
                    </>
                )}
            </ScrollView>
        </Box>
    );
}
