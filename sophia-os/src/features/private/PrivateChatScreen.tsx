import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePrivateChat } from '@/hooks/usePrivateModule';
import { privateColors, privateRadius } from '@/theme/privateTokens';

import { PrivateShell } from './components/PrivateShell';

export function PrivateChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);
  const { messages, prompts, send } = usePrivateChat();

  const items = messages.data ?? [];

  function onSend(text?: string) {
    const t = (text ?? input).trim();
    if (!t || send.isPending) return;
    setInput('');
    send.mutate(t, {
      onSuccess: () => {
        requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
      },
    });
  }

  if (messages.isLoading) {
    return (
      <PrivateShell>
        <View style={[styles.loader, { paddingTop: insets.top }]}>
          <ActivityIndicator color={privateColors.accent} />
        </View>
      </PrivateShell>
    );
  }

  return (
    <PrivateShell>
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerTopRow}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
              <Text style={styles.backTxt}>← Назад</Text>
            </Pressable>
          </View>
          <Text style={styles.headerKicker}>Приватный режим</Text>
          <Text style={styles.headerTitle}>София · After Dark</Text>
          <Text style={styles.headerSub}>Стратег и тон — без пошлости, с глубиной.</Text>
        </View>

        <FlatList
          ref={listRef}
          style={styles.listFlex}
          data={items}
          keyExtractor={(m) => m.id}
          contentContainerStyle={[styles.list, { paddingBottom: 12 }]}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubbleWrap,
                item.role === 'user' ? styles.bubbleWrapUser : styles.bubbleWrapAsst,
              ]}
            >
              <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleAsst]}>
                <Text style={[styles.bubbleText, item.role === 'user' && styles.bubbleTextUser]}>
                  {item.text}
                </Text>
              </View>
            </View>
          )}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          style={styles.chipsScroll}
        >
          {(prompts.data ?? []).map((p) => (
            <Pressable key={p.id} style={styles.chip} onPress={() => onSend(p.text)}>
              <Text style={styles.chipText}>{p.text}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Напиши приватно…"
            placeholderTextColor={privateColors.textMuted}
            style={styles.input}
            multiline
            maxLength={2000}
            editable={!send.isPending}
          />
          <Pressable
            style={[styles.sendBtn, (!input.trim() || send.isPending) && styles.sendDisabled]}
            onPress={() => onSend()}
            disabled={!input.trim() || send.isPending}
          >
            <Text style={styles.sendTxt}>{send.isPending ? '…' : '→'}</Text>
          </Pressable>
        </View>
      </View>
    </PrivateShell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listFlex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTopRow: { marginBottom: 10 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  backTxt: { fontSize: 14, color: privateColors.accent, fontWeight: '600' },
  headerKicker: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: privateColors.textMuted,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: privateColors.text,
    marginTop: 6,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: privateColors.rose,
    marginTop: 8,
    lineHeight: 18,
  },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  bubbleWrap: { marginBottom: 10, maxWidth: '100%' },
  bubbleWrapUser: { alignItems: 'flex-end' },
  bubbleWrapAsst: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '88%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: privateRadius.lg,
    borderWidth: 1,
  },
  bubbleUser: {
    backgroundColor: privateColors.burgundySoft,
    borderColor: privateColors.rose,
  },
  bubbleAsst: {
    backgroundColor: privateColors.surface,
    borderColor: privateColors.borderStrong,
  },
  bubbleText: { fontSize: 15, color: privateColors.textSecondary, lineHeight: 22 },
  bubbleTextUser: { color: privateColors.text },
  chipsScroll: { maxHeight: 48, flexGrow: 0 },
  chipsRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center', paddingVertical: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: privateColors.accent,
    backgroundColor: privateColors.accentSoft,
  },
  chipText: { fontSize: 12, color: privateColors.accent, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: privateColors.border,
    backgroundColor: privateColors.bgElevated,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: privateRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: privateColors.text,
    backgroundColor: privateColors.surface,
    borderWidth: 1,
    borderColor: privateColors.borderStrong,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: privateColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendDisabled: { opacity: 0.35 },
  sendTxt: { fontSize: 18, fontWeight: '700', color: privateColors.bg },
});
