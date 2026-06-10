import React, { useState } from 'react';
import { ScrollView, FlatList, RefreshControl, TouchableOpacity, Alert, Platform } from 'react-native';
import { Box, Text, useTheme, radii, useIsWide, contentColumn } from '../../src/presentation/theme';
import { BottomSheet } from '../../src/presentation/components/BottomSheet';
import { BrewRepository } from '../../src/data/repositories/BrewRepository';
import { BrewLog } from '../../src/domain/entities/BrewLog';
import { CoffeeRepository } from '../../src/data/repositories/CoffeeRepository';
import { Coffee } from '../../src/domain/entities/Coffee';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/domain/context/AuthContext';
import { Chip } from '../../src/presentation/components/Chip';
import { Button } from '../../src/presentation/components/Button';
import { StarRating } from '../../src/presentation/components/StarRating';
import { EmptyState } from '../../src/presentation/components/EmptyState';
import { ScreenHeader } from '../../src/presentation/components/ScreenHeader';
import { formatRatio, formatFlowRate, brewStyle } from '../../src/utils/brewMetrics';

const BODY_LABELS = ['Watery', 'Light', 'Medium', 'Heavy', 'Syrupy'];
const MONO = 'JetBrainsMono_400Regular';

const shortDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const bd = new Date(iso); bd.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - bd.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yest.';
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

// Rating (0-5) → badge accent: great = sage, good = amber, else muted.
const ratingTone = (r?: number): 'accent' | 'primary' | 'textSecondary' =>
    !r ? 'textSecondary' : r >= 4.5 ? 'accent' : r >= 3.5 ? 'primary' : 'textSecondary';

