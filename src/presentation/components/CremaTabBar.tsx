import React from 'react';
import { TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Box, Text, useTheme, radii, amberGlow } from '../theme';

type NavItem = {
    route: string;
    label: string;
    render: (color: string, active: boolean) => React.ReactNode;
};

const SIZE = 23;

const NAV: NavItem[] = [
    { route: 'index', label: 'Overview', render: (c) => <MaterialIcons name="insights" size={SIZE} color={c} /> },
    { route: 'history', label: 'Brews', render: (c) => <MaterialCommunityIcons name="history" size={SIZE + 1} color={c} /> },
    { route: 'coffees', label: 'Beans', render: (c, a) => <MaterialCommunityIcons name={a ? 'coffee' : 'coffee-outline'} size={SIZE} color={c} /> },
    { route: 'doctor', label: 'Doctor', render: (c, a) => <MaterialCommunityIcons name={a ? 'robot-happy' : 'robot-happy-outline'} size={SIZE} color={c} /> },
];

/**
 * Crema bottom navigation — four tabs around a floating amber FAB that opens
 * the brew logger. Hidden entirely while the Log screen is presented.
 */
export const CremaTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const current = state.routes[state.index]?.name;

    // The Log screen is presented full-bleed (FAB → modal feel) without the bar.
    if (current === 'log') return null;

    const go = (route: string) => {
        const event = navigation.emit({ type: 'tabPress', target: route, canPreventDefault: true });
        if (!event.defaultPrevented) navigation.navigate(route as never);
    };

    const Tab = ({ item }: { item: NavItem }) => {
        const active = current === item.route;
        const color = active ? theme.colors.primary : theme.colors.textTertiary;
        return (
            <TouchableOpacity onPress={() => go(item.route)} activeOpacity={0.7} style={{ flex: 1 }}>
                <Box alignItems="center" gap="xs">
                    {item.render(color, active)}
                    <Text
                        variant="label"
                        fontSize={10}
                        fontWeight="600"
                        style={{ color, fontFamily: 'Inter_600SemiBold' }}
                    >
                        {item.label}
                    </Text>
                </Box>
            </TouchableOpacity>
        );
    };

    return (
        <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="space-around"
            backgroundColor="cardPrimaryBackground"
            borderTopWidth={1}
            borderColor="border"
            style={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: (insets.bottom || 10) + 6 }}
        >
            <Tab item={NAV[0]} />
            <Tab item={NAV[1]} />

            {/* Center FAB → Log */}
            <Box width={64} alignItems="center">
                <TouchableOpacity onPress={() => go('log')} activeOpacity={0.85}>
                    <Box
                        width={56}
                        height={56}
                        borderRadius={radii.l}
                        backgroundColor="primary"
                        alignItems="center"
                        justifyContent="center"
                        style={{ marginTop: -30, ...amberGlow }}
                    >
                        <Ionicons name="add" size={32} color={theme.colors.onPrimary} />
                    </Box>
                </TouchableOpacity>
            </Box>

            <Tab item={NAV[2]} />
            <Tab item={NAV[3]} />
        </Box>
    );
};
