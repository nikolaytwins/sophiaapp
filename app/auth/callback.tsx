import { Stack, useRouter, type Href } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';

import { completeAuthFromUrl } from '@/lib/supabaseAuth';
import { getSupabase } from '@/lib/supabase';

/**
 * Редирект из magic link: sophiaos://auth/callback?code=… или веб с тем же query/hash.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const [message, setMessage] = useState('Входим…');
  const handled = useRef(false);

  useEffect(() => {
    const run = async (url: string | null) => {
      if (handled.current) return;
      const sb = getSupabase();
      if (!sb) {
        setMessage('Supabase не настроен');
        handled.current = true;
        setTimeout(() => router.replace('/cloud' as Href), 1500);
        return;
      }
      if (!url) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          url = window.location.href;
        }
      }
      if (!url) {
        setMessage('Нет ссылки');
        handled.current = true;
        setTimeout(() => router.replace('/habits'), 1200);
        return;
      }
      const { error, ok } = await completeAuthFromUrl(sb, url);
      if (error) {
        setMessage(error.message);
        handled.current = true;
        setTimeout(() => router.replace('/cloud' as Href), 2000);
        return;
      }
      if (!ok) {
        setMessage('Нет кода в ссылке — открой свежую ссылку из письма.');
        handled.current = true;
        setTimeout(() => router.replace('/cloud' as Href), 2200);
        return;
      }
      handled.current = true;
      router.replace('/habits');
    };

    void Linking.getInitialURL().then((u) => void run(u));

    const sub = Linking.addEventListener('url', ({ url }) => void run(url));
    return () => sub.remove();
  }, [router]);

  return (
    <>
      <Stack.Screen options={{ title: 'Вход', headerShown: true, headerStyle: { backgroundColor: '#0A0A10' } }} />
      <View
        style={{
          flex: 1,
          backgroundColor: '#030304',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <ActivityIndicator size="large" color="#A855F7" />
        <Text style={{ color: 'rgba(255,255,255,0.7)', marginTop: 16, textAlign: 'center' }}>
          {message}
        </Text>
      </View>
    </>
  );
}
