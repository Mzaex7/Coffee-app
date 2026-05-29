import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Box, Text, useTheme, radii } from '../theme';
import { Button } from './Button';

interface EmptyStateProps {
    icon?: keyof typeof MaterialCommunityIcons.glyphMap;
    title: string;
    subtitle?: string;
    action?: { label: string; onPress: () => void };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon = 'coffee-outline', title, subtitle, action }) => {
    const theme = useTheme();
    return (
        <Box
            backgroundColor="cardPrimaryBackground"
            borderRadius={radii.l}
            borderWidth={1}
            borderColor="border"
            padding="xl"
            alignItems="center"
        >
            <Box
                width={64}
                height={64}
                borderRadius={radii.full}
                backgroundColor="primaryMuted"
                alignItems="center"
                justifyContent="center"
                marginBottom="m"
            >
                <MaterialCommunityIcons name={icon} size={32} color={theme.colors.primary} />
            </Box>
            <Text variant="title" textAlign="center" marginBottom="xs">{title}</Text>
            {subtitle && (
                <Text variant="body" color="textSecondary" textAlign="center" marginBottom={action ? 'l' : undefined}>
                    {subtitle}
                </Text>
            )}
            {action && (
                <Box width="100%">
                    <Button label={action.label} onPress={action.onPress} variant="primary" />
                </Box>
            )}
        </Box>
    );
};
