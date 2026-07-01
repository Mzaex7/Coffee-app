import React, { useCallback, useState, useEffect, useRef } from 'react';
import { FlatList, TouchableOpacity, ScrollView, View, Animated, Easing, KeyboardAvoidingView, Platform } from 'react-native';
import { BottomSheet } from '../../src/presentation/components/BottomSheet';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Box, Text, useTheme, radii, useIsWide, contentColumn } from '../../src/presentation/theme';
import { Button } from '../../src/presentation/components/Button';
import { Card } from '../../src/presentation/components/Card';
import { Chip } from '../../src/presentation/components/Chip';
import { TextField } from '../../src/presentation/components/Field';
import { SectionHeader } from '../../src/presentation/components/SectionHeader';
import { EmptyState } from '../../src/presentation/components/EmptyState';
import { ScreenHeader } from '../../src/presentation/components/ScreenHeader';
import { useFocusEffect, useRouter } from 'expo-router';
import { aiService, AdviceContext, StructuredAdvice } from '../../src/domain/services/AIService';
import { BrewRepository } from '../../src/data/repositories/BrewRepository';
import { BrewLog } from '../../src/domain/entities/BrewLog';
import { CoffeeRepository } from '../../src/data/repositories/CoffeeRepository';
import { Coffee } from '../../src/domain/entities/Coffee';
import { GrinderRepository } from '../../src/data/repositories/GrinderRepository';
import { Grinder } from '../../src/domain/entities/Grinder';
import { useAuth } from '../../src/domain/context/AuthContext';
import { formatRatio, brewStyle } from '../../src/utils/brewMetrics';

const LOADING_MESSAGES = [
    'Pulling a shot...',
    'Dialing in the grind...',
    'Reading the puck...',
    'Sniffing the aroma...',
    'Crunching extraction numbers...',
    'Analyzing your brew...',
    'Brewing up some advice...',
];

const BODY_LABELS = ['Watery', 'Light', 'Medium', 'Heavy', 'Syrupy'];

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
                <View style={{
                    position: 'absolute', bottom: 6, left: 2, width: 40, height: cupHeight,
                    backgroundColor: theme.colors.surface,
                    borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
                    borderTopLeftRadius: 2, borderTopRightRadius: 2, overflow: 'hidden',
                }}>
                    <Animated.View style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: liquidHeight,
                        backgroundColor: theme.colors.primary, borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
                    }} />
                </View>
                <View style={{
                    position: 'absolute', right: 0, bottom: 14, width: 14, height: 18, borderRadius: 9,
                    borderWidth: 3, borderColor: theme.colors.surface, borderLeftWidth: 0,
                }} />
                <View style={{
                    position: 'absolute', bottom: 0, left: -2, width: 48, height: 6,
                    backgroundColor: theme.colors.surface, borderRadius: 3,
                }} />
            </View>
            <Text variant="body" color="textSecondary" marginTop="s" textAlign="center">
                {LOADING_MESSAGES[messageIndex]}
            </Text>
        </View>
    );
}

