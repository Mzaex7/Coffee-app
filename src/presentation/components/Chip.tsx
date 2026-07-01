import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Box, Text, useTheme, radii } from '../theme';

type ChipTone = 'neutral' | 'primary' | 'success' | 'error' | 'accent';

interface ChipProps {
    label: string;
    tone?: ChipTone;
    selected?: boolean;
    onPress?: () => void;
    icon?: React.ReactNode;
    small?: boolean;
}

export const Chip: React.FC<ChipProps> = ({
    label,
    tone = 'neutral',
    selected = false,
    onPress,
    icon,
    small = false,
}) => {
    const theme = useTheme();

    const toneColor =
        tone === 'primary' ? theme.colors.primary
        : tone === 'success' ? theme.colors.success
        : tone === 'error' ? theme.colors.error
        : tone === 'accent' ? theme.colors.accent
        : theme.colors.textSecondary;

    const bg = selected
        ? toneColor
        : tone === 'neutral' ? theme.colors.surface
        : `${toneColor}22`;

    const fg = selected
        ? (tone === 'neutral' ? theme.colors.textPrimary : theme.colors.onPrimary)
        : toneColor;

    const inner = (
        <Box
            flexDirection="row"
            alignItems="center"
            gap="xs"
            paddingHorizontal={small ? 's' : 'm'}
            paddingVertical={small ? 'xs' : 's'}
            borderRadius={radii.full}
            style={{ backgroundColor: bg }}
        >
            {icon}
            <Text
                variant="caption"
                fontWeight="600"
                fontSize={small ? 11 : 13}
                style={{ color: fg }}
            >
                {label}
            </Text>
        </Box>
    );

    if (onPress) {
        // hitSlop lifts interactive chips to the ~44pt iOS touch target even
        // when they're visually compact.
        return (
            <TouchableOpacity onPress={onPress} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                {inner}
            </TouchableOpacity>
        );
    }
    return inner;
};
