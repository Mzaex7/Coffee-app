import React, { useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { FlatList, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Box, Text, useTheme, radii, useIsWide, contentColumn } from '../theme';
import { CoffeeRepository } from '../../data/repositories/CoffeeRepository';
import { Coffee, RoastLevel } from '../../domain/entities/Coffee';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { TextField, SelectField } from '../components/Field';
import { SelectionModal } from '../components/SelectionModal';
import { BottomSheet } from '../components/BottomSheet';
import { EmptyState } from '../components/EmptyState';
import { getFreshness } from '../../utils/freshness';
import { useAuth } from '../../domain/context/AuthContext';

const PROCESS_OPTIONS = ['Washed', 'Natural', 'Honey', 'Anaerobic', 'Other'];
const ROAST_OPTIONS: RoastLevel[] = ['Light', 'Medium-Light', 'Medium', 'Medium-Dark', 'Dark'];

const ROAST_DATE_PRESETS = [
    { label: 'Today', days: 0 },
    { label: '3d ago', days: 3 },
    { label: '1w ago', days: 7 },
    { label: '2w ago', days: 14 },
];

const isoDaysAgo = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
};

const emptyForm = {
    id: undefined as number | undefined,
    name: '',
    roastery: '',
    origin: '',
    variety: '',
    process: '',
    roastLevel: '' as RoastLevel | '',
    roastDate: '',
    notes: '',
};

// Imperative handle so the parent Shelf header's "+" can open this panel's add sheet.
export interface ShelfPanelHandle {
    openAdd: () => void;
}

