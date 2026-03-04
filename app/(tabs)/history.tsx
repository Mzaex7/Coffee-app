import React, { useEffect, useState } from 'react';
import { ScrollView, RefreshControl, TouchableOpacity, Modal, Alert } from 'react-native';
import { Box, Text, useTheme } from '../../src/presentation/theme';
import { BrewRepository } from '../../src/data/repositories/BrewRepository';
import { BrewLog } from '../../src/domain/entities/BrewLog';
import { CoffeeRepository } from '../../src/data/repositories/CoffeeRepository';
import { Coffee } from '../../src/domain/entities/Coffee';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/domain/context/AuthContext';

export default function HistoryScreen() {
    const theme = useTheme();
    const { user } = useAuth();
    const [brews, setBrews] = useState<BrewLog[]>([]);
    const [coffees, setCoffees] = useState<Record<number, Coffee>>({});
    const [refreshing, setRefreshing] = useState(false);
    const [selectedBrew, setSelectedBrew] = useState<BrewLog | null>(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);

    const loadData = async () => {
        if (!user?.id) return;
        const brewRepo = new BrewRepository();
        const allBrews = await brewRepo.getAll(user.id);
        // Sort by date descending
        allBrews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setBrews(allBrews);

        const coffeeRepo = new CoffeeRepository();
        const allCoffees = await coffeeRepo.getAll(user.id);
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
        Alert.alert(
            'Delete Brew Log',
            'Are you sure you want to delete this brew log?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const brewRepo = new BrewRepository();
                        await brewRepo.delete(selectedBrew.id!);
                        setDetailModalVisible(false);
                        setSelectedBrew(null);
                        loadData();
                    },
                },
            ]
        );
    };

    const openDetail = (brew: BrewLog) => {
        setSelectedBrew(brew);
        setDetailModalVisible(true);
    };

    return (
        <Box flex={1} backgroundColor="mainBackground">
            <ScrollView
                contentContainerStyle={{ padding: theme.spacing.m }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            >
                {brews.length === 0 ? (
                    <Box padding="xl" alignItems="center">
                        <Text variant="body" color="textSecondary">No brews logged yet.</Text>
                    </Box>
                ) : (
                    brews.map((brew) => (
                        <TouchableOpacity key={brew.id} onPress={() => openDetail(brew)} activeOpacity={0.7}>
                            <Box
                                backgroundColor="cardPrimaryBackground"
                                padding="m"
                                borderRadius={12}
                                marginBottom="m"
                                borderLeftWidth={4}
                                borderLeftColor="primary"
                            >
                                <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="s">
                                    <Text variant="subheader" fontSize={16} color="textPrimary">
                                        {coffees[brew.coffeeId]?.name || 'Unknown Coffee'}
                                    </Text>
                                    <Text variant="caption" color="textSecondary">
                                        {new Date(brew.date).toLocaleDateString()}
                                    </Text>
                                </Box>

                                <Box flexDirection="row" gap="m" marginBottom="s">
                                    <Text variant="body" fontSize={14}>
                                        in: <Text variant="body" color="primary" fontWeight="bold">{brew.doseIn}g</Text>
                                    </Text>
                                    <Text variant="body" fontSize={14}>
                                        out: <Text variant="body" color="primary" fontWeight="bold">{brew.doseOut}g</Text>
                                    </Text>
                                    <Text variant="body" fontSize={14}>
                                        time: <Text variant="body" color="primary" fontWeight="bold">{brew.timeSeconds}s</Text>
                                    </Text>
                                </Box>

                                {brew.score && (
                                    <Box flexDirection="row" gap="s" flexWrap="wrap">
                                        {brew.score.tasteNotes?.map((note, idx) => (
                                            <Box key={idx} backgroundColor="mainBackground" paddingHorizontal="s" paddingVertical="xs" borderRadius={4}>
                                                <Text variant="caption" fontSize={10} color="textSecondary">{note}</Text>
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            {/* Detail Modal */}
            <Modal
                visible={detailModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setDetailModalVisible(false)}
            >
                <Box flex={1} justifyContent="center" alignItems="center" backgroundColor="overlayBackground" padding="m">
                    <Box width="90%" backgroundColor="cardPrimaryBackground" borderRadius={16} padding="l" maxHeight="80%">
                        {selectedBrew && (
                            <ScrollView>
                                <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="m">
                                    <Text variant="header" fontSize={20}>{coffees[selectedBrew.coffeeId]?.name || 'Unknown'}</Text>
                                    <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                                        <Text variant="body" color="textSecondary">Close</Text>
                                    </TouchableOpacity>
                                </Box>

                                <Text variant="caption" color="textSecondary" marginBottom="l">
                                    {new Date(selectedBrew.date).toLocaleString()}
                                </Text>

                                <Box flexDirection="row" flexWrap="wrap" gap="l" marginBottom="l">
                                    <Box>
                                        <Text variant="caption" color="textSecondary">Dose In</Text>
                                        <Text variant="subheader">{selectedBrew.doseIn}g</Text>
                                    </Box>
                                    <Box>
                                        <Text variant="caption" color="textSecondary">Dose Out</Text>
                                        <Text variant="subheader">{selectedBrew.doseOut}g</Text>
                                    </Box>
                                    <Box>
                                        <Text variant="caption" color="textSecondary">Time</Text>
                                        <Text variant="subheader">{selectedBrew.timeSeconds}s</Text>
                                    </Box>
                                    <Box>
                                        <Text variant="caption" color="textSecondary">Ratio</Text>
                                        <Text variant="subheader">1:{(selectedBrew.doseOut / selectedBrew.doseIn).toFixed(1)}</Text>
                                    </Box>
                                    <Box>
                                        <Text variant="caption" color="textSecondary">Grind</Text>
                                        <Text variant="subheader">{selectedBrew.grindSetting}</Text>
                                    </Box>
                                </Box>

                                <Box marginBottom="l">
                                    <Text variant="subheader" marginBottom="s" fontSize={16}>Taste Profile</Text>
                                    <Text variant="body">Body: {['Watery', 'Light', 'Medium', 'Heavy', 'Syrupy'][selectedBrew.score.body] || selectedBrew.score.body}</Text>
                                    <Text variant="body">Acidity: {selectedBrew.score.acidity}/10</Text>
                                    <Text variant="body">Bitterness: {selectedBrew.score.bitterness}/10</Text>
                                </Box>

                                {selectedBrew.score.tasteNotes && selectedBrew.score.tasteNotes.length > 0 && (
                                    <Box marginBottom="l">
                                        <Text variant="subheader" marginBottom="s" fontSize={16}>Notes</Text>
                                        <Box flexDirection="row" flexWrap="wrap" gap="s">
                                            {selectedBrew.score.tasteNotes.map((note, idx) => (
                                                <Box key={idx} backgroundColor="mainBackground" paddingHorizontal="m" paddingVertical="s" borderRadius={6}>
                                                    <Text variant="body" fontSize={12}>{note}</Text>
                                                </Box>
                                            ))}
                                        </Box>
                                    </Box>
                                )}

                                <Box height={20} />
                                <TouchableOpacity
                                    onPress={handleDelete}
                                    style={{
                                        backgroundColor: theme.colors.error,
                                        padding: 15,
                                        borderRadius: 8,
                                        alignItems: 'center'
                                    }}
                                >
                                    <Text variant="body" color="textPrimary" fontWeight="bold">Delete Log</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </Box>
                </Box>
            </Modal>
        </Box>
    );
}
