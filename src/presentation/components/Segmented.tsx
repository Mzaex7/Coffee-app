import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Box, Text, radii } from '../theme';

interface SegmentedProps<T extends string> {
    options: { id: T; label: string }[];
    value: T;
    onChange: (id: T) => void;
}

/**
 * Crema segmented control — a pill-track with a raised active segment.
 * Used to toggle Beans / Grinders on the Shelf.
 */
export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
    return (
        <Box
            flexDirection="row"
            gap="xs"
            backgroundColor="cardPrimaryBackground"
            borderWidth={1}
            borderColor="border"
            borderRadius={radii.m}
            padding="xs"
        >
            {options.map((opt) => {
                const active = opt.id === value;
                return (
                    <TouchableOpacity
                        key={opt.id}
                        onPress={() => onChange(opt.id)}
                        activeOpacity={0.85}
                        style={{ flex: 1 }}
                    >
                        <Box
                            paddingVertical="s"
                            borderRadius={radii.s}
                            alignItems="center"
                            backgroundColor={active ? 'surface' : 'transparent'}
                        >
                            <Text
                                variant="label"
                                fontSize={13}
                                fontWeight="600"
                                color={active ? 'textPrimary' : 'textSecondary'}
                                style={{ fontFamily: 'Inter_600SemiBold' }}
                            >
                                {opt.label}
                            </Text>
                        </Box>
                    </TouchableOpacity>
                );
            })}
        </Box>
    );
}
