import React from 'react';
import { TextInput, TouchableOpacity, KeyboardTypeOptions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Box, Text, useTheme, radii } from '../theme';

interface TextFieldProps {
    label?: string;
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    keyboardType?: KeyboardTypeOptions;
    multiline?: boolean;
    suffix?: string;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export const TextField: React.FC<TextFieldProps> = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType,
    multiline = false,
    suffix,
    autoCapitalize = 'sentences',
}) => {
    const theme = useTheme();
    return (
        <Box flex={1}>
            {label && <Text variant="label" textTransform="uppercase" marginBottom="s">{label}</Text>}
            <Box
                flexDirection="row"
                alignItems="center"
                backgroundColor="cardElevated"
                borderRadius={radii.s}
                borderWidth={1}
                borderColor="border"
                paddingHorizontal="m"
            >
                <TextInput
                    style={{
                        flex: 1,
                        color: theme.colors.textPrimary,
                        paddingVertical: 14,
                        fontSize: 16,
                        fontFamily: 'Inter_400Regular',
                        minHeight: multiline ? 80 : undefined,
                        textAlignVertical: multiline ? 'top' : 'center',
                        outlineStyle: 'none',
                    } as any}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType={keyboardType}
                    multiline={multiline}
                    autoCapitalize={autoCapitalize}
                    // Autocorrect helps for free-text notes; off for single-line
                    // identifiers (names, roastery, dates).
                    autoCorrect={multiline}
                />
                {suffix ? <Text variant="body" color="textSecondary" marginLeft="s">{suffix}</Text> : null}
            </Box>
        </Box>
    );
};

interface SelectFieldProps {
    label?: string;
    value?: string;
    placeholder: string;
    onPress: () => void;
}

export const SelectField: React.FC<SelectFieldProps> = ({ label, value, placeholder, onPress }) => {
    const theme = useTheme();
    return (
        <Box flex={1}>
            {label && <Text variant="label" textTransform="uppercase" marginBottom="s">{label}</Text>}
            <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
                <Box
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="space-between"
                    backgroundColor="cardElevated"
                    borderRadius={radii.s}
                    borderWidth={1}
                    borderColor="border"
                    paddingHorizontal="m"
                    paddingVertical="m"
                >
                    <Text variant="body" color={value ? 'textPrimary' : 'textTertiary'} fontWeight={value ? '600' : 'normal'}>
                        {value || placeholder}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                </Box>
            </TouchableOpacity>
        </Box>
    );
};
