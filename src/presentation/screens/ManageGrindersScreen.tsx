import React, { useCallback, useState } from 'react';
import { FlatList, Modal, TextInput, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Box, Text, useTheme } from '../theme';
import { GrinderRepository } from '../../data/repositories/GrinderRepository';
import { Grinder } from '../../domain/entities/Grinder';
import { Button } from '../components/Button';
import { Stack } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../domain/context/AuthContext';

export const ManageGrindersScreen = () => {
    const [grinders, setGrinders] = useState<Grinder[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const repo = new GrinderRepository();
    const theme = useTheme();
    const { user } = useAuth();

    const loadGrinders = async () => {
        if (!user?.id) return;
        const data = await repo.getAll(user.id);
        setGrinders(data);
    };

    useFocusEffect(
        useCallback(() => {
            loadGrinders();
        }, [user?.id])
    );

    const handleAdd = async () => {
        if (!name) return;
        await repo.create({ userId: user?.id, name, brand: brand || 'Unknown', model: model || 'Standard' });
        setModalVisible(false);
        setName('');
        setBrand('');
        setModel('');
        loadGrinders();
    };

    const handleDelete = async (id: number) => {
        if (!id) return;
        await repo.delete(id);
        loadGrinders();
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

    const renderItem = ({ item }: { item: Grinder }) => (
        <Swipeable renderRightActions={() => renderRightActions(item.id!)}>
            <Box
                backgroundColor="cardPrimaryBackground"
                padding="m"
                borderRadius={8}
            >
                <Text variant="subheader" fontSize={18}>{item.name}</Text>
                <Text variant="body" color="textSecondary">{item.brand} - {item.model}</Text>
            </Box>
        </Swipeable>
    );

    return (
        <Box flex={1} backgroundColor="mainBackground" padding="m">
            <Stack.Screen options={{ title: 'Manage Grinders', headerBackTitle: 'Back' }} />
            <FlatList
                data={grinders}
                renderItem={renderItem}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                ItemSeparatorComponent={() => <Box height={theme.spacing.s} />}
                ListEmptyComponent={
                    <Text variant="body" textAlign="center" marginTop="xl">No grinders found.</Text>
                }
            />
            <Box marginTop="m">
                <Button label="Add New Grinder" onPress={() => setModalVisible(true)} />
            </Box>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <Box flex={1} justifyContent="center" alignItems="center" backgroundColor="overlayBackground">
                    <Box width="80%" backgroundColor="cardPrimaryBackground" padding="l" borderRadius={10}>
                        <Text variant="subheader" marginBottom="m">Add New Grinder</Text>

                        <TextInput
                            placeholder="Nickname (e.g. My Niche)"
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
                            placeholder="Brand"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={brand}
                            onChangeText={setBrand}
                            style={{
                                backgroundColor: theme.colors.mainBackground,
                                color: theme.colors.textPrimary,
                                padding: 10,
                                borderRadius: 5,
                                marginBottom: 10
                            }}
                        />
                        <TextInput
                            placeholder="Model"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={model}
                            onChangeText={setModel}
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
