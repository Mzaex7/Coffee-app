import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollView, TouchableOpacity, Platform, Animated, Easing, Alert, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Box, Text, useTheme, radii, contentColumn } from '../../src/presentation/theme';
import { useRouter, useFocusEffect } from 'expo-router';
import { Button } from '../../src/presentation/components/Button';
import { Card } from '../../src/presentation/components/Card';
import { Chip } from '../../src/presentation/components/Chip';
import { TextField, SelectField } from '../../src/presentation/components/Field';
import { SectionHeader } from '../../src/presentation/components/SectionHeader';
import { StarRating } from '../../src/presentation/components/StarRating';
import { BodySelector } from '../../src/presentation/components/BodySelector';
import { ScaleSlider } from '../../src/presentation/components/ScaleSlider';
import { TasteWheel } from '../../src/presentation/components/TasteWheel';
import { SelectionModal } from '../../src/presentation/components/SelectionModal';
import { GrindSelector } from '../../src/presentation/components/GrindSelector';
import { BrewBuilder } from '../../src/domain/builders/BrewBuilder';
import { BrewRepository } from '../../src/data/repositories/BrewRepository';
import { CoffeeRepository } from '../../src/data/repositories/CoffeeRepository';
import { GrinderRepository } from '../../src/data/repositories/GrinderRepository';
import { Coffee } from '../../src/domain/entities/Coffee';
import { Grinder } from '../../src/domain/entities/Grinder';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/domain/context/AuthContext';
import { formatRatio, formatFlowRate, brewStyle } from '../../src/utils/brewMetrics';
import { getFreshness } from '../../src/utils/freshness';

const DEFAULTS = { doseIn: '18', doseOut: '36', time: '30', temp: '93', grindSetting: '' };

