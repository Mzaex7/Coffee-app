import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Box, Text } from '../theme';

interface SectionHeaderProps {
    title: string;
    action?: { label: string; onPress: () => void };
    marginTop?: 'none' | 's' | 'm' | 'l';
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, action, marginTop = 'none' }) => {
    return (
        <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            marginBottom="m"
            marginTop={marginTop === 'none' ? undefined : marginTop}
        >
            <Text variant="subheader">{title}</Text>
            {action && (
                <TouchableOpacity onPress={action.onPress} activeOpacity={0.7}>
                    <Text variant="caption" color="primary" fontWeight="bold">{action.label}</Text>
                </TouchableOpacity>
            )}
        </Box>
    );
};
