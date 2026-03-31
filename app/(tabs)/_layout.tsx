import { Tabs } from 'expo-router';

import { CustomTabBar } from '@/navigation/CustomTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {/** Экраны остаются в дереве маршрутов; из таббара скрыты (`href: null`). */}
      <Tabs.Screen name="day" options={{ title: 'День' }} />
      <Tabs.Screen name="journal" options={{ title: 'Дневник' }} />
      <Tabs.Screen name="sprint" options={{ title: 'Спринт' }} />
      <Tabs.Screen name="goals" options={{ title: 'Цели' }} />
      <Tabs.Screen name="finance" options={{ title: 'Финансы', href: null }} />
      <Tabs.Screen name="habits" options={{ title: 'Привычки' }} />
    </Tabs>
  );
}
