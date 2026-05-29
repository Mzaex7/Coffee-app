import React from 'react';
import { TouchableOpacity, ActivityIndicator } from 'react-native';
import { Box, Text, Theme, radii } from '../theme';
import { useTheme } from '@shopify/restyle';

interface ButtonProps {
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    label,
    onPress,
    variant = 'primary',
    disabled = false,
    loading = false,
    icon,
}) => {
    const theme = useTheme<Theme>();

    const bg =
        variant === 'primary' ? 'primary'
        : variant === 'secondary' ? 'secondary'
        : variant === 'danger' ? 'errorMuted'
        : 'transparent';

    const textColor =
        variant === 'outline' ? 'primary'
        : variant === 'ghost' ? 'textSecondary'
        : variant === 'danger' ? 'error'
        : 'onPrimary';

    const border = variant === 'outline' ? 1 : 0;
    const isInactive = disabled || loading;

    return (
        <TouchableOpacity onPress={onPress} disabled={isInactive} activeOpacity={0.8}>
            <Box
                backgroundColor={bg}
                paddingVertical="m"
                paddingHorizontal="l"
                borderRadius={radii.m}
                borderWidth={border}
                borderColor="primary"
                alignItems="center"
                justifyContent="center"
                flexDirection="row"
                gap="s"
                opacity={isInactive ? 0.5 : 1}
            >
                {loading ? (
                    <ActivityIndicator color={variant === 'primary' || variant === 'secondary' ? theme.colors.onPrimary : theme.colors.primary} />
                ) : (
                    <>
                        {icon}
                        <Text variant="body" fontWeight="bold" color={textColor}>
                            {label}
                        </Text>
                    </>
                )}
            </Box>
        </TouchableOpacity>
    );
};