export default function BrewLogScreen() {
    const router = useRouter();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [coffees, setCoffees] = useState<Coffee[]>([]);
    const [grinders, setGrinders] = useState<Grinder[]>([]);
    const [showCoffeeModal, setShowCoffeeModal] = useState(false);
    const [showGrinderModal, setShowGrinderModal] = useState(false);

    const [selectedCoffeeId, setSelectedCoffeeId] = useState<number | undefined>();
    const [selectedGrinderId, setSelectedGrinderId] = useState<number | undefined>();
    const [doseIn, setDoseIn] = useState(DEFAULTS.doseIn);
    const [doseOut, setDoseOut] = useState(DEFAULTS.doseOut);
    const [time, setTime] = useState(DEFAULTS.time);
    const [temp, setTemp] = useState(DEFAULTS.temp);
    const [grindSetting, setGrindSetting] = useState(DEFAULTS.grindSetting);

    const [rating, setRating] = useState(0);
    const [body, setBody] = useState(1);
    const [acidity, setAcidity] = useState(5);
    const [bitterness, setBitterness] = useState(5);
    const [tasteNotes, setTasteNotes] = useState<string[]>([]);

    const [timerSeconds, setTimerSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [saving, setSaving] = useState(false);

    // Wall-clock timer — survives JS frame drops without drift.
    const startedAtRef = useRef<number | null>(null);
    const accumulatedRef = useRef(0); // ms accumulated across pause/resume
    const rafRef = useRef<number | null>(null);
    const lastTickSecondRef = useRef<number>(0);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Keep the screen awake while a shot is being pulled — no free hand to
    // tap the display, and iOS auto-lock would otherwise kill the readout.
    useEffect(() => {
        if (!isTimerRunning || Platform.OS === 'web') return;
        activateKeepAwakeAsync('brew-timer');
        return () => { deactivateKeepAwake('brew-timer'); };
    }, [isTimerRunning]);

    useEffect(() => {
        if (!isTimerRunning) {
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
            return;
        }
        startedAtRef.current = Date.now() - accumulatedRef.current;

        const tick = () => {
            const start = startedAtRef.current ?? Date.now();
            const elapsedMs = Date.now() - start;
            const s = elapsedMs / 1000;
            setTimerSeconds(s);

            // Per-second tactile + visual beat.
            const whole = Math.floor(s);
            if (whole > lastTickSecondRef.current && whole > 0) {
                lastTickSecondRef.current = whole;
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                pulseAnim.stopAnimation();
                pulseAnim.setValue(1);
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.06, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 220, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                ]).start();
            }
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        };
    }, [isTimerRunning, pulseAnim]);

    const handleStartTimer = () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        lastTickSecondRef.current = Math.floor(accumulatedRef.current / 1000);
        setIsTimerRunning(true);
    };
    const handleStopTimer = () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        // Capture the elapsed time so a resume continues from the same point.
        const start = startedAtRef.current ?? Date.now();
        accumulatedRef.current = Date.now() - start;
        setIsTimerRunning(false);
        setTime(timerSeconds.toFixed(1));
    };
    const handleResetTimer = () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsTimerRunning(false);
        accumulatedRef.current = 0;
        lastTickSecondRef.current = 0;
        setTimerSeconds(0);
    };

    useFocusEffect(
        useCallback(() => {
            const fetchData = async () => {
                if (!user?.id) return;
                setCoffees(await new CoffeeRepository().getAll(user.id));
                setGrinders(await new GrinderRepository().getAll(user.id));
            };
            fetchData();
        }, [user?.id])
    );

    const resetForm = () => {
        setSelectedCoffeeId(undefined);
        setSelectedGrinderId(undefined);
        setDoseIn(DEFAULTS.doseIn);
        setDoseOut(DEFAULTS.doseOut);
        setTime(DEFAULTS.time);
        setTemp(DEFAULTS.temp);
        setGrindSetting(DEFAULTS.grindSetting);
        setRating(0);
        setBody(1);
        setAcidity(5);
        setBitterness(5);
        setTasteNotes([]);
        setTimerSeconds(0);
    };

    const notify = (title: string, message: string) => {
        if (Platform.OS === 'web') window.alert(message);
        else Alert.alert(title, message);
    };

    const handleSave = async () => {
        if (!selectedCoffeeId || !selectedGrinderId) {
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            notify('Almost there', 'Please select a coffee and grinder first.');
            return;
        }
        setSaving(true);
        try {
            const brew = new BrewBuilder()
                .setEquipment(selectedCoffeeId, selectedGrinderId)
                .setRecipe(parseFloat(doseIn), parseFloat(doseOut), parseFloat(time), parseFloat(temp))
                .setGrindSetting(grindSetting)
                .setRating(rating)
                .setScore({ body, acidity, bitterness, tasteNotes })
                .build();
            brew.userId = user?.id;
            await new BrewRepository().create(brew);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            resetForm();
            router.back();
        } catch (e) {
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            notify('Could not save', 'Error saving brew: ' + e);
        } finally {
            setSaving(false);
        }
    };

    const selectedCoffee = coffees.find(c => c.id === selectedCoffeeId);
    const selectedGrinder = grinders.find(g => g.id === selectedGrinderId);
    const fresh = getFreshness(selectedCoffee?.roastDate);

    const nIn = parseFloat(doseIn);
    const nOut = parseFloat(doseOut);
    const nTime = parseFloat(time);
    const ratioLabel = formatRatio(nIn, nOut);
    const flowLabel = formatFlowRate(nOut, nTime);
    const style = nIn > 0 && nOut > 0 ? brewStyle(nIn, nOut) : '–';

    return (
        <Box flex={1} backgroundColor="mainBackground">
            <Box
                flexDirection="row"
                alignItems="center"
                gap="m"
                paddingHorizontal="m"
                style={{ paddingTop: (insets.top || 12) + 8, paddingBottom: 8 }}
            >
                <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
                    <Ionicons name="close" size={26} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <Box flex={1}>
                    <Text color="textPrimary" style={{ fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: -0.5 }}>New brew</Text>
                </Box>
                <TouchableOpacity onPress={resetForm} hitSlop={8}>
                    <Text variant="label" color="primary" fontWeight="bold" textTransform="uppercase">Reset</Text>
                </TouchableOpacity>
            </Box>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: theme.spacing.m, paddingBottom: 120, gap: theme.spacing.l, ...contentColumn(700) }}>

                {/* Equipment */}
                <Box>
                    <SectionHeader title="Equipment" />
                    <Box gap="m">
                        <SelectField
                            label="Coffee"
                            value={selectedCoffee?.name}
                            placeholder="Select coffee"
                            onPress={() => setShowCoffeeModal(true)}
                        />
                        {fresh && (
                            <Box flexDirection="row" alignItems="center" gap="xs">
                                <Chip label={fresh.label} tone={fresh.tone} small />
                                <Text variant="caption" color="textSecondary">{fresh.days}d off roast · {fresh.detail}</Text>
                            </Box>
                        )}
                        <SelectField
                            label="Grinder"
                            value={selectedGrinder?.name}
                            placeholder="Select grinder"
                            onPress={() => setShowGrinderModal(true)}
                        />
                    </Box>

                    <SelectionModal
                        visible={showCoffeeModal}
                        onClose={() => setShowCoffeeModal(false)}
                        title="Select Coffee"
                        items={coffees.map(c => ({ id: c.id!, label: c.name, subLabel: c.roastery }))}
                        onSelect={(item) => setSelectedCoffeeId(Number(item.id))}
                        selectedId={selectedCoffeeId}
                    />
                    <SelectionModal
                        visible={showGrinderModal}
                        onClose={() => setShowGrinderModal(false)}
                        title="Select Grinder"
                        items={grinders.map(g => ({ id: g.id!, label: g.name, subLabel: `${g.brand} ${g.model}` }))}
                        onSelect={(item) => setSelectedGrinderId(Number(item.id))}
                        selectedId={selectedGrinderId}
                    />
                </Box>

                {/* Recipe */}
                <Box>
                    <SectionHeader title="Recipe" />
                    <Box flexDirection="row" gap="m" marginBottom="m">
                        <TextField label="Dose in" value={doseIn} onChangeText={setDoseIn} keyboardType="decimal-pad" suffix="g" />
                        <TextField label="Yield" value={doseOut} onChangeText={setDoseOut} keyboardType="decimal-pad" suffix="g" />
                    </Box>
                    <Box flexDirection="row" gap="m" marginBottom="m">
                        <TextField label="Time" value={time} onChangeText={setTime} keyboardType="decimal-pad" suffix="s" />
                        <TextField label="Temp" value={temp} onChangeText={setTemp} keyboardType="decimal-pad" suffix="°C" />
                    </Box>

                    {/* Live metrics */}
                    <Card elevated padding="m">
                        <Box flexDirection="row" justifyContent="space-between">
                            <LiveMetric label="Ratio" value={ratioLabel} />
                            <Box width={1} backgroundColor="border" />
                            <LiveMetric label="Flow" value={flowLabel} />
                            <Box width={1} backgroundColor="border" />
                            <LiveMetric label="Style" value={style} />
                        </Box>
                    </Card>

                    <Box height={theme.spacing.m} />
                    <GrindSelector value={grindSetting} onChange={setGrindSetting} />
                </Box>

                {/* Timer */}
                <Card elevated padding="l">
                    <Box alignItems="center">
                        <Box flexDirection="row" alignItems="center" gap="s" marginBottom="s">
                            <Box
                                width={6}
                                height={6}
                                borderRadius={3}
                                backgroundColor={isTimerRunning ? 'primary' : 'borderWeak'}
                            />
                            <Text variant="label" textTransform="uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', letterSpacing: 2 }} color="textTertiary">
                                {isTimerRunning ? 'Pulling' : 'Shot Timer'}
                            </Text>
                        </Box>
                        <Animated.View style={{ transform: [{ scale: pulseAnim }], marginBottom: 14 }}>
                            <TimerDisplay seconds={timerSeconds} />
                        </Animated.View>
                        <Box flexDirection="row" gap="m">
                            {!isTimerRunning ? (
                                <TouchableOpacity onPress={handleStartTimer} activeOpacity={0.85}>
                                    <Box backgroundColor="primary" paddingHorizontal="xl" paddingVertical="m" borderRadius={radii.full}>
                                        <Text variant="body" fontWeight="bold" color="onPrimary">
                                            {timerSeconds > 0 ? 'Resume' : 'Start'}
                                        </Text>
                                    </Box>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity onPress={handleStopTimer} activeOpacity={0.85}>
                                    <Box backgroundColor="errorMuted" paddingHorizontal="xl" paddingVertical="m" borderRadius={radii.full}>
                                        <Text variant="body" fontWeight="bold" color="error">Stop</Text>
                                    </Box>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={handleResetTimer} activeOpacity={0.85}>
                                <Box backgroundColor="surface" paddingHorizontal="l" paddingVertical="m" borderRadius={radii.full}>
                                    <Text variant="body" fontWeight="bold" color="textSecondary">Reset</Text>
                                </Box>
                            </TouchableOpacity>
                        </Box>
                        {/* Close the loop: show that Stop wrote the value into the Time field. */}
                        {!isTimerRunning && timerSeconds > 0 ? (
                            <Text variant="caption" color="textTertiary" marginTop="m">
                                Time field set to {timerSeconds.toFixed(1)} s
                            </Text>
                        ) : null}
                    </Box>
                </Card>

                {/* Rating */}
                <Box>
                    <SectionHeader title="Overall Shot" />
                    <Card padding="l">
                        <StarRating value={rating} onChange={setRating} size={38} showNumeric />
                    </Card>
                </Box>

                {/* Taste */}
                <Box>
                    <SectionHeader title="Taste Profile" />
                    <Text variant="body" marginBottom="s">Body</Text>
                    <BodySelector value={body} onChange={setBody} />
                    <Box height={20} />
                    <ScaleSlider label="ACIDITY" value={acidity} onChange={setAcidity} gradientColors={['#90EE90', '#FFFF00', '#FFA500']} />
                    <ScaleSlider label="BITTERNESS" value={bitterness} onChange={setBitterness} gradientColors={['#D4A574', '#8B4513', '#2F1A0E']} />
                    <TasteWheel selectedNotes={tasteNotes} onNotesChange={setTasteNotes} />
                </Box>

                <Button label="Save Brew Log" onPress={handleSave} loading={saving} disabled={saving} />
            </ScrollView>
            </KeyboardAvoidingView>
        </Box>
    );
}

