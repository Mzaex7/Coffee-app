import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '../../src/domain/context/AuthContext';
import { CremaTabBar } from '../../src/presentation/components/CremaTabBar';

export default function TabLayout() {
    const { user, isLoading } = useAuth();

    // Auth gate: redirect to login if not authenticated
    if (!isLoading && !user) {
        return <Redirect href="/auth" />;
    }

    return (
        <Tabs
            tabBar={(props) => <CremaTabBar {...props} />}
            screenOptions={{ headerShown: false }}
        >
            <Tabs.Screen name="index" options={{ title: 'Overview' }} />
            <Tabs.Screen name="history" options={{ title: 'Brews' }} />
            <Tabs.Screen name="coffees" options={{ title: 'Shelf' }} />
            <Tabs.Screen name="log" options={{ title: 'Log Brew' }} />
            <Tabs.Screen name="doctor" options={{ title: 'Brew Doctor' }} />
        </Tabs>
    );
}
