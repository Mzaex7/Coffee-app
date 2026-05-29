import React from 'react';
import { TouchableOpacity, ViewStyle } from 'react-native';
import { Box, cardShadow, radii } from '../theme';

interface CardProps {
    children: React.ReactNode;
    onPress?: () => void;
    elevated?: boolean;
    padding?: 'none' | 's' | 'm' | 'l';
    style?: ViewStyle;
    accent?: boolean;
}

const PADDING_MAP = { none: undefined, s: 's', m: 'm', l: 'l' } as const;

export const Card: React.FC<CardProps> = ({
    children,
    onPress,
    elevated = false,
    padding = 'l',
    style,
    accent = false,
}) => {
    const content = (
        <Box
            backgroundColor={elevated ? 'cardElevated' : 'cardPrimaryBackground'}
            borderRadius={radii.l}
            padding={PADDING_MAP[padding]}
            borderWidth={1}
            borderColor={accent ? 'primary' : 'border'}
            style={[elevated ? cardShadow : null, style] as ViewStyle[]}
        >
            {children}
        </Box>
    );

    if (onPress) {
        return (
            <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
                {content}
            </TouchableOpacity>
        );
    }
    return content;
};
