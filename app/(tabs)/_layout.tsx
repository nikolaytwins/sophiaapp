import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';

import { AppLeftNavRail } from '@/navigation/AppLeftNavRail';
import { CustomTabBar } from '@/navigation/CustomTabBar';
import { WEB_NAV_LG_MIN } from '@/navigation/navConstants';
import { useAppTheme } from '@/theme';

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const { isLight } = useAppTheme();
  const isDesktopWeb = Platform.OS === 'web' && width >= WEB_NAV_LG_MIN;
  const [navRailCollapsed, setNavRailCollapsed] = useState(() => !isDesktopWeb);

  useEffect(() => {
    setNavRailCollapsed(!isDesktopWeb);
  }, [isDesktopWeb]);

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      {isDesktopWeb ? (
        <AppLeftNavRail collapsed={navRailCollapsed} onToggleCollapsed={() => setNavRailCollapsed((c) => !c)} isLight={isLight} />
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Tabs
          tabBar={(props) => (isDesktopWeb ? null : <CustomTabBar {...props} />)}
          screenOptions={{
            headerShown: false,
            ...(isDesktopWeb && Platform.OS === 'web'
              ? { tabBarStyle: { display: 'none', height: 0, borderTopWidth: 0 } as const }
              : {}),
          }}
        >
          <Tabs.Screen name="day" options={{ title: 'День' }} />
          <Tabs.Screen name="calendar" options={{ title: 'Календарь' }} />
          <Tabs.Screen name="sprint" options={{ title: 'Спринт', href: null }} />
          <Tabs.Screen name="strategy" options={{ title: 'Стратегия' }} />
          <Tabs.Screen name="goals" options={{ title: 'Цели' }} />
          <Tabs.Screen name="tasks" options={{ title: 'Задачи' }} />
          <Tabs.Screen name="inbox" options={{ title: 'Входящие', href: null }} />
          <Tabs.Screen name="finance" options={{ title: 'Финансы' }} />
          <Tabs.Screen name="habits" options={{ title: 'Аналитика' }} />
        </Tabs>
      </View>
    </View>
  );
}