export default function HistoryScreen() {
    const theme = useTheme();
    const { user } = useAuth();
    const isWide = useIsWide();
    const [brews, setBrews] = useState<BrewLog[]>([]);
    const [coffees, setCoffees] = useState<Record<number, Coffee>>({});
    const [refreshing, setRefreshing] = useState(false);
    const [selectedBrew, setSelectedBrew] = useState<BrewLog | null>(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [filterCoffeeId, setFilterCoffeeId] = useState<number | 'all'>('all');

    const loadData = async () => {
        if (!user?.id) return;
        const allBrews = await new BrewRepository().getAll(user.id);
        allBrews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setBrews(allBrews);

        const allCoffees = await new CoffeeRepository().getAll(user.id);
        const coffeeMap: Record<number, Coffee> = {};
        allCoffees.forEach(c => coffeeMap[c.id!] = c);
        setCoffees(coffeeMap);
    };

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [user?.id])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleDelete = () => {
        if (!selectedBrew || !selectedBrew.id) return;
        const doDelete = async () => {
            await new BrewRepository().delete(selectedBrew.id!);
            setDetailModalVisible(false);
            setSelectedBrew(null);
            loadData();
        };
        if (Platform.OS === 'web') {
            doDelete();
            return;
        }
        Alert.alert('Delete Brew Log', 'Are you sure you want to delete this brew log?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]);
    };

    const openDetail = (brew: BrewLog) => {
        setSelectedBrew(brew);
        setDetailModalVisible(true);
    };

    // Coffees that actually have brews, for filter chips.
    const usedCoffeeIds = Array.from(new Set(brews.map(b => b.coffeeId)));
    const visibleBrews = filterCoffeeId === 'all' ? brews : brews.filter(b => b.coffeeId === filterCoffeeId);

    return (
        <Box flex={1} backgroundColor="mainBackground">
            <ScreenHeader title="Brews">
                {usedCoffeeIds.length > 1 && (
                    <Box marginTop="m">
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.xs }}>
                            <Chip label="All" tone="primary" selected={filterCoffeeId === 'all'} onPress={() => setFilterCoffeeId('all')} small />
                            {usedCoffeeIds.map(id => (
                                <Chip
                                    key={id}
                                    label={coffees[id]?.name || 'Unknown'}
                                    tone="primary"
                                    selected={filterCoffeeId === id}
                                    onPress={() => setFilterCoffeeId(id)}
                                    small
                                />
                            ))}
                        </ScrollView>
                    </Box>
                )}
            </ScreenHeader>

            <FlatList
                data={visibleBrews}
                // numColumns can't change on the fly — remount via key when the
                // layout flips between list (phone) and grid (iPad/desktop).
                key={isWide ? 'grid' : 'list'}
                numColumns={isWide ? 2 : 1}
                columnWrapperStyle={isWide ? { gap: theme.spacing.s } : undefined}
                keyExtractor={(brew, index) => (brew.id ?? `i${index}`).toString()}
                contentContainerStyle={{ paddingHorizontal: theme.spacing.m, paddingTop: theme.spacing.s, paddingBottom: 130, ...contentColumn() }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
                ItemSeparatorComponent={() => <Box height={theme.spacing.s} />}
                ListEmptyComponent={
                    <Box marginTop="xl">
                        <EmptyState
                            icon="history"
                            title="No brews yet"
                            subtitle="Your logged shots will appear here. Pull to refresh after logging."
                        />
                    </Box>
                }
                renderItem={({ item: brew }) => {
                    const tone = ratingTone(brew.rating);
                    const badgeColor = tone === 'accent' ? theme.colors.accent : tone === 'primary' ? theme.colors.primary : theme.colors.textSecondary;
                    return (
                        <TouchableOpacity onPress={() => openDetail(brew)} activeOpacity={0.85} style={isWide ? { flex: 1 } : undefined}>
                            <Box flexDirection="row" alignItems="center" gap="m" backgroundColor="cardPrimaryBackground" borderWidth={1} borderColor="border" borderRadius={radii.l} padding="m">
                                <Box width={46} height={46} borderRadius={radii.m} backgroundColor="cardElevated" borderWidth={1} borderColor="border" alignItems="center" justifyContent="center">
                                    <Text style={{ fontFamily: MONO, fontSize: 15, fontWeight: '700', color: badgeColor }}>
                                        {brew.rating ? brew.rating.toFixed(1) : '–'}
                                    </Text>
                                </Box>
                                <Box flex={1}>
                                    <Text variant="title" fontSize={15} numberOfLines={1}>{coffees[brew.coffeeId]?.name || 'Unknown Coffee'}</Text>
                                    <Text marginTop="xs" style={{ fontFamily: MONO, fontSize: 11.5 }} color="textSecondary">
                                        {formatRatio(brew.doseIn, brew.doseOut)} · {brew.doseIn}/{brew.doseOut}g · {brew.timeSeconds}s
                                    </Text>
                                </Box>
                                <Text style={{ fontFamily: MONO, fontSize: 11 }} color="textTertiary">{shortDate(brew.date)}</Text>
                            </Box>
                        </TouchableOpacity>
                    );
                }}
            />

            <BottomSheet visible={detailModalVisible} onClose={() => setDetailModalVisible(false)} maxHeightPercent={0.88}>
                {selectedBrew && (
                    <ScrollView contentContainerStyle={{ padding: theme.spacing.l }}>
                                <Box flexDirection="row" justifyContent="space-between" alignItems="flex-start" marginBottom="xs">
                                    <Box flex={1} marginRight="s">
                                        <Text variant="subheader">{coffees[selectedBrew.coffeeId]?.name || 'Unknown'}</Text>
                                        <Text variant="caption" color="textSecondary" marginTop="xs">{new Date(selectedBrew.date).toLocaleString()}</Text>
                                    </Box>
                                    <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                                        <Text variant="body" color="textSecondary">Close</Text>
                                    </TouchableOpacity>
                                </Box>

                                {selectedBrew.rating ? (
                                    <Box marginTop="m" marginBottom="s">
                                        <StarRating value={selectedBrew.rating} readonly size={24} />
                                    </Box>
                                ) : null}

                                <Box flexDirection="row" flexWrap="wrap" gap="l" marginTop="l" marginBottom="l">
                                    <Stat label="Dose In" value={`${selectedBrew.doseIn}g`} />
                                    <Stat label="Yield" value={`${selectedBrew.doseOut}g`} />
                                    <Stat label="Time" value={`${selectedBrew.timeSeconds}s`} />
                                    <Stat label="Ratio" value={formatRatio(selectedBrew.doseIn, selectedBrew.doseOut)} />
                                    <Stat label="Flow" value={formatFlowRate(selectedBrew.doseOut, selectedBrew.timeSeconds)} />
                                    <Stat label="Style" value={brewStyle(selectedBrew.doseIn, selectedBrew.doseOut)} />
                                    {selectedBrew.grindSetting ? <Stat label="Grind" value={selectedBrew.grindSetting} /> : null}
                                    {selectedBrew.temperature ? <Stat label="Temp" value={`${selectedBrew.temperature}°C`} /> : null}
                                </Box>

                                <Text variant="title" marginBottom="s">Taste Profile</Text>
                                <Box marginBottom="l" gap="xs">
                                    <Text variant="body" color="textSecondary">Body: {BODY_LABELS[selectedBrew.score.body] || selectedBrew.score.body}</Text>
                                    <Text variant="body" color="textSecondary">Acidity: {selectedBrew.score.acidity}/10</Text>
                                    <Text variant="body" color="textSecondary">Bitterness: {selectedBrew.score.bitterness}/10</Text>
                                </Box>

                                {selectedBrew.score.tasteNotes && selectedBrew.score.tasteNotes.length > 0 && (
                                    <Box marginBottom="l">
                                        <Text variant="title" marginBottom="s">Notes</Text>
                                        <Box flexDirection="row" flexWrap="wrap" gap="xs">
                                            {selectedBrew.score.tasteNotes.map((note, idx) => (
                                                <Chip key={idx} label={note} small />
                                            ))}
                                        </Box>
                                    </Box>
                                )}

                        <Button label="Delete Log" variant="danger" onPress={handleDelete} />
                    </ScrollView>
                )}
            </BottomSheet>
        </Box>
    );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
    <Box>
        <Text variant="label" textTransform="uppercase" marginBottom="xs">{label}</Text>
        <Text variant="title">{value}</Text>
    </Box>
);
