import React from 'react';
import { TouchableOpacity, View, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Box, Text, useTheme } from '../theme';

interface StarRatingProps {
    /** Current value, in 0.5 steps from 0 to 5. */
    value: number;
    onChange?: (value: number) => void;
    /** Star size in pixels — also drives hit-target size. */
    size?: number;
    readonly?: boolean;
    /** Show the numeric value (e.g. "4.5 / 5") under the stars. */
    showNumeric?: boolean;
}

/**
 * Half-step star rating. Each star has two stacked hit zones:
 *   left half → value = (star − 0.5)
 *   right half → value = star
 * Tapping the current value clears it back to 0.
 */
export const StarRating: React.FC<StarRatingProps> = ({
    value,
    onChange,
    size = 36,
    readonly = false,
    showNumeric = false,
}) => {
    const theme = useTheme();

    const setTo = (next: number) => {
        if (readonly || !onChange) return;
        const final = value === next ? 0 : next;
        if (Platform.OS !== 'web') Haptics.selectionAsync();
        onChange(final);
    };

    const renderGlyph = (star: number) => {
        const filled = value >= star;
        const half = !filled && value >= star - 0.5;
        const iconName = filled ? 'star' : half ? 'star-half-full' : 'star-outline';
        const color = filled || half ? theme.colors.gold : theme.colors.textTertiary;
        return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
    };

    return (
        <Box alignItems="center">
            <Box flexDirection="row">
                {[1, 2, 3, 4, 5].map((star) => (
                    <View key={star} style={{ width: size, height: size, marginHorizontal: 3 }}>
                        {/* Glyph */}
                        <View style={{ position: 'absolute', left: 0, top: 0 }}>
                            {renderGlyph(star)}
                        </View>
                        {/* Hit zones — only when interactive. */}
                        {!readonly && (
                            <View style={{ flexDirection: 'row', width: size, height: size }}>
                                <TouchableOpacity
                                    activeOpacity={0.6}
                                    onPress={() => setTo(star - 0.5)}
                                    style={{ width: size / 2, height: size }}
                                />
                                <TouchableOpacity
                                    activeOpacity={0.6}
                                    onPress={() => setTo(star)}
                                    style={{ width: size / 2, height: size }}
                                />
                            </View>
                        )}
                    </View>
                ))}
            </Box>
            {showNumeric ? (
                <Text
                    marginTop="s"
                    color="textSecondary"
                    style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 13, letterSpacing: 0.5 }}
                >
                    {value > 0 ? `${value.toFixed(1)} / 5` : 'Tap a star — left for half'}
                </Text>
            ) : null}
        </Box>
    );
};