const LiveMetric = ({ label, value }: { label: string; value: string }) => (
    <Box flex={1} alignItems="center">
        <Text color="primary" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 19, fontWeight: '700' }} numberOfLines={1}>{value}</Text>
        <Text variant="label" textTransform="uppercase" marginTop="xs" style={{ fontFamily: 'JetBrainsMono_400Regular', letterSpacing: 1 }} color="textTertiary">{label}</Text>
    </Box>
);

/**
 * Big tabular timer readout. Split into whole-seconds and tenths so the digits
 * don't jitter on every rAF tick, and color-banded around the espresso target window
 * (25–32s = primary amber, >32s warns).
 */
const TimerDisplay = ({ seconds }: { seconds: number }) => {
    const theme = useTheme();
    const whole = Math.floor(seconds);
    const tenth = Math.floor((seconds - whole) * 10);
    const color =
        seconds === 0 ? theme.colors.textTertiary
        : seconds < 18 ? theme.colors.textPrimary
        : seconds <= 32 ? theme.colors.primary
        : theme.colors.error;

    return (
        <Box flexDirection="row" alignItems="baseline">
            <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 64, fontWeight: '700', letterSpacing: -1.5, color, fontVariant: ['tabular-nums'] }}>
                {whole.toString().padStart(2, '0')}
            </Text>
            <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 30, fontWeight: '600', color, fontVariant: ['tabular-nums'], marginLeft: 2 }}>
                .{tenth}
            </Text>
            <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 18, fontWeight: '600', color: theme.colors.textTertiary, marginLeft: 6 }}>
                s
            </Text>
        </Box>
    );
};
