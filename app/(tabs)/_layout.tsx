import { Tabs, Redirect } from 'expo-router';
import { useTheme } from '../../src/presentation/theme';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useAuth } from '../../src/domain/context/AuthContext';

export default function TabLayout() {
    const theme = useTheme();
    const { user, isLoading } = useAuth();

    // Auth gate: redirect to login if not authenticated
    if (!isLoading && !user) {
        return <Redirect href="/auth" />;
    }

    return (
        <Tabs
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: theme.colors.cardPrimaryBackground,
                    borderTopColor: 'rgba(255,255,255,0.1)',
                    height: Platform.OS === 'ios' ? 88 : (Platform.OS === 'web' ? 70 : 60),
                    paddingBottom: Platform.OS === 'ios' ? 28 : (Platform.OS === 'web' ? 8 : 8),
                    paddingTop: 8,
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textSecondary,
                headerStyle: {
                    backgroundColor: theme.colors.mainBackground,
                },
                headerTintColor: theme.colors.textPrimary,
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontFamily: 'Inter_600SemiBold',
                    fontWeight: '600',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Überblick',
                    headerShown: false,
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home-analytics" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="history"
                options={{
                    title: 'Bezüge',
                    tabBarLabel: 'Bezüge',
                    tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="history" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="coffees"
                options={{
                    title: 'Bohnen',
                    tabBarLabel: 'Bohnen',
                    tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="coffee-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="grinders"
                options={{
                    title: 'Mühle',
                    tabBarLabel: 'Mühle',
                    tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cog-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="log"
                options={{
                    title: 'Log Brew',
                    tabBarLabel: 'Log',
                    tabBarIcon: ({ color, size }) => <MaterialIcons name="add-circle-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="doctor"
                options={{
                    title: 'Brew Doctor',
                    tabBarLabel: 'Doctor',
                    tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="robot-happy-outline" size={size} color={color} />,
                }}
            />
        </Tabs>
    );
}