export const ManageCoffeesScreen = forwardRef<ShelfPanelHandle, { embedded?: boolean }>((_props, ref) => {
    const [coffees, setCoffees] = useState<Coffee[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [processPicker, setProcessPicker] = useState(false);
    const [roastPicker, setRoastPicker] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const repo = new CoffeeRepository();
    const theme = useTheme();
    const isWide = useIsWide();
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

    const onRefresh = async () => {
        setRefreshing(true);
        await loadCoffees();
        setRefreshing(false);
    };

    const openAdd = () => {
        setForm(emptyForm);
        setModalVisible(true);
    };

    useImperativeHandle(ref, () => ({ openAdd }));

    const openEdit = (coffee: Coffee) => {
        setForm({
            id: coffee.id,
            name: coffee.name,
            roastery: coffee.roastery,
            origin: coffee.origin ?? '',
            variety: coffee.variety ?? '',
            process: coffee.process ?? '',
            roastLevel: (coffee.roastLevel as RoastLevel) ?? '',
            roastDate: coffee.roastDate ?? '',
            notes: coffee.notes ?? '',
        });
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) return;
        const payload: Coffee = {
            userId: user?.id,
            name: form.name.trim(),
            roastery: form.roastery.trim() || 'Unknown',
            origin: form.origin.trim() || undefined,
            variety: form.variety.trim() || undefined,
            process: form.process || undefined,
            roastLevel: (form.roastLevel || undefined) as RoastLevel | undefined,
            roastDate: form.roastDate.trim() || undefined,
            notes: form.notes.trim() || undefined,
        };
        if (form.id) {
            await repo.update({ ...payload, id: form.id });
        } else {
            await repo.create(payload);
        }
        setModalVisible(false);
        setForm(emptyForm);
        loadCoffees();
    };

    const handleDelete = async (id: number) => {
        await repo.delete(id);
        loadCoffees();
    };

    const renderRightActions = (id: number) => (
        <TouchableOpacity onPress={() => handleDelete(id)} activeOpacity={0.8} style={{ width: 80, paddingLeft: 8 }}>
            <Box flex={1} backgroundColor="errorMuted" justifyContent="center" alignItems="center" borderRadius={radii.l}>
                <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
            </Box>
        </TouchableOpacity>
    );

    const renderItem = ({ item }: { item: Coffee }) => {
        const fresh = getFreshness(item.roastDate);
        return (
            <Swipeable containerStyle={isWide ? { flex: 1 } : undefined} renderRightActions={() => renderRightActions(item.id!)}>
                <Card onPress={() => openEdit(item)} padding="m">
                    <Box flexDirection="row" justifyContent="space-between" alignItems="flex-start">
                        <Box flex={1} marginRight="s">
                            <Text variant="title" numberOfLines={1}>{item.name}</Text>
                            <Text variant="caption" color="textSecondary" marginTop="xs">{item.roastery}</Text>
                        </Box>
                        {fresh && <Chip label={fresh.label} tone={fresh.tone} small />}
                    </Box>
                    <Box flexDirection="row" flexWrap="wrap" gap="xs" marginTop="m">
                        {item.origin ? <Chip label={item.origin} small /> : null}
                        {item.process ? <Chip label={item.process} tone="accent" small /> : null}
                        {item.roastLevel ? <Chip label={item.roastLevel} tone="primary" small /> : null}
                        {fresh ? <Chip label={`${fresh.days}d off roast`} small /> : null}
                    </Box>
                </Card>
            </Swipeable>
        );
    };

    const formFresh = getFreshness(form.roastDate);

    return (
        <Box flex={1}>
            <FlatList
                data={coffees}
                renderItem={renderItem}
                keyExtractor={(item, index) => (item.id ?? `i${index}`).toString()}
                key={isWide ? 'grid' : 'list'}
                numColumns={isWide ? 2 : 1}
                columnWrapperStyle={isWide ? { gap: theme.spacing.s } : undefined}
                contentContainerStyle={{ paddingHorizontal: theme.spacing.m, paddingTop: theme.spacing.s, paddingBottom: 130, ...contentColumn() }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
                ItemSeparatorComponent={() => <Box height={theme.spacing.s} />}
                ListEmptyComponent={
                    <Box marginTop="xl">
                        <EmptyState
                            icon="coffee-outline"
                            title="No beans yet"
                            subtitle="Add your first bag to start tracking freshness and dialing in shots."
                            action={{ label: 'Add Coffee', onPress: openAdd }}
                        />
                    </Box>
                }
            />

            <BottomSheet visible={modalVisible} onClose={() => setModalVisible(false)} maxHeightPercent={0.92}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <Box flexDirection="row" justifyContent="space-between" alignItems="center" padding="l" paddingBottom="s">
                        <Text variant="subheader">{form.id ? 'Edit Coffee' : 'New Coffee'}</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={8}>
                            <Ionicons name="close" size={26} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </Box>

                    <ScrollView contentContainerStyle={{ padding: theme.spacing.l, paddingTop: 0, gap: theme.spacing.m }}>
                                <TextField label="Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="e.g. Ethiopia Sidamo" />
                                <TextField label="Roastery" value={form.roastery} onChangeText={(v) => setForm({ ...form, roastery: v })} placeholder="e.g. The Barn" />

                                <Box flexDirection="row" gap="m">
                                    <TextField label="Origin" value={form.origin} onChangeText={(v) => setForm({ ...form, origin: v })} placeholder="Country / region" />
                                    <TextField label="Variety" value={form.variety} onChangeText={(v) => setForm({ ...form, variety: v })} placeholder="e.g. Heirloom" />
                                </Box>

                                <Box flexDirection="row" gap="m">
                                    <SelectField label="Process" value={form.process} placeholder="Select" onPress={() => setProcessPicker(true)} />
                                    <SelectField label="Roast level" value={form.roastLevel} placeholder="Select" onPress={() => setRoastPicker(true)} />
                                </Box>

                                <Box>
                                    <Text variant="label" textTransform="uppercase" marginBottom="s">Roast date</Text>
                                    <Box flexDirection="row" flexWrap="wrap" gap="xs" marginBottom="s">
                                        {ROAST_DATE_PRESETS.map((p) => {
                                            const iso = isoDaysAgo(p.days);
                                            return (
                                                <Chip
                                                    key={p.label}
                                                    label={p.label}
                                                    tone="primary"
                                                    selected={form.roastDate === iso}
                                                    onPress={() => setForm({ ...form, roastDate: iso })}
                                                    small
                                                />
                                            );
                                        })}
                                    </Box>
                                    <TextField value={form.roastDate} onChangeText={(v) => setForm({ ...form, roastDate: v })} placeholder="YYYY-MM-DD" autoCapitalize="none" keyboardType="numbers-and-punctuation" />
                                    {formFresh && (
                                        <Box flexDirection="row" alignItems="center" gap="xs" marginTop="s">
                                            <Chip label={formFresh.label} tone={formFresh.tone} small />
                                            <Text variant="caption" color="textSecondary">{formFresh.detail}</Text>
                                        </Box>
                                    )}
                                </Box>

                                <TextField label="Notes" value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} placeholder="Tasting notes, brew ideas…" multiline />

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

            <SelectionModal
                visible={processPicker}
                onClose={() => setProcessPicker(false)}
                onSelect={(item) => setForm({ ...form, process: String(item.id) })}
                items={PROCESS_OPTIONS.map((p) => ({ id: p, label: p }))}
                title="Process"
                selectedId={form.process}
            />
            <SelectionModal
                visible={roastPicker}
                onClose={() => setRoastPicker(false)}
                onSelect={(item) => setForm({ ...form, roastLevel: item.id as RoastLevel })}
                items={ROAST_OPTIONS.map((r) => ({ id: r, label: r }))}
                title="Roast level"
                selectedId={form.roastLevel}
            />
        </Box>
    );
});

ManageCoffeesScreen.displayName = 'ManageCoffeesScreen';
