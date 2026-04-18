import { Tabs } from 'expo-router';

import { CustomTabBar } from '@/navigation/CustomTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="day" options={{ title: 'День' }} />
      <Tabs.Screen name="sprint" options={{ title: 'Спринт' }} />
      <Tabs.Screen name="strategy" options={{ title: 'Стратегия' }} />
      <Tabs.Screen name="goals" options={{ title: 'Цели' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Задачи' }} />
      <Tabs.Screen name="inbox" options={{ title: 'Входящие', href: null }} />
      <Tabs.Screen name="finance" options={{ title: 'Финансы' }} />
      <Tabs.Screen name="habits" options={{ title: 'Аналитика' }} />
    </Tabs>
  );
}