export default function AdvisorScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { user } = useAuth();
    const isWide = useIsWide();
    const [advice, setAdvice] = useState<StructuredAdvice | null>(null);
    const [error, setError] = useState<string>('');
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
        const brews = await brewRepo.getAll(user.id);
        brews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAllBrews(brews);

        if (brews.length > 0) {
            setSelectedBrew(prev => prev ?? brews[0]);
        } else {
            setSelectedBrew(null);
        }

        const allCoffees = await new CoffeeRepository().getAll(user.id);
        const coffeeMap: Record<number, Coffee> = {};
        allCoffees.forEach(c => coffeeMap[c.id!] = c);
        setCoffees(coffeeMap);

        const allGrinders = await new GrinderRepository().getAll(user.id);
        const grinderMap: Record<number, Grinder> = {};
        allGrinders.forEach(g => grinderMap[g.id!] = g);
        setGrinders(grinderMap);
    };

    const getAdvice = async () => {
        if (!selectedBrew || !user?.id) return;
        setLoading(true);
        setAdvice(null);
        setError('');

        try {
            // We only send the user's OWN data. Cross-user "community" context is
            // fetched server-side (anonymized + opt-in) inside the Edge Function.
            const context: AdviceContext = {
                coffee: selectedBrew.coffeeId ? coffees[selectedBrew.coffeeId] : undefined,
                grinder: selectedBrew.grinderId ? grinders[selectedBrew.grinderId] : undefined,
                allCoffees: coffees,
                allGrinders: grinders,
            };

            // allBrews is sorted newest-first; 15 recent shots are plenty of
            // context for the model and keep the request payload small.
            const result = await aiService.getStructuredAdvice(selectedBrew, allBrews.slice(0, 15), goal, context);
            setAdvice(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box flex={1} backgroundColor="mainBackground">
            <ScreenHeader
                eyebrow="AI"
                title="Brew Doctor"
                right={
                    <Box
                        width={42}
                        height={42}
                        borderRadius={radii.m}
                        backgroundColor="cardElevated"
                        borderWidth={1}
                        borderColor="border"
                        alignItems="center"
                        justifyContent="center"
                    >
                        <MaterialCommunityIcons name="robot-happy-outline" size={22} color={theme.colors.accent} />
                    </Box>
                }
            >
                <Text variant="body" color="textSecondary" marginTop="s">
                    Pick a shot and your goal — get tailored dial-in advice.
                </Text>
            </ScreenHeader>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: theme.spacing.m, paddingTop: theme.spacing.s, paddingBottom: 130, ...contentColumn(1040) }}
                showsVerticalScrollIndicator={false}
            >
                {!selectedBrew ? (
                    <Box marginTop="l">
                        <EmptyState
                            icon="robot-happy-outline"
                            title="No shots to analyze yet"
                            subtitle="Log a brew and the Doctor will suggest how to dial it in."
                            action={{ label: 'Log a Brew', onPress: () => router.push('/(tabs)/log') }}
                        />
                    </Box>
                ) : (
                    <Box flexDirection={isWide ? 'row' : 'column'} gap={isWide ? 'l' : undefined} alignItems={isWide ? 'flex-start' : undefined}>
                    {/* Left pane (wide) / top section (phone): brew + goal + action */}
                    <Box flex={isWide ? 1 : undefined}>
                        <SectionHeader title="Selected Brew" action={{ label: 'Change', onPress: () => setModalVisible(true) }} />
                        <Card padding="m">
                            <Box flexDirection="row" justifyContent="space-between" alignItems="flex-start">
                                <Box flex={1} marginRight="s">
                                    <Text variant="title">{coffees[selectedBrew.coffeeId!]?.name || 'Unknown Coffee'}</Text>
                                    <Text variant="caption" color="textSecondary" marginTop="xs">
                                        {coffees[selectedBrew.coffeeId!]?.roastery || ''}
                                        {coffees[selectedBrew.coffeeId!]?.origin ? ` · ${coffees[selectedBrew.coffeeId!]?.origin}` : ''}
                                    </Text>
                                </Box>
                                <Text variant="caption" color="textSecondary">{new Date(selectedBrew.date).toLocaleDateString()}</Text>
                            </Box>

                            <Text variant="caption" color="textSecondary" marginTop="s">
                                {grinders[selectedBrew.grinderId!]?.brand} {grinders[selectedBrew.grinderId!]?.model || 'Unknown Grinder'}
                                {selectedBrew.grindSetting ? ` · Grind ${selectedBrew.grindSetting}` : ''}
                            </Text>

                            <Box flexDirection="row" flexWrap="wrap" gap="xs" marginTop="m">
                                <Chip label={formatRatio(selectedBrew.doseIn, selectedBrew.doseOut)} tone="primary" small />
                                <Chip label={brewStyle(selectedBrew.doseIn, selectedBrew.doseOut)} tone="accent" small />
                                <Chip label={`${selectedBrew.doseIn}→${selectedBrew.doseOut}g`} small />
                                <Chip label={`${selectedBrew.timeSeconds}s`} small />
                                {selectedBrew.temperature ? <Chip label={`${selectedBrew.temperature}°C`} small /> : null}
                            </Box>

                            <Box height={1} backgroundColor="border" marginVertical="m" />

                            <Box flexDirection="row" flexWrap="wrap" gap="xs">
                                <Chip label={`Body: ${BODY_LABELS[selectedBrew.score.body] || selectedBrew.score.body}`} small />
                                <Chip label={`Acidity ${selectedBrew.score.acidity}/10`} small />
                                <Chip label={`Bitterness ${selectedBrew.score.bitterness}/10`} small />
                            </Box>
                            {selectedBrew.score.tasteNotes.length > 0 && (
                                <Box flexDirection="row" flexWrap="wrap" gap="xs" marginTop="s">
                                    {selectedBrew.score.tasteNotes.map(note => (
                                        <Chip key={note} label={note} tone="primary" small />
                                    ))}
                                </Box>
                            )}
                        </Card>

                        <Box height={theme.spacing.l} />
                        <SectionHeader title="Your Goal" />
                        <TextField
                            value={goal}
                            onChangeText={setGoal}
                            placeholder="e.g. More sweetness, less acidity…"
                            multiline
                        />

                        <Box height={theme.spacing.m} />
                        <Button label={loading ? 'Analyzing…' : 'Get AI Advice'} onPress={getAdvice} loading={loading} disabled={loading} />
                    </Box>

                    {/* Right pane (wide) / below (phone): loading, error, advice */}
                    <Box flex={isWide ? 1.1 : undefined}>
                        {loading && (
                            <Card padding="l" style={{ marginTop: theme.spacing.m }}>
                                <CoffeeLoadingAnimation />
                            </Card>
                        )}

                        {error ? (
                            <Box marginTop="m">
                                <Card padding="m">
                                    <Text variant="body" color="error">{error}</Text>
                                </Card>
                            </Box>
                        ) : null}

                        {advice ? <AdviceView advice={advice} /> : null}

                        {/* Idle placeholder keeps the wide right pane intentional. */}
                        {isWide && !loading && !error && !advice ? (
                            <Box
                                marginTop="m"
                                borderRadius={radii.l}
                                borderWidth={1}
                                borderColor="borderWeak"
                                padding="xl"
                                alignItems="center"
                                style={{ borderStyle: 'dashed' }}
                            >
                                <MaterialCommunityIcons name="robot-happy-outline" size={28} color={theme.colors.textTertiary} />
                                <Text variant="body" color="textTertiary" marginTop="s" textAlign="center">
                                    Your coaching advice will appear here.
                                </Text>
                            </Box>
                        ) : null}
                    </Box>
                    </Box>
                )}

                <BottomSheet visible={modalVisible} onClose={() => setModalVisible(false)} maxHeightPercent={0.8}>
                    <Box padding="m">
                        <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="m">
                            <Text variant="subheader">Select a Brew</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={8}>
                                <Text variant="body" color="textSecondary">Close</Text>
                            </TouchableOpacity>
                        </Box>
                        <FlatList
                            data={allBrews}
                            keyExtractor={(item) => item.id!.toString()}
                            ItemSeparatorComponent={() => <Box height={1} backgroundColor="borderWeak" />}
                            renderItem={({ item }) => {
                                const isSelected = selectedBrew?.id === item.id;
                                const coffeeName = coffees[item.coffeeId!]?.name || 'Unknown Coffee';
                                return (
                                    <TouchableOpacity
                                        onPress={() => {
                                            setSelectedBrew(item);
                                            setModalVisible(false);
                                            setAdvice(null);
                                            setError('');
                                        }}
                                        style={{ paddingVertical: 14, paddingHorizontal: 8 }}
                                    >
                                        <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                                            <Text variant="body" color={isSelected ? 'primary' : 'textPrimary'} fontWeight="bold">{coffeeName}</Text>
                                            <Text variant="caption" color="textSecondary">{new Date(item.date).toLocaleDateString()}</Text>
                                        </Box>
                                        <Text variant="caption" color="textSecondary" marginTop="xs">
                                            {item.doseIn}g → {item.doseOut}g · {item.timeSeconds}s · {formatRatio(item.doseIn, item.doseOut)}
                                            {item.score.tasteNotes.length > 0 ? ` · ${item.score.tasteNotes.slice(0, 2).join(', ')}` : ''}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </Box>
                </BottomSheet>
            </ScrollView>
            </KeyboardAvoidingView>
        </Box>
    );
}

/* ---------- Structured-advice rendering ---------- */

const DIAGNOSIS_META: Record<StructuredAdvice['diagnosisLabel'], { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; tone: 'primary' | 'error' | 'accent' | 'textSecondary' }> = {
    'under-extracted': { label: 'Under-extracted', icon: 'water-percent', tone: 'primary' },
    'over-extracted': { label: 'Over-extracted', icon: 'fire', tone: 'error' },
    'channeling': { label: 'Channeling', icon: 'shuffle-variant', tone: 'error' },
    'too-fast': { label: 'Too fast', icon: 'speedometer', tone: 'primary' },
    'too-slow': { label: 'Too slow', icon: 'speedometer-slow', tone: 'primary' },
    'balanced': { label: 'Balanced', icon: 'check-decagram', tone: 'accent' },
    'recipe-mismatch': { label: 'Recipe mismatch', icon: 'tune-variant', tone: 'primary' },
    'other': { label: 'Notable issue', icon: 'alert-circle-outline', tone: 'textSecondary' },
};

function AdviceView({ advice }: { advice: StructuredAdvice }) {
    const theme = useTheme();
    const meta = DIAGNOSIS_META[advice.diagnosisLabel] ?? DIAGNOSIS_META.other;
    const toneColor = meta.tone === 'textSecondary' ? theme.colors.textSecondary : theme.colors[meta.tone];

    const confidenceLabel = `${advice.confidence} confidence`;

    return (
        <Box marginTop="m" gap="m">
            {/* Working theory */}
            <Box
                backgroundColor="cardPrimaryBackground"
                borderRadius={radii.l}
                borderWidth={1}
                borderColor="border"
                padding="m"
            >
                <Box flexDirection="row" alignItems="center" gap="s" marginBottom="s">
                    <Box
                        width={36}
                        height={36}
                        borderRadius={radii.m}
                        backgroundColor="cardElevated"
                        alignItems="center"
                        justifyContent="center"
                    >
                        <MaterialCommunityIcons name={meta.icon} size={20} color={toneColor} />
                    </Box>
                    <Box flex={1}>
                        <Text
                            variant="label"
                            textTransform="uppercase"
                            color="textTertiary"
                            style={{ fontFamily: 'JetBrainsMono_400Regular', letterSpacing: 1.5 }}
                        >
                            Working theory · {confidenceLabel}
                        </Text>
                        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 17, color: toneColor, marginTop: 2 }}>
                            {meta.label}
                        </Text>
                    </Box>
                </Box>
                <Text variant="body" color="textPrimary" style={{ lineHeight: 22 }}>
                    {advice.diagnosis}
                </Text>

                {/* Community signal — anonymized, counts only. */}
                {advice.community && advice.community.shots > 0 ? (
                    <Box flexDirection="row" alignItems="center" gap="xs" marginTop="m">
                        <MaterialCommunityIcons name="account-group" size={15} color={theme.colors.accent} />
                        <Text variant="caption" color="textSecondary">
                            Backed by {advice.community.brewers} brewer{advice.community.brewers === 1 ? '' : 's'} · {advice.community.shots} shots on this bean
                        </Text>
                    </Box>
                ) : null}
            </Box>

            {/* Experiments to try */}
            <Box>
                <SectionHeader title="Try on the next shot" />
                <Box gap="s">
                    {advice.adjustments.map((adj, i) => (
                        <Box
                            key={`${adj.parameter}-${i}`}
                            backgroundColor="cardPrimaryBackground"
                            borderRadius={radii.l}
                            borderWidth={1}
                            borderColor="border"
                            padding="m"
                            flexDirection="row"
                            gap="m"
                        >
                            <Box
                                width={28}
                                height={28}
                                borderRadius={radii.full}
                                backgroundColor="primaryMuted"
                                alignItems="center"
                                justifyContent="center"
                            >
                                <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 13, fontWeight: '700', color: theme.colors.primary }}>
                                    {i + 1}
                                </Text>
                            </Box>
                            <Box flex={1}>
                                <Box flexDirection="row" alignItems="center" gap="xs" marginBottom="xs" flexWrap="wrap">
                                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: theme.colors.textPrimary }}>
                                        {adj.parameter}
                                    </Text>
                                    <Feather name="arrow-right" size={14} color={theme.colors.textTertiary} />
                                    <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 13, color: theme.colors.primary, fontWeight: '600' }}>
                                        {adj.change}
                                    </Text>
                                </Box>
                                <Text variant="caption" color="textSecondary" style={{ lineHeight: 18 }}>
                                    {adj.rationale}
                                </Text>
                            </Box>
                        </Box>
                    ))}
                </Box>
            </Box>

            {/* Expected result */}
            <Box
                backgroundColor="cardElevated"
                borderRadius={radii.l}
                borderWidth={1}
                borderColor="border"
                padding="m"
                flexDirection="row"
                gap="m"
            >
                <MaterialCommunityIcons name="cup" size={22} color={theme.colors.accent} />
                <Box flex={1}>
                    <Text
                        variant="label"
                        textTransform="uppercase"
                        color="textTertiary"
                        style={{ fontFamily: 'JetBrainsMono_400Regular', letterSpacing: 1.5 }}
                        marginBottom="xs"
                    >
                        If the theory holds
                    </Text>
                    <Text variant="body" color="textPrimary" style={{ lineHeight: 22 }}>
                        {advice.expectedResult}
                    </Text>
                </Box>
            </Box>

            {/* Iterative loop — one question to answer next shot. */}
            {advice.nextCheck ? (
                <Box
                    backgroundColor="cardPrimaryBackground"
                    borderRadius={radii.l}
                    borderWidth={1}
                    borderColor="border"
                    padding="m"
                    flexDirection="row"
                    gap="m"
                >
                    <MaterialCommunityIcons name="help-circle-outline" size={22} color={theme.colors.primary} />
                    <Box flex={1}>
                        <Text
                            variant="label"
                            textTransform="uppercase"
                            color="textTertiary"
                            style={{ fontFamily: 'JetBrainsMono_400Regular', letterSpacing: 1.5 }}
                            marginBottom="xs"
                        >
                            Check after the next shot
                        </Text>
                        <Text variant="body" color="textPrimary" style={{ lineHeight: 22 }}>
                            {advice.nextCheck}
                        </Text>
                    </Box>
                </Box>
            ) : null}

            {/* Honest disclaimer footer — keeps the contract clear. */}
            <Text
                variant="caption"
                color="textTertiary"
                style={{ lineHeight: 16, fontStyle: 'italic' }}
                marginTop="xs"
            >
                Espresso has more hidden variables than the data can show — treat this as a starting point, log the next shot, and we'll refine together.
            </Text>
        </Box>
    );
}
