import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, Text, TouchableOpacity, View } from 'react-native';

import type { AnnualGoalCard, AnnualSphere } from '@/features/goals/annualGoals.types';
import { ImageEmbed } from '@/features/goals/ImageEmbed';
import {
  GOALS_ACCENT,
  GOALS_ACCENT_SOFT,
  GOALS_BORDER,
  GOALS_CALLOUT_BG,
  GOALS_EMBED_MAX_W,
} from '@/features/goals/goalsNotionTheme';
import { VisionTextInput } from '@/features/goals/VisionTextInput';
import { useAnnualGoalsStore } from '@/stores/annualGoals.store';
import { useAppTheme } from '@/theme';

const CARD_R = 18;

const SPHERE_HEAD: Record<AnnualSphere, { emoji: string; title: string }> = {
  relationships: { emoji: '❤️', title: 'Отношения' },
  energy: { emoji: '⚡', title: 'Состояние и энергия' },
  work: { emoji: '💼', title: 'Работа' },
};

const CALLOUT_ICON: Record<AnnualSphere, keyof typeof Ionicons.glyphMap> = {
  relationships: 'heart',
  energy: 'flash',
  work: 'briefcase',
};

type Props = {
  sphere: AnnualSphere;
  onOpenAddGoal: (sphere: AnnualSphere) => void;
  onOpenEditGoal: (sphere: AnnualSphere, card: AnnualGoalCard) => void;
};

/**
 * Одна сфера: подписка только на `doc.spheres[sphere]`, чтобы при вводе «Видения»
 * не ре-рендерились остальные textarea (корень Maximum update depth на web).
 */
export function AnnualGoalsSphereSection({ sphere, onOpenAddGoal, onOpenEditGoal }: Props) {
  const { colors } = useAppTheme();
  const section = useAnnualGoalsStore((s) => s.doc.spheres[sphere]);
  const setVisionText = useAnnualGoalsStore((s) => s.setVisionText);
  const removeCard = useAnnualGoalsStore((s) => s.removeCard);

  const [problematicaOpen, setProblematicaOpen] = useState(false);

  const onVisionChange = useCallback(
    (t: string) => {
      setVisionText(sphere, t);
    },
    [sphere, setVisionText]
  );

  const card = section.cards[0] ?? null;
  const head = SPHERE_HEAD[sphere];

  return (
    <View style={{ marginBottom: 44 }}>
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.6, color: colors.text }}>
          {head.emoji} {head.title}
        </Text>
        <View
          style={{
            marginTop: 10,
            height: 3,
            width: 48,
            borderRadius: 2,
            backgroundColor: GOALS_ACCENT,
            opacity: 0.9,
          }}
        />
      </View>

      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              backgroundColor: 'rgba(168,85,247,0.22)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(192,132,252,0.25)',
            }}
          >
            <Ionicons name={CALLOUT_ICON[sphere]} size={17} color={GOALS_ACCENT_SOFT} />
          </View>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 1.6,
              color: GOALS_ACCENT_SOFT,
              textTransform: 'uppercase',
            }}
          >
            Видение
          </Text>
        </View>

        <View
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: GOALS_BORDER,
            backgroundColor: GOALS_CALLOUT_BG,
            borderLeftWidth: 3,
            borderLeftColor: GOALS_ACCENT,
            paddingVertical: 14,
            paddingHorizontal: 16,
          }}
        >
          <VisionTextInput value={section.visionText} onChangeText={onVisionChange} />
        </View>
      </View>

      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 1.4,
          color: 'rgba(255,255,255,0.38)',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        Цель года
      </Text>

      {!card ? (
        <Pressable
          onPress={() => onOpenAddGoal(sphere)}
          style={({ pressed }) => ({
            paddingVertical: 16,
            paddingHorizontal: 18,
            borderRadius: CARD_R,
            borderWidth: 1,
            borderColor: 'rgba(168,85,247,0.4)',
            backgroundColor: pressed ? 'rgba(168,85,247,0.14)' : 'rgba(168,85,247,0.08)',
            alignItems: 'center',
          })}
        >
          <Text style={{ fontWeight: '800', color: GOALS_ACCENT, fontSize: 16 }}>Добавить цель</Text>
        </Pressable>
      ) : (
        <>
          <View style={{ width: '100%', maxWidth: GOALS_EMBED_MAX_W + 40, alignSelf: 'flex-start' }}>
            <ImageEmbed
              uri={card.imageUri ?? null}
              height={168}
              alignLeft
              placeholder={<Ionicons name="image-outline" size={36} color="rgba(255,255,255,0.2)" />}
            />
            <View
              style={{
                marginTop: 12,
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                paddingRight: 4,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  fontSize: 17,
                  fontWeight: '700',
                  letterSpacing: -0.3,
                  color: colors.text,
                }}
                numberOfLines={4}
              >
                {card.title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Pressable onPress={() => onOpenEditGoal(sphere, card)} hitSlop={10} style={{ padding: 8 }}>
                  <Ionicons name="create-outline" size={22} color="rgba(255,255,255,0.45)" />
                </Pressable>
                <Pressable
                  onPress={() =>
                    Alert.alert('Удалить цель?', card.title, [
                      { text: 'Отмена', style: 'cancel' },
                      {
                        text: 'Удалить',
                        style: 'destructive',
                        onPress: () => removeCard(sphere, card.id),
                      },
                    ])
                  }
                  hitSlop={10}
                  style={{ padding: 8 }}
                >
                  <Ionicons name="trash-outline" size={20} color="rgba(255,120,120,0.7)" />
                </Pressable>
              </View>
            </View>
          </View>

          <View
            style={{
              marginTop: 14,
              width: '100%',
              alignSelf: 'stretch',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: GOALS_BORDER,
              backgroundColor: GOALS_CALLOUT_BG,
              borderLeftWidth: 3,
              borderLeftColor: GOALS_ACCENT,
              overflow: 'hidden',
            }}
          >
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                setProblematicaOpen((o) => !o);
                if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: 'transparent',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.82)' }}>
                Проблематика
              </Text>
              <Ionicons
                name={problematicaOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="rgba(255,255,255,0.4)"
              />
            </TouchableOpacity>
            {problematicaOpen ? (
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingBottom: 14,
                  paddingTop: 0,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    lineHeight: 22,
                    color: card.problematica?.trim() ? 'rgba(248,250,252,0.88)' : colors.textMuted,
                  }}
                >
                  {card.problematica?.trim() || 'Не задано — добавьте в режиме редактирования цели.'}
                </Text>
              </View>
            ) : null}
          </View>
        </>
      )}
    </View>
  );
}
