import React, { useEffect, useState, useCallback } from 'react';
import { Box, Text, useTheme } from '../../src/presentation/theme';
import { RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { BrewRepository } from '../../src/data/repositories/BrewRepository';
import { CoffeeRepository } from '../../src/data/repositories/CoffeeRepository';
import { BrewLog } from '../../src/domain/entities/BrewLog';
import { Coffee } from '../../src/domain/entities/Coffee';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Button } from '../../src/presentation/components/Button';
import { useAuth } from '../../src/domain/context/AuthContext';

export default function DashboardScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { user, logout } = useAuth();
    const [lastBrew, setLastBrew] = useState<BrewLog | null>(null);
    const [lastBrewCoffee, setLastBrewCoffee] = useState<Coffee | null>(null);

    // Stats State
    const [totalBrews, setTotalBrews] = useState(0);
    const [beansCount, setBeansCount] = useState(0);
    const [daysSinceLastBrew, setDaysSinceLastBrew] = useState(0);
    const [topCoffeeName, setTopCoffeeName] = useState('-');

    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        if (!user?.id) return;
        const brewRepo = new BrewRepository();
        const coffeeRepo = new CoffeeRepository();

        const allBrews = await brewRepo.getAll(user.id);
        const allCoffees = await coffeeRepo.getAll(user.id);

        setTotalBrews(allBrews.length);
        setBeansCount(allCoffees.length);

        if (allBrews.length > 0) {
            // Sort by date desc
            allBrews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const last = allBrews[0];
            setLastBrew(last);

            // Find Last Brew Coffee
            const coffee = allCoffees.find(c => c.id === last.coffeeId);
            setLastBrewCoffee(coffee || null);

            // Calculate Days Since
            const lastDate = new Date(last.date);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - lastDate.getTime());
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            setDaysSinceLastBrew(diffDays);

            // Calculate Top Coffee
            const coffeeCounts: Record<number, number> = {};
            allBrews.forEach(b => {
                coffeeCounts[b.coffeeId] = (coffeeCounts[b.coffeeId] || 0) + 1;
            });
            let maxId = -1;
            let maxCount = -1;
            for (const [id, count] of Object.entries(coffeeCounts)) {
                if (count > maxCount) {
                    maxCount = count;
                    maxId = Number(id);
                }
            }
            const topCoffee = allCoffees.find(c => c.id === maxId);
            setTopCoffeeName(topCoffee?.name || '-');

        } else {
            setLastBrew(null);
            setLastBrewCoffee(null);
            setDaysSinceLastBrew(0);
            setTopCoffeeName('-');
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [user?.id])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };



    return (
        <Box flex={1} backgroundColor="mainBackground">
            <ScrollView
                contentContainerStyle={{ padding: theme.spacing.m }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            >
                <Box marginBottom="l" paddingTop="l" flexDirection="row" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1}>
                        <Text
                            variant="header"
                            fontSize={48}
                            color="primary"
                            fontWeight="900"
                            style={{ letterSpacing: -1 }}
                        >
                            BrewRef
                        </Text>
                        <Text
                            variant="body"
                            color="textSecondary"
                            fontSize={14}
                            style={{ letterSpacing: 3, textTransform: 'uppercase', opacity: 0.7 }}
                        >
                            {user?.username ? `Hey, ${user.username}` : 'Your Coffee Journey'}
                        </Text>
                    </Box>
                    <TouchableOpacity
                        onPress={logout}
                        style={{
                            marginTop: 12,
                            backgroundColor: theme.colors.surface,
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 8,
                        }}
                    >
                        <Text variant="caption" color="textSecondary" fontWeight="bold">Logout</Text>
                    </TouchableOpacity>
                </Box>

                {/* Stats Grid — 2×2 */}
                <Box marginBottom="l">
                    {/* Row 1 */}
                    <Box flexDirection="row" gap="m" marginBottom="m">
                        {/* Beans Stashed */}
                        <Box
                            flex={1}
                            backgroundColor="cardPrimaryBackground"
                            padding="m"
                            borderRadius={16}
                            alignItems="flex-start"
                            justifyContent="space-between"
                            height={110}
                        >
                            <MaterialCommunityIcons name="seed-outline" size={28} color={theme.colors.primary} />
                            <Box>
                                <Text variant="header" fontSize={24}>{beansCount}</Text>
                                <Text variant="caption" color="textSecondary">Beans Stashed</Text>
                            </Box>
                        </Box>

                        {/* Days Since */}
                        <Box
                            flex={1}
                            backgroundColor="cardPrimaryBackground"
                            padding="m"
                            borderRadius={16}
                            alignItems="flex-start"
                            justifyContent="space-between"
                            height={110}
                        >
                            <Feather name="calendar" size={26} color={theme.colors.secondary} />
                            <Box>
                                <Text variant="header" fontSize={24}>{daysSinceLastBrew}d</Text>
                                <Text variant="caption" color="textSecondary">Since Last Brew</Text>
                            </Box>
                        </Box>
                    </Box>

                    {/* Row 2 */}
                    <Box flexDirection="row" gap="m">
                        {/* Total Brews */}
                        <Box
                            flex={1}
                            backgroundColor="cardPrimaryBackground"
                            padding="m"
                            borderRadius={16}
                            alignItems="flex-start"
                            justifyContent="space-between"
                            height={110}
                        >
                            <MaterialCommunityIcons name="coffee-outline" size={28} color={theme.colors.accent} />
                            <Box>
                                <Text variant="header" fontSize={24}>{totalBrews}</Text>
                                <Text variant="caption" color="textSecondary">Total Brews</Text>
                            </Box>
                        </Box>

                        {/* Top Coffee */}
                        <Box
                            flex={1}
                            backgroundColor="cardPrimaryBackground"
                            padding="m"
                            borderRadius={16}
                            alignItems="flex-start"
                            justifyContent="space-between"
                            height={110}
                        >
                            <MaterialCommunityIcons name="trophy-outline" size={28} color="#FFD700" />
                            <Box>
                                <Text variant="subheader" fontSize={18} numberOfLines={1}>{topCoffeeName}</Text>
                                <Text variant="caption" color="textSecondary">Top Coffee</Text>
                            </Box>
                        </Box>
                    </Box>
                </Box>

                <Text variant="subheader" marginBottom="m">Last Brew</Text>
                {lastBrew ? (
                    <Box backgroundColor="cardPrimaryBackground" padding="l" borderRadius={20} marginBottom="l">
                        <Box flexDirection="row" justifyContent="space-between" alignItems="flex-start" marginBottom="s">
                            <Box flex={1}>
                                <Text variant="caption" color="textSecondary" textTransform="uppercase" letterSpacing={1} marginBottom="xs">
                                    {new Date(lastBrew.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
                                </Text>
                                <Text variant="subheader" fontSize={22} color="textPrimary" fontWeight="bold">
                                    {lastBrewCoffee?.name || 'Unknown Coffee'}
                                </Text>
                                {lastBrewCoffee?.roastery && (
                                    <Text variant="body" color="textSecondary" fontSize={14}>
                                        {lastBrewCoffee.roastery}
                                    </Text>
                                )}
                            </Box>
                            {lastBrew.score && (
                                <Box backgroundColor="mainBackground" paddingHorizontal="m" paddingVertical="xs" borderRadius={12}>
                                    <Text variant="subheader" fontSize={18} color="primary">
                                        {(lastBrew.score.acidity + lastBrew.score.bitterness) / 2}/10
                                    </Text>
                                </Box>
                            )}
                        </Box>

                        <Box height={1} backgroundColor="surface" marginVertical="m" />

                        <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                            <Box>
                                <Text variant="body" fontWeight="bold" fontSize={18}>{lastBrew.doseIn}g <Text fontWeight="normal" color="textSecondary" fontSize={14}>in</Text></Text>
                            </Box>
                            <Feather name="arrow-right" size={20} color={theme.colors.textSecondary} />
                            <Box>
                                <Text variant="body" fontWeight="bold" fontSize={18}>{lastBrew.doseOut}g <Text fontWeight="normal" color="textSecondary" fontSize={14}>out</Text></Text>
                            </Box>
                            <Box width={1} height={20} backgroundColor="surface" />
                            <Box flexDirection="row" alignItems="center" gap="xs">
                                <Feather name="clock" size={16} color={theme.colors.textSecondary} />
                                <Text variant="body" fontWeight="bold" fontSize={18}>{lastBrew.timeSeconds}s</Text>
                            </Box>
                        </Box>
                    </Box>
                ) : (
                    <Box backgroundColor="cardPrimaryBackground" padding="l" borderRadius={16} alignItems="center" marginBottom="l">
                        <Text variant="body" color="textSecondary" textAlign="center" marginBottom="m">
                            No brews recorded yet. Start your journey by logging your first cup!
                        </Text>
                        <Button label="Log a Brew" onPress={() => router.push('/(tabs)/log')} variant="primary" />
                    </Box>
                )}



            </ScrollView>
        </Box>
    );
}
