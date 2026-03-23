import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import type { Task } from '@/entities/models';
import { useAppTheme } from '@/theme';

type Props = {
  task: Task;
  onToggle: () => void;
};

export function TaskRow({ task, onToggle }: Props) {
  const { colors, typography, radius, spacing } = useAppTheme();
  const done = task.status === 'done';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
        },
        rowDone: { opacity: 0.55 },
        title: { fontSize: 16 },
        titleDone: { textDecorationLine: 'line-through' },
        meta: { flexDirection: 'row', gap: spacing.md, marginTop: 4 },
        dot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
        swipeRight: {
          justifyContent: 'center',
          marginLeft: spacing.sm,
        },
        swipeBtn: {
          backgroundColor: colors.success,
          borderRadius: radius.md,
          paddingHorizontal: spacing.lg,
          height: '100%',
          minHeight: 56,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        },
        swipeUndo: {
          backgroundColor: colors.warning,
        },
        swipeTxt: {
          ...typography.caption,
          color: '#0A0B0F',
          fontWeight: '700',
        },
      }),
    [colors, typography, radius, spacing]
  );

  const priorityDot = useMemo(() => {
    if (task.priority === 'high') return { backgroundColor: colors.accent };
    if (task.priority === 'medium') return { backgroundColor: colors.warning };
    return { backgroundColor: colors.textMuted };
  }, [colors, task.priority]);

  const right = () => (
    <View style={styles.swipeRight}>
      <Pressable
        onPress={() => {
          void Haptics.notificationAsync(
            done
              ? Haptics.NotificationFeedbackType.Warning
              : Haptics.NotificationFeedbackType.Success
          );
          onToggle();
        }}
        style={[styles.swipeBtn, done && styles.swipeUndo]}
      >
        <Ionicons name={done ? 'arrow-undo' : 'checkmark'} size={22} color="#0A0B0F" />
        <Text style={styles.swipeTxt}>{done ? 'Вернуть' : 'Готово'}</Text>
      </Pressable>
    </View>
  );

  return (
    <Swipeable renderRightActions={right} overshootRight={false}>
      <Pressable
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}
        style={[styles.row, done && styles.rowDone]}
      >
        <View style={[styles.dot, priorityDot]} />
        <View style={{ flex: 1 }}>
          <Text style={[typography.title2, styles.title, done && styles.titleDone]}>{task.title}</Text>
          <View style={styles.meta}>
            {task.dueTime ? <Text style={typography.caption}>{task.dueTime}</Text> : null}
            <Text style={typography.caption}>{task.domain === 'work' ? 'Работа' : 'Личное'}</Text>
            {task.recurrence && task.recurrence !== 'none' ? (
              <Text style={typography.caption}>↻ {task.recurrence}</Text>
            ) : null}
          </View>
        </View>
        <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={done ? colors.success : colors.textMuted} />
      </Pressable>
    </Swipeable>
  );
}
