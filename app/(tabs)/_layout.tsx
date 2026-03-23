import { Tabs } from 'expo-router';

import { CustomTabBar } from '@/navigation/CustomTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="final" options={{ title: 'Финал' }} />
      <Tabs.Screen name="day" options={{ title: 'День' }} />
      <Tabs.Screen name="plan" options={{ title: 'План' }} />
    </Tabs>
  );
}
