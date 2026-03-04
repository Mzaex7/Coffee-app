import React, { useCallback, useState } from 'react';
import { FlatList, Modal, TextInput, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Box, Text, useTheme } from '../theme';
import { CoffeeRepository } from '../../data/repositories/CoffeeRepository';
import { Coffee } from '../../domain/entities/Coffee';
import { Button } from '../components/Button';
import { Stack } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../domain/context/AuthContext';

export const ManageCoffeesScreen = () => {
    const [coffees, setCoffees] = useState<Coffee[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState('');
    const [roastery, setRoastery] = useState('');
    const repo = new CoffeeRepository();
    const theme = useTheme();
    const { user } = useAuth();

    const loadCoffees = async () => {
        if (!user?.id) return;
        const data = await repo.getAll(user.id);
        setCoffees(data);
    };

    useFocusEffect(
        useCallback(() => {
            loadCoffees();
        }, [user?.id])
    );

    const handleAdd = async () => {
        if (!name) return;
        await repo.create({ userId: user?.id, name, roastery: roastery || 'Unknown', origin: 'Unknown', process: 'Washed' });
        setModalVisible(false);
        setName('');
        setRoastery('');
        loadCoffees();
    };

    const handleDelete = async (id: number) => {
        await repo.delete(id);
        loadCoffees();
    };

    const renderRightActions = (id: number) => {
        return (
            <TouchableOpacity onPress={() => handleDelete(id)} style={{ justifyContent: 'center', alignItems: 'center', width: 80, height: '100%' }}>
                <Box flex={1} backgroundColor="error" justifyContent="center" alignItems="center" width="100%" borderRadius={8}>
                    <Ionicons name="trash-outline" size={24} color="white" />
                </Box>
            </TouchableOpacity>
        );
    };

    const renderItem = ({ item }: { item: Coffee }) => (
        <Swipeable renderRightActions={() => renderRightActions(item.id!)}>
            <Box
                backgroundColor="cardPrimaryBackground"
                padding="m"
                borderRadius={8}
            >
                <Text variant="subheader" fontSize={18}>{item.name}</Text>
                <Text variant="body" color="textSecondary">{item.roastery}</Text>
                <Text variant="caption">{item.origin} - {item.process}</Text>
            </Box>
        </Swipeable>
    );

    return (
        <Box flex={1} backgroundColor="mainBackground" padding="m">
            <Stack.Screen options={{ title: 'Manage Coffees', headerBackTitle: 'Back' }} />
            <FlatList
                data={coffees}
                renderItem={renderItem}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                ItemSeparatorComponent={() => <Box height={theme.spacing.s} />}
                ListEmptyComponent={
                    <Text variant="body" textAlign="center" marginTop="xl">No coffees found.</Text>
                }
            />
            <Box marginTop="m">
                <Button label="Add New Coffee" onPress={() => setModalVisible(true)} />
            </Box>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <Box flex={1} justifyContent="center" alignItems="center" backgroundColor="overlayBackground">
                    <Box width="80%" backgroundColor="cardPrimaryBackground" padding="l" borderRadius={10}>
                        <Text variant="subheader" marginBottom="m">Add New Coffee</Text>

                        <TextInput
                            placeholder="Coffee Name"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={name}
                            onChangeText={setName}
                            style={{
                                backgroundColor: theme.colors.mainBackground,
                                color: theme.colors.textPrimary,
                                padding: 10,
                                borderRadius: 5,
                                marginBottom: 10
                            }}
                        />
                        <TextInput
                            placeholder="Roastery"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={roastery}
                            onChangeText={setRoastery}
                            style={{
                                backgroundColor: theme.colors.mainBackground,
                                color: theme.colors.textPrimary,
                                padding: 10,
                                borderRadius: 5,
                                marginBottom: 20
                            }}
                        />

                        <Box flexDirection="row" justifyContent="space-between">
                            <Button label="Cancel" variant="outline" onPress={() => setModalVisible(false)} />
                            <Box width={10} />
                            <Button label="Save" onPress={handleAdd} />
                        </Box>
                    </Box>
                </Box>
            </Modal>
        </Box>
    );
};
