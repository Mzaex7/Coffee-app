import React from 'react';
import { Box, Text, radii } from '../theme';

interface StatCardProps {
    icon: React.ReactNode;
    value: string | number;
    label: string;
    valueFontSize?: number;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, value, label, valueFontSize }) => {
    return (
        <Box
            flex={1}
            backgroundColor="cardPrimaryBackground"
            paddingHorizontal="m"
            paddingVertical="m"
            borderRadius={radii.l}
            borderWidth={1}
            borderColor="border"
            justifyContent="space-between"
            height={104}
        >
            {icon}
            <Box>
                <Text
                    color="textPrimary"
                    numberOfLines={1}
                    style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: valueFontSize ?? 22, fontWeight: '700' }}
                >
                    {value}
                </Text>
                <Text variant="caption" fontSize={10.5} color="textTertiary" numberOfLines={1} marginTop="xs">{label}</Text>
            </Box>
        </Box>
    );
};
