import React from 'react';
import { FlatList, TouchableOpacity } from 'react-native';
import { Box, Text, useTheme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';

interface SelectionItem {
    id: number | string;
    label: string;
    subLabel?: string;
}

interface SelectionModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (item: SelectionItem) => void;
    items: SelectionItem[];
    title: string;
    selectedId?: number | string;
}

export const SelectionModal: React.FC<SelectionModalProps> = ({ visible, onClose, onSelect, items, title, selectedId }) => {
    const theme = useTheme();

    return (
        <BottomSheet visible={visible} onClose={onClose} maxHeightPercent={0.8}>
            <Box padding="m">
                <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="m">
                    <Text variant="subheader">{title}</Text>
                    <TouchableOpacity onPress={onClose} hitSlop={8}>
                        <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                </Box>

                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => {
                                onSelect(item);
                                onClose();
                            }}
                            style={{
                                paddingVertical: 16,
                                borderBottomWidth: 1,
                                borderBottomColor: theme.colors.borderWeak,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <Box>
                                <Text
                                    variant="body"
                                    fontWeight={item.id === selectedId ? 'bold' : 'normal'}
                                    color={item.id === selectedId ? 'primary' : 'textPrimary'}
                                >
                                    {item.label}
                                </Text>
                                {item.subLabel && (
                                    <Text variant="caption" color="textSecondary">{item.subLabel}</Text>
                                )}
                            </Box>
                            {item.id === selectedId && (
                                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                            )}
                        </TouchableOpacity>
                    )}
                />
            </Box>
        </BottomSheet>
    );
};
