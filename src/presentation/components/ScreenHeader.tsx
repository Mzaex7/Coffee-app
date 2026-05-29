import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box, Text } from '../theme';

interface ScreenHeaderProps {
    title: string;
    /** Small mono uppercase line above the title (e.g. "Good morning"). */
    eyebrow?: string;
    /** Optional element pinned to the top-right (avatar, add button…). */
    right?: React.ReactNode;
    /** Title size — defaults to the Crema 30px display. */
    titleSize?: number;
    /** Extra content rendered under the title row (filters, segments…). */
    children?: React.ReactNode;
}

/**
 * Crema screen header: safe-area-aware top inset, optional mono eyebrow,
 * bold display title, and an optional trailing action.
 */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
    title,
    eyebrow,
    right,
    titleSize = 30,
    children,
}) => {
    const insets = useSafeAreaInsets();
    const top = (insets.top || 12) + 8;

    return (
        <Box paddingHorizontal="m" style={{ paddingTop: top, paddingBottom: 10 }}>
            <Box flexDirection="row" justifyContent="space-between" alignItems="flex-start">
                <Box flex={1}>
                    {eyebrow ? (
                        <Text
                            variant="label"
                            color="textTertiary"
                            textTransform="uppercase"
                            style={{ fontFamily: 'JetBrainsMono_400Regular', letterSpacing: 2 }}
                        >
                            {eyebrow}
                        </Text>
                    ) : null}
                    <Text
                        color="textPrimary"
                        marginTop={eyebrow ? 'xs' : undefined}
                        style={{ fontFamily: 'Inter_700Bold', fontSize: titleSize, letterSpacing: -0.5 }}
                    >
                        {title}
                    </Text>
                </Box>
                {right}
            </Box>
            {children}
        </Box>
    );
};
