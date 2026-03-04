import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Box, Text, useTheme } from '../../src/presentation/theme';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Button } from '../../src/presentation/components/Button';
import { BodySelector } from '../../src/presentation/components/BodySelector';
import { ScaleSlider } from '../../src/presentation/components/ScaleSlider';
import { TasteWheel } from '../../src/presentation/components/TasteWheel';
import { SelectionModal } from '../../src/presentation/components/SelectionModal';
import { BrewBuilder } from '../../src/domain/builders/BrewBuilder';
import { BrewRepository } from '../../src/data/repositories/BrewRepository';
import { CoffeeRepository } from '../../src/data/repositories/CoffeeRepository';
import { GrinderRepository } from '../../src/data/repositories/GrinderRepository';
import { Coffee } from '../../src/domain/entities/Coffee';
import { Grinder } from '../../src/domain/entities/Grinder';
import { Ionicons } from '@expo/vector-icons';
import { GrindSelector } from '../../src/presentation/components/GrindSelector';
import { useAuth } from '../../src/domain/context/AuthContext';

export default function BrewLogScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { user } = useAuth();
    const [coffees, setCoffees] = useState<Coffee[]>([]);
    const [grinders, setGrinders] = useState<Grinder[]>([]);
    const [showCoffeeModal, setShowCoffeeModal] = useState(false);
    const [showGrinderModal, setShowGrinderModal] = useState(false);

    // State for BrewBuilder
    const [selectedCoffeeId, setSelectedCoffeeId] = useState<number | undefined>();
    const [selectedGrinderId, setSelectedGrinderId] = useState<number | undefined>();
    const [doseIn, setDoseIn] = useState('18');
    const [doseOut, setDoseOut] = useState('36');
    const [time, setTime] = useState('30');
    const [temp, setTemp] = useState('93');
    const [grindSetting, setGrindSetting] = useState('');

    // Scoring
    const [body, setBody] = useState(1);
    const [acidity, setAcidity] = useState(5);
    const [bitterness, setBitterness] = useState(5);
    const [tasteNotes, setTasteNotes] = useState<string[]>([]);

    // Timer State
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setTimerSeconds(s => s + 0.1);
            }, 100);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning]);

    const handleStartTimer = () => setIsTimerRunning(true);
    const handleStopTimer = () => {
        setIsTimerRunning(false);
        setTime(timerSeconds.toFixed(1));
    };
    const handleResetTimer = () => {
        setIsTimerRunning(false);
        setTimerSeconds(0);
        setTime('0');
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



    const handleSave = async () => {
        if (!selectedCoffeeId || !selectedGrinderId) {
            alert('Please select Coffee and Grinder');
            return;
        }

        try {
            const builder = new BrewBuilder();
            const brew = builder
                .setEquipment(selectedCoffeeId, selectedGrinderId)
                .setRecipe(parseFloat(doseIn), parseFloat(doseOut), parseFloat(time), parseFloat(temp))
                .setGrindSetting(grindSetting)
                .setScore({ body, acidity, bitterness, tasteNotes })
                .build();

            // Set userId before saving
            brew.userId = user?.id;

            await new BrewRepository().create(brew);
            alert('Brew Logged!');
            router.back();
        } catch (e) {
            alert('Error saving brew: ' + e);
        }
    };

    return (
        <Box flex={1} backgroundColor="mainBackground">
            <Stack.Screen options={{ title: 'Log Brew', headerBackTitle: 'Back' }} />
            <ScrollView contentContainerStyle={{ padding: theme.spacing.m, paddingBottom: 100 }}>

                {/* Equipment Selection */}
                <Box marginBottom="l">
                    <Text variant="subheader" marginBottom="m">Equipment</Text>

                    <Box gap="m">
                        <TouchableOpacity onPress={() => setShowCoffeeModal(true)}>
                            <Box
                                backgroundColor="cardPrimaryBackground"
                                padding="m"
                                borderRadius={8}
                                flexDirection="row"
                                justifyContent="space-between"
                                alignItems="center"
                            >
                                <Box>
                                    <Text variant="caption" color="textSecondary">Coffee</Text>
                                    <Text variant="body" fontWeight="bold">
                                        {selectedCoffeeId ? coffees.find(c => c.id === selectedCoffeeId)?.name : "Select Coffee"}
                                    </Text>
                                </Box>
                                <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                            </Box>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowGrinderModal(true)}>
                            <Box
                                backgroundColor="cardPrimaryBackground"
                                padding="m"
                                borderRadius={8}
                                flexDirection="row"
                                justifyContent="space-between"
                                alignItems="center"
                            >
                                <Box>
                                    <Text variant="caption" color="textSecondary">Grinder</Text>
                                    <Text variant="body" fontWeight="bold">
                                        {selectedGrinderId ? grinders.find(g => g.id === selectedGrinderId)?.name : "Select Grinder"}
                                    </Text>
                                </Box>
                                <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                            </Box>
                        </TouchableOpacity>
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
                <Box marginBottom="l">
                    <Text variant="subheader" marginBottom="m">Recipe</Text>
                    <Box flexDirection="row" gap="m" marginBottom="m">
                        <InputField label="Dose In (g)" value={doseIn} onChange={setDoseIn} keyboardType="decimal-pad" />
                        <InputField label="Dose Out (g)" value={doseOut} onChange={setDoseOut} keyboardType="decimal-pad" />
                    </Box>
                    <Box flexDirection="row" gap="m" marginBottom="m">
                        <InputField label="Time (s)" value={time} onChange={setTime} keyboardType="decimal-pad" />
                        <InputField label="Temp (°C)" value={temp} onChange={setTemp} keyboardType="decimal-pad" />
                    </Box>
                    <GrindSelector value={grindSetting} onChange={setGrindSetting} />
                </Box>

                {/* Built-in Timer */}
                <Box marginBottom="l" backgroundColor="cardPrimaryBackground" padding="m" borderRadius={16} alignItems="center">
                    <Text variant="caption" color="textSecondary" marginBottom="s" textTransform="uppercase" letterSpacing={1}>Shot Timer</Text>
                    <Text variant="header" fontSize={48} fontWeight="900" style={{ fontVariant: ['tabular-nums'] }} marginBottom="m">
                        {timerSeconds.toFixed(1)}s
                    </Text>
                    <Box flexDirection="row" gap="m">
                        {!isTimerRunning ? (
                            <TouchableOpacity onPress={handleStartTimer}>
                                <Box backgroundColor="primary" paddingHorizontal="xl" paddingVertical="m" borderRadius={30}>
                                    <Text variant="body" fontWeight="bold" color="white">Start</Text>
                                </Box>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={handleStopTimer}>
                                <Box backgroundColor="error" paddingHorizontal="xl" paddingVertical="m" borderRadius={30}>
                                    <Text variant="body" fontWeight="bold" color="white">Stop</Text>
                                </Box>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={handleResetTimer}>
                            <Box backgroundColor="surface" paddingHorizontal="l" paddingVertical="m" borderRadius={30}>
                                <Text variant="body" fontWeight="bold" color="textSecondary">Reset</Text>
                            </Box>
                        </TouchableOpacity>
                    </Box>
                </Box>

                {/* Taste Profile */}
                <Box marginBottom="l">
                    <Text variant="subheader" marginBottom="m">Taste Profile</Text>

                    <Text variant="body" marginBottom="s">Body</Text>
                    <BodySelector value={body} onChange={setBody} />

                    <Box height={20} />

                    <ScaleSlider
                        label="ACIDITY"
                        value={acidity}
                        onChange={setAcidity}
                        gradientColors={['#90EE90', '#FFFF00', '#FFA500']}
                    />

                    <ScaleSlider
                        label="BITTERNESS"
                        value={bitterness}
                        onChange={setBitterness}
                        gradientColors={['#D4A574', '#8B4513', '#2F1A0E']}
                    />

                    <TasteWheel selectedNotes={tasteNotes} onNotesChange={setTasteNotes} />
                </Box>

                <Button label="Save Brew Log" onPress={handleSave} />
            </ScrollView>
        </Box>
    );
}

const InputField = ({ label, value, onChange, placeholder, keyboardType = 'numeric' }: any) => {
    const theme = useTheme();
    return (
        <Box flex={1}>
            <Text variant="caption" marginBottom="s">{label}</Text>
            <TextInput
                style={{
                    backgroundColor: theme.colors.cardPrimaryBackground,
                    color: theme.colors.textPrimary,
                    padding: theme.spacing.m,
                    borderRadius: 8,
                }}
                value={value}
                onChangeText={onChange}
                keyboardType={keyboardType}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.textSecondary}
            />
        </Box>
    );
};
