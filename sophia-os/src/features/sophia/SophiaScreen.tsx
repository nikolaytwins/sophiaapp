import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSophiaChat } from '@/hooks/useSophiaChat';
import type { ChatMessage } from '@/entities/models';
import { GlassCard } from '@/shared/ui/GlassCard';
import { useAppTheme } from '@/theme';

export function SophiaScreen() {
  const { colors, radius, spacing, typography } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { messages, prompts, send } = useSophiaChat();
  const [draft, setDraft] = useState('');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        screen: {
          flex: 1,
          backgroundColor: colors.bg,
          paddingHorizontal: spacing.xl,
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.lg,
        },
        headerBadge: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: spacing.md,
          paddingVertical: 6,
          borderRadius: radius.full,
          backgroundColor: colors.accentSoft,
          borderWidth: 1,
          borderColor: colors.border,
        },
        headerBadgeTxt: { ...typography.caption, color: colors.accent },
        prompts: { gap: spacing.sm },
        prompt: {
          padding: spacing.lg,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        },
        bubbleRow: { alignItems: 'flex-start' },
        bubbleRowMine: { alignItems: 'flex-end' },
        bubble: {
          maxWidth: '88%',
          padding: spacing.md,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
        },
        bubbleUser: {
          backgroundColor: colors.accentSoft,
        },
        bubbleAI: {
          backgroundColor: colors.surface,
        },
        bubbleTextUser: {
          ...typography.body,
          color: colors.text,
        },
        inputRow: {
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: spacing.sm,
        },
        input: {
          flex: 1,
          ...typography.body,
          color: colors.text,
          maxHeight: 120,
          paddingVertical: spacing.sm,
        },
        send: {
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [colors, radius, spacing, typography]
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const mine = item.role === 'user';
      return (
        <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
          <View style={[styles.bubble, mine ? styles.bubbleUser : styles.bubbleAI]}>
            <Text style={mine ? styles.bubbleTextUser : typography.body}>{item.text}</Text>
          </View>
        </View>
      );
    },
    [styles, typography]
  );

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top + spacing.md }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={8}
    >
      <View style={styles.header}>
        <View>
          <Text style={typography.caption}>Ассистент</Text>
          <Text style={typography.hero}>София</Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="sparkles" size={18} color={colors.accent} />
          <Text style={styles.headerBadgeTxt}>Premium</Text>
        </View>
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={messages.data ?? []}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: spacing.lg, gap: spacing.sm }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            <Text style={[typography.body, { marginBottom: spacing.md }]}>
              Сценарии: план дня, питание, астрология, рефлексия — подключим к твоему backend.
            </Text>
            <View style={styles.prompts}>
              {(prompts.data ?? []).map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => send.mutate(`Сценарий: ${p.title}`)}
                  style={styles.prompt}
                >
                  <Text style={typography.title2}>{p.title}</Text>
                  <Text style={typography.caption}>{p.subtitle}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
      />

      <GlassCard padding={spacing.md} style={{ marginBottom: insets.bottom + spacing.md }}>
        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Напиши Софии…"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
          />
          <Pressable
            onPress={() => {
              if (!draft.trim()) return;
              send.mutate(draft.trim());
              setDraft('');
            }}
            style={styles.send}
          >
            <Ionicons name="arrow-up" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </GlassCard>
    </KeyboardAvoidingView>
  );
}
