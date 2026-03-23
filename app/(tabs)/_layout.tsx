import { Tabs } from 'expo-router';

import { CustomTabBar } from '@/navigation/CustomTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="day" options={{ title: 'День' }} />
      <Tabs.Screen name="plan" options={{ title: 'План' }} />
      <Tabs.Screen name="sophia" options={{ title: 'София' }} />
      <Tabs.Screen name="habits" options={{ title: 'Ритм' }} />
      <Tabs.Screen name="finance" options={{ title: 'Финансы' }} />
      <Tabs.Screen name="esoterica" options={{ title: 'Эзо' }} />
    </Tabs>
  );
}
