import React, { useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { FlatList, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { BottomSheet } from '../components/BottomSheet';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Box, Text, useTheme, radii, useIsWide, contentColumn } from '../theme';
import { GrinderRepository } from '../../data/repositories/GrinderRepository';
import { Grinder } from '../../domain/entities/Grinder';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { TextField } from '../components/Field';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../../domain/context/AuthContext';
import type { ShelfPanelHandle } from './ManageCoffeesScreen';

const emptyForm = {
    id: undefined as number | undefined,
    name: '',
    brand: '',
    model: '',
    description: '',
};

export const ManageGrindersScreen = forwardRef<ShelfPanelHandle, { embedded?: boolean }>((_props, ref) => {
    const [grinders, setGrinders] = useState<Grinder[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [form, setForm] = useState(emptyForm);

    const repo = new GrinderRepository();
    const theme = useTheme();
    const isWide = useIsWide();
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

    const openAdd = () => {
        setForm(emptyForm);
        setModalVisible(true);
    };

    useImperativeHandle(ref, () => ({ openAdd }));

    const openEdit = (grinder: Grinder) => {
        setForm({
            id: grinder.id,
            name: grinder.name,
            brand: grinder.brand ?? '',
            model: grinder.model ?? '',
            description: grinder.description ?? '',
        });
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) return;
        const payload: Grinder = {
            userId: user?.id,
            name: form.name.trim(),
            brand: form.brand.trim() || 'Unknown',
            model: form.model.trim() || 'Standard',
            description: form.description.trim() || undefined,
        };
        if (form.id) {
            await repo.update({ ...payload, id: form.id });
        } else {
            await repo.create(payload);
        }
        setModalVisible(false);
        setForm(emptyForm);
        loadGrinders();
    };

    const handleDelete = async (id: number) => {
        if (!id) return;
        await repo.delete(id);
        loadGrinders();
    };

    const renderRightActions = (id: number) => (
        <TouchableOpacity onPress={() => handleDelete(id)} activeOpacity={0.8} style={{ width: 80, paddingLeft: 8 }}>
            <Box flex={1} backgroundColor="errorMuted" justifyContent="center" alignItems="center" borderRadius={radii.l}>
                <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
            </Box>
        </TouchableOpacity>
    );

    const renderItem = ({ item }: { item: Grinder }) => (
        <Swipeable containerStyle={isWide ? { flex: 1 } : undefined} renderRightActions={() => renderRightActions(item.id!)}>
            <Card onPress={() => openEdit(item)} padding="m">
                <Box flexDirection="row" alignItems="center" gap="m">
                    <Box
                        width={44}
                        height={44}
                        borderRadius={radii.m}
                        backgroundColor="primaryMuted"
                        alignItems="center"
                        justifyContent="center"
                    >
                        <Ionicons name="cog-outline" size={22} color={theme.colors.primary} />
                    </Box>
                    <Box flex={1}>
                        <Text variant="title" numberOfLines={1}>{item.name}</Text>
                        <Text variant="caption" color="textSecondary" marginTop="xs">{item.brand} · {item.model}</Text>
                    </Box>
                </Box>
                {item.description ? (
                    <Text variant="body" color="textSecondary" marginTop="m">{item.description}</Text>
                ) : null}
            </Card>
        </Swipeable>
    );

    return (
        <Box flex={1}>
            <FlatList
                data={grinders}
                renderItem={renderItem}
                keyExtractor={(item, index) => (item.id ?? `i${index}`).toString()}
                key={isWide ? 'grid' : 'list'}
                numColumns={isWide ? 2 : 1}
                columnWrapperStyle={isWide ? { gap: theme.spacing.s } : undefined}
                contentContainerStyle={{ paddingHorizontal: theme.spacing.m, paddingTop: theme.spacing.s, paddingBottom: 130, ...contentColumn() }}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <Box height={theme.spacing.s} />}
                ListEmptyComponent={
                    <Box marginTop="xl">
                        <EmptyState
                            icon="cog-outline"
                            title="No grinders yet"
                            subtitle="Add your grinder so you can track which setting nailed each shot."
                            action={{ label: 'Add Grinder', onPress: openAdd }}
                        />
                    </Box>
                }
            />

            <BottomSheet visible={modalVisible} onClose={() => setModalVisible(false)} maxHeightPercent={0.92}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <Box flexDirection="row" justifyContent="space-between" alignItems="center" padding="l" paddingBottom="s">
                        <Text variant="subheader">{form.id ? 'Edit Grinder' : 'New Grinder'}</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={8}>
                            <Ionicons name="close" size={26} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </Box>

                    <ScrollView contentContainerStyle={{ padding: theme.spacing.l, paddingTop: 0, gap: theme.spacing.m }}>
                        <TextField label="Nickname" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="e.g. My Niche" />
                        <Box flexDirection="row" gap="m">
                            <TextField label="Brand" value={form.brand} onChangeText={(v) => setForm({ ...form, brand: v })} placeholder="e.g. Niche" />
                            <TextField label="Model" value={form.model} onChangeText={(v) => setForm({ ...form, model: v })} placeholder="e.g. Zero" />
                        </Box>
                        <TextField label="Notes" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholder="Burr type, baseline setting…" multiline />

                        <Box flexDirection="row" gap="m" marginTop="s">
                            <Box flex={1}>
                                <Button label="Cancel" variant="outline" onPress={() => setModalVisible(false)} />
                            </Box>
                            <Box flex={1}>
                                <Button label={form.id ? 'Save' : 'Add'} onPress={handleSave} disabled={!form.name.trim()} />
                            </Box>
                        </Box>
                    </ScrollView>
                </KeyboardAvoidingView>
            </BottomSheet>
        </Box>
    );
});

ManageGrindersScreen.displayName = 'ManageGrindersScreen';
