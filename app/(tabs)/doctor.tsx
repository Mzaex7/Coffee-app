import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Modal, FlatList, TouchableOpacity, ScrollView, TextInput, View, Alert, Platform, Animated, Easing } from 'react-native';
import { Box, Text, useTheme } from '../../src/presentation/theme';
import { Button } from '../../src/presentation/components/Button';
import { Stack, useFocusEffect } from 'expo-router';
import { databaseService } from '../../src/domain/services/DatabaseService';
import { aiService, AdviceContext } from '../../src/domain/services/AIService';
import { BrewRepository } from '../../src/data/repositories/BrewRepository';
import { BrewLog } from '../../src/domain/entities/BrewLog';
import { CoffeeRepository } from '../../src/data/repositories/CoffeeRepository';
import { Coffee } from '../../src/domain/entities/Coffee';
import { GrinderRepository } from '../../src/data/repositories/GrinderRepository';
import { Grinder } from '../../src/domain/entities/Grinder';
import { generateMockData } from '../../src/utils/mockData';
import Markdown from 'react-native-markdown-display';
import { useAuth } from '../../src/domain/context/AuthContext';

const LOADING_MESSAGES = [
    'Pulling a shot...',
    'Dialing in the grind...',
    'Reading the puck...',
    'Sniffing the aroma...',
    'Crunching extraction numbers...',
    'Analyzing your brew...',
    'Brewing up some advice...',
];

function CoffeeLoadingAnimation() {
    const theme = useTheme();
    const [messageIndex, setMessageIndex] = useState(0);
    const fillAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(fillAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
                Animated.delay(600),
                Animated.timing(fillAnim, { toValue: 0, duration: 400, easing: Easing.in(Easing.ease), useNativeDriver: false }),
                Animated.delay(300),
            ])
        );
        loop.start();

        const interval = setInterval(() => {
            setMessageIndex(i => (i + 1) % LOADING_MESSAGES.length);
        }, 2500);

        return () => { loop.stop(); clearInterval(interval); };
    }, []);

    const cupHeight = 34;
    const liquidMaxHeight = cupHeight - 6;
    const liquidHeight = fillAnim.interpolate({ inputRange: [0, 1], outputRange: [0, liquidMaxHeight] });

    return (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <View style={{ position: 'relative', width: 56, height: 48, marginBottom: 12 }}>
                {/* Cup body */}
                <View style={{
                    position: 'absolute',
                    bottom: 6,
                    left: 2,
                    width: 40,
                    height: cupHeight,
                    backgroundColor: theme.colors.surface,
                    borderBottomLeftRadius: 10,
                    borderBottomRightRadius: 10,
                    borderTopLeftRadius: 2,
                    borderTopRightRadius: 2,
                    overflow: 'hidden',
                }}>
                    {/* Coffee liquid — fills from bottom */}
                    <Animated.View style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: liquidHeight,
                        backgroundColor: theme.colors.primary,
                        borderBottomLeftRadius: 8,
                        borderBottomRightRadius: 8,
                    }} />
                </View>

                {/* Handle */}
                <View style={{
                    position: 'absolute',
                    right: 0,
                    bottom: 14,
                    width: 14,
                    height: 18,
                    borderRadius: 9,
                    borderWidth: 3,
                    borderColor: theme.colors.surface,
                    borderLeftWidth: 0,
                }} />

                {/* Saucer */}
                <View style={{
                    position: 'absolute',
                    bottom: 0,
                    left: -2,
                    width: 48,
                    height: 6,
                    backgroundColor: theme.colors.surface,
                    borderRadius: 3,
                }} />
            </View>

            <Text variant="body" color="textSecondary" marginTop="s" textAlign="center">
                {LOADING_MESSAGES[messageIndex]}
            </Text>
        </View>
    );
}

/**
 * Find brews from other users that are relevant based on shared equipment.
 * Relevance = other user has same grinder (name+brand+model) OR same coffee (name+roastery).
 */
function findRelevantCrossUserBrews(
    userCoffees: Coffee[],
    userGrinders: Grinder[],
    allBrews: BrewLog[],
    allCoffees: Coffee[],
    allGrinders: Grinder[],
    userId: number,
): BrewLog[] {
    // Build sets of user's equipment identifiers
    const userCoffeeKeys = new Set(
        userCoffees.map(c => `${c.name?.toLowerCase()}|${c.roastery?.toLowerCase()}`)
    );
    const userGrinderKeys = new Set(
        userGrinders.map(g => `${g.name?.toLowerCase()}|${g.brand?.toLowerCase()}|${g.model?.toLowerCase()}`)
    );

    // Build lookup maps for all coffees and grinders
    const coffeeById: Record<number, Coffee> = {};
    allCoffees.forEach(c => { if (c.id) coffeeById[c.id] = c; });
    const grinderById: Record<number, Grinder> = {};
    allGrinders.forEach(g => { if (g.id) grinderById[g.id] = g; });

    // Filter other users' brews by equipment match
    return allBrews.filter(brew => {
        if (brew.userId === userId) return false; // Skip own brews

        const brewCoffee = coffeeById[brew.coffeeId];
        const brewGrinder = grinderById[brew.grinderId];

        const coffeeMatch = brewCoffee
            ? userCoffeeKeys.has(`${brewCoffee.name?.toLowerCase()}|${brewCoffee.roastery?.toLowerCase()}`)
            : false;

        const grinderMatch = brewGrinder
            ? userGrinderKeys.has(`${brewGrinder.name?.toLowerCase()}|${brewGrinder.brand?.toLowerCase()}|${brewGrinder.model?.toLowerCase()}`)
            : false;

        return coffeeMatch || grinderMatch;
    });
}


export default function AdvisorScreen() {
    const theme = useTheme();
    const { user } = useAuth();
    const [advice, setAdvice] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [selectedBrew, setSelectedBrew] = useState<BrewLog | null>(null);
    const [allBrews, setAllBrews] = useState<BrewLog[]>([]);
    const [coffees, setCoffees] = useState<Record<number, Coffee>>({});
    const [grinders, setGrinders] = useState<Record<number, Grinder>>({});
    const [goal, setGoal] = useState('');
    const [modalVisible, setModalVisible] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [user?.id])
    );

    const loadData = async () => {
        if (!user?.id) return;
        const brewRepo = new BrewRepository();
        // Load only user's brews for the UI selection
        const brews = await brewRepo.getAll(user.id);
        brews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAllBrews(brews);

        if (brews.length > 0) {
            setSelectedBrew(brews[0]);
        }

        const coffeeRepo = new CoffeeRepository();
        const allCoffees = await coffeeRepo.getAll(user.id);
        const coffeeMap: Record<number, Coffee> = {};
        allCoffees.forEach(c => coffeeMap[c.id!] = c);
        setCoffees(coffeeMap);

        const grinderRepo = new GrinderRepository();
        const allGrinders = await grinderRepo.getAll(user.id);
        const grinderMap: Record<number, Grinder> = {};
        allGrinders.forEach(g => grinderMap[g.id!] = g);
        setGrinders(grinderMap);
    };

    const bodyLabel = (body: number) => body === 0 ? 'Light' : body === 1 ? 'Medium' : 'Heavy';

    const getAdvice = async () => {
        if (!selectedBrew || !user?.id) return;
        setLoading(true);
        setAdvice('');

        const brewRepo = new BrewRepository();
        const coffeeRepo = new CoffeeRepository();
        const grinderRepo = new GrinderRepository();

        // Load user's own brews as history
        const userBrews = await brewRepo.getAll(user.id);

        // Load ALL data globally for cross-user analysis
        const globalBrews = await brewRepo.getAllGlobal();
        const globalCoffees = await coffeeRepo.getAllGlobal();
        const globalGrinders = await grinderRepo.getAllGlobal();

        // User's own equipment
        const userCoffees = await coffeeRepo.getAll(user.id);
        const userGrinders = await grinderRepo.getAll(user.id);

        // Find relevant cross-user brews
        const crossUserBrews = findRelevantCrossUserBrews(
            userCoffees,
            userGrinders,
            globalBrews,
            globalCoffees,
            globalGrinders,
            user.id,
        );

        // Build full coffee/grinder maps for context (includes cross-user equipment)
        const allCoffeeMap: Record<number, Coffee> = {};
        globalCoffees.forEach(c => allCoffeeMap[c.id!] = c);
        const allGrinderMap: Record<number, Grinder> = {};
        globalGrinders.forEach(g => allGrinderMap[g.id!] = g);

        const context: AdviceContext = {
            coffee: selectedBrew.coffeeId ? allCoffeeMap[selectedBrew.coffeeId] : undefined,
            grinder: selectedBrew.grinderId ? allGrinderMap[selectedBrew.grinderId] : undefined,
            allCoffees: allCoffeeMap,
            allGrinders: allGrinderMap,
        };

        // Combine user's history with relevant cross-user brews
        const combinedHistory = [...userBrews, ...crossUserBrews];

        const result = await aiService.getAdvice(
            selectedBrew,
            combinedHistory,
            goal,
            context
        );
        setAdvice(result);
        setLoading(false);
    };

    const handleGenerateData = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            await generateMockData(50, user.id);
            alert('Generated 50 mock brews!');
            loadData();
        } catch (e) {
            alert('Error generating data: ' + e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box flex={1} backgroundColor="mainBackground" padding="m">
            <Stack.Screen options={{ title: 'AI Advisor', headerBackTitle: 'Back' }} />
            <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
                <Text variant="header" marginBottom="m">Brew Doctor</Text>

                <Box marginBottom="l">
                    <Text variant="subheader" fontSize={18} marginBottom="s">Dev Tools</Text>
                    <Button
                        label="Generate 50 Mock Brews"
                        onPress={handleGenerateData}
                        variant="outline"
                    />
                    <Box height={10} />
                    <Button
                        label="Nuke Data (Clear All)"
                        onPress={() => {
                            const nukeAllData = async () => {
                                await databaseService.nukeAllData();
                                setSelectedBrew(null);
                                setAllBrews([]);
                                setAdvice('');
                                loadData();
                            };

                            if (Platform.OS === 'web') {
                                if (confirm('Are you sure? This will delete all data.')) {
                                    nukeAllData();
                                }
                            } else {
                                Alert.alert(
                                    'Nuke Data',
                                    'Are you sure? This will delete all data.',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Delete All', style: 'destructive', onPress: nukeAllData },
                                    ]
                                );
                            }
                        }}
                        variant="outline"
                    />
                </Box>

                {!selectedBrew ? (
                    <Box backgroundColor="cardPrimaryBackground" padding="l" borderRadius={12} alignItems="center">
                        <Text variant="body" color="textSecondary" textAlign="center">No brews found. Log a brew to get advice!</Text>
                    </Box>
                ) : (
                    <Box marginBottom="l">
                        <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="s">
                            <Text variant="subheader" fontSize={18}>Selected Brew</Text>
                            <TouchableOpacity onPress={() => setModalVisible(true)} style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 }}>
                                <Text color="textPrimary" variant="caption" fontWeight="bold">Change Brew</Text>
                            </TouchableOpacity>
                        </Box>

                        <Box backgroundColor="cardPrimaryBackground" padding="m" borderRadius={12} marginBottom="m">
                            {/* Header: Coffee + Date */}
                            <Box flexDirection="row" justifyContent="space-between" alignItems="flex-start" marginBottom="s">
                                <Box flex={1}>
                                    <Text variant="body" color="primary" fontWeight="bold" fontSize={18}>
                                        {coffees[selectedBrew.coffeeId!]?.name || 'Unknown Coffee'}
                                    </Text>
                                    <Text variant="caption" color="textSecondary">
                                        {coffees[selectedBrew.coffeeId!]?.roastery || ''}
                                        {coffees[selectedBrew.coffeeId!]?.origin ? ` · ${coffees[selectedBrew.coffeeId!]?.origin}` : ''}
                                    </Text>
                                </Box>
                                <Text variant="caption" color="textSecondary">{new Date(selectedBrew.date).toLocaleDateString()}</Text>
                            </Box>

                            {/* Equipment */}
                            <Text variant="caption" color="textSecondary" marginBottom="s">
                                🔧 {grinders[selectedBrew.grinderId!]?.brand} {grinders[selectedBrew.grinderId!]?.model || 'Unknown Grinder'}
                                {selectedBrew.grindSetting ? ` · Grind: ${selectedBrew.grindSetting}` : ''}
                            </Text>

                            <Box height={1} backgroundColor="surface" marginBottom="s" />

                            {/* Recipe Row */}
                            <Box flexDirection="row" justifyContent="space-around" marginBottom="s">
                                <Box alignItems="center">
                                    <Text variant="caption" color="textSecondary">Dose In</Text>
                                    <Text variant="body" fontWeight="bold" color="textPrimary">{selectedBrew.doseIn}g</Text>
                                </Box>
                                <Box alignItems="center">
                                    <Text variant="caption" color="textSecondary">Dose Out</Text>
                                    <Text variant="body" fontWeight="bold" color="textPrimary">{selectedBrew.doseOut}g</Text>
                                </Box>
                                <Box alignItems="center">
                                    <Text variant="caption" color="textSecondary">Time</Text>
                                    <Text variant="body" fontWeight="bold" color="textPrimary">{selectedBrew.timeSeconds}s</Text>
                                </Box>
                                <Box alignItems="center">
                                    <Text variant="caption" color="textSecondary">Ratio</Text>
                                    <Text variant="body" fontWeight="bold" color="primary">1:{selectedBrew.doseIn > 0 ? (selectedBrew.doseOut / selectedBrew.doseIn).toFixed(1) : '?'}</Text>
                                </Box>
                                {selectedBrew.temperature ? (
                                    <Box alignItems="center">
                                        <Text variant="caption" color="textSecondary">Temp</Text>
                                        <Text variant="body" fontWeight="bold" color="textPrimary">{selectedBrew.temperature}°C</Text>
                                    </Box>
                                ) : null}
                            </Box>

                            <Box height={1} backgroundColor="surface" marginBottom="s" />

                            {/* Taste Profile */}
                            <Box flexDirection="row" justifyContent="space-around" marginBottom="xs">
                                <Box alignItems="center">
                                    <Text variant="caption" color="textSecondary">Body</Text>
                                    <Text variant="body" fontWeight="bold" color="textPrimary">{bodyLabel(selectedBrew.score.body)}</Text>
                                </Box>
                                <Box alignItems="center">
                                    <Text variant="caption" color="textSecondary">Acidity</Text>
                                    <Text variant="body" fontWeight="bold" color="textPrimary">{selectedBrew.score.acidity}/10</Text>
                                </Box>
                                <Box alignItems="center">
                                    <Text variant="caption" color="textSecondary">Bitterness</Text>
                                    <Text variant="body" fontWeight="bold" color="textPrimary">{selectedBrew.score.bitterness}/10</Text>
                                </Box>
                            </Box>
                            {selectedBrew.score.tasteNotes.length > 0 && (
                                <Box flexDirection="row" flexWrap="wrap" gap="xs" marginTop="s">
                                    {selectedBrew.score.tasteNotes.map(note => (
                                        <Box key={note} backgroundColor="mainBackground" paddingHorizontal="s" paddingVertical="xs" borderRadius={12}>
                                            <Text variant="caption" color="primary">{note}</Text>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Box>

                        <Text variant="subheader" fontSize={18} marginBottom="s">Your Goal</Text>
                        <TextInput
                            style={{
                                backgroundColor: theme.colors.cardPrimaryBackground,
                                color: theme.colors.textPrimary,
                                padding: theme.spacing.m,
                                borderRadius: 8,
                                marginBottom: theme.spacing.m,
                                borderWidth: 1,
                                borderColor: theme.colors.surface,
                                outlineStyle: 'none',
                            } as any}
                            placeholder="e.g. More sweetness, less acidity..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={goal}
                            onChangeText={setGoal}
                        />

                        <Button
                            label={loading ? "Analyzing..." : "Get AI Advice"}
                            onPress={getAdvice}
                            variant="primary"
                        />
                    </Box>
                )}

                <Modal
                    visible={modalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
                        <Box backgroundColor="mainBackground" borderRadius={16} maxHeight="80%" padding="m">
                            <Text variant="subheader" marginBottom="m">Select a Brew</Text>
                            <FlatList
                                data={allBrews}
                                keyExtractor={(item) => item.id!.toString()}
                                ItemSeparatorComponent={() => <Box height={1} backgroundColor="surface" />}
                                renderItem={({ item }) => {
                                    const isSelected = selectedBrew?.id === item.id;
                                    const coffeeName = coffees[item.coffeeId!]?.name || 'Unknown Coffee';
                                    const ratio = item.doseIn > 0 ? (item.doseOut / item.doseIn).toFixed(1) : '?';
                                    return (
                                        <TouchableOpacity
                                            onPress={() => {
                                                setSelectedBrew(item);
                                                setModalVisible(false);
                                                setAdvice('');
                                            }}
                                            style={{
                                                padding: 14,
                                                backgroundColor: isSelected ? theme.colors.cardPrimaryBackground : 'transparent',
                                                borderLeftWidth: isSelected ? 3 : 0,
                                                borderLeftColor: theme.colors.primary,
                                            }}
                                        >
                                            <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                                                <Text variant="body" color={isSelected ? 'primary' : 'textPrimary'} fontWeight="bold">
                                                    {coffeeName}
                                                </Text>
                                                <Text variant="caption" color="textSecondary">
                                                    {new Date(item.date).toLocaleDateString()}
                                                </Text>
                                            </Box>
                                            <Text variant="caption" color="textSecondary" marginTop="xs">
                                                {item.doseIn}g → {item.doseOut}g in {item.timeSeconds}s · 1:{ratio}
                                                {item.score.tasteNotes.length > 0 ? ` · ${item.score.tasteNotes.slice(0, 2).join(', ')}` : ''}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                            <Box marginTop="m">
                                <Button label="Close" onPress={() => setModalVisible(false)} variant="outline" />
                            </Box>
                        </Box>
                    </View>
                </Modal>

                {loading && (
                    <Box backgroundColor="cardPrimaryBackground" padding="l" borderRadius={12} marginTop="m" alignItems="center">
                        <CoffeeLoadingAnimation />
                    </Box>
                )}

                {advice ? (
                    <Box backgroundColor="surface" padding="m" borderRadius={8} marginTop="m">
                        <Text variant="subheader" fontSize={20} color="primary" marginBottom="s">Suggestion</Text>
                        <Markdown
                            style={{
                                body: { color: theme.colors.textPrimary, fontSize: 16, lineHeight: 24 },
                                heading1: { color: theme.colors.primary, marginVertical: 10 },
                                list_item: { marginVertical: 5 },
                            }}
                        >
                            {advice}
                        </Markdown>
                    </Box>
                ) : null}
            </ScrollView>
        </Box>
    );
}
