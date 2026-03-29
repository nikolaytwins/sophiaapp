import { Ionicons } from '@expo/vector-icons';
import { type Href, Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AnnualSphere } from '@/features/goals/annualGoals.types';
import type { GlobalVisionBlock } from '@/features/goals/globalVision.types';
import { ImageEmbed } from '@/features/goals/ImageEmbed';
import {
  GOALS_ACCENT,
  GOALS_ACCENT_SOFT,
  GOALS_BORDER,
  GOALS_CALLOUT_BG,
  GOALS_EMBED_MAX_W,
} from '@/features/goals/goalsNotionTheme';
import { pickGoalCoverImageUri } from '@/features/goals/pickGoalImage';
import { VisionTextInput } from '@/features/goals/VisionTextInput';
import { useSupabaseConfigured } from '@/config/env';
import { useGlobalVisionStore } from '@/stores/globalVision.store';
import { useAppTheme } from '@/theme';

const CARD_R = 18;

const SPHERE_TABS: {
  key: AnnualSphere;
  short: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'relationships', short: 'Отношения', icon: 'heart-outline' },
  { key: 'energy', short: 'Энергия', icon: 'flash-outline' },
  { key: 'work', short: 'Работа', icon: 'briefcase-outline' },
];

const ARTICLE_TEXT = {
  fontSize: 16,
  lineHeight: 26,
  color: 'rgba(248,250,252,0.92)' as const,
  letterSpacing: -0.2,
};

function hasVisibleEssayContent(blocks: GlobalVisionBlock[]): boolean {
  return blocks.some((b) =>
    b.kind === 'text' ? Boolean(b.text.trim()) : Boolean(b.imageUri?.trim())
  );
}

function GlobalVisionImageBlockRow({
  blockId,
  imageUri,
}: {
  blockId: string;
  imageUri: string | null;
}) {
  const setBlockImageUri = useGlobalVisionStore((s) => s.setBlockImageUri);
  const pick = async () => {
    const uri = await pickGoalCoverImageUri();
    if (uri) setBlockImageUri(blockId, uri);
  };
  const [urlDraft, setUrlDraft] = useState('');

  return (
    <View style={{ marginBottom: 16 }}>
      <ImageEmbed
        uri={imageUri}
        height={200}
        alignLeft
        placeholder={<Ionicons name="image-outline" size={40} color="rgba(255,255,255,0.22)" />}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
        <Pressable
          onPress={() => void pick()}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(192,132,252,0.35)',
            backgroundColor: 'rgba(168,85,247,0.08)',
          }}
        >
          <Text style={{ color: GOALS_ACCENT_SOFT, fontWeight: '700', fontSize: 13 }}>Галерея</Text>
        </Pressable>
      </View>
      <TextInput
        value={urlDraft}
        onChangeText={setUrlDraft}
        onSubmitEditing={() => {
          const t = urlDraft.trim();
          if (t) setBlockImageUri(blockId, t);
        }}
        placeholder="Или вставьте URL картинки"
        placeholderTextColor="rgba(255,255,255,0.28)"
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          marginTop: 8,
          borderWidth: 1,
          borderColor: GOALS_BORDER,
          borderRadius: 12,
          padding: 12,
          color: 'rgba(248,250,252,0.94)',
          fontSize: 14,
          backgroundColor: 'rgba(255,255,255,0.03)',
        }}
      />
      {urlDraft.trim() ? (
        <Pressable
          onPress={() => setBlockImageUri(blockId, urlDraft.trim())}
          style={{ marginTop: 8, alignSelf: 'flex-start' }}
        >
          <Text style={{ color: GOALS_ACCENT_SOFT, fontWeight: '600', fontSize: 13 }}>Применить URL</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Единая статья: только текст и картинки, без рамок редактора. */
function GlobalVisionArticleRead({ blocks }: { blocks: GlobalVisionBlock[] }) {
  const visible = hasVisibleEssayContent(blocks);
  if (!visible) {
    return (
      <Text style={{ ...ARTICLE_TEXT, color: 'rgba(255,255,255,0.38)', fontStyle: 'italic', marginBottom: 8 }}>
        Пока пусто. Нажмите «Редактировать», чтобы добавить текст и изображения.
      </Text>
    );
  }

  return (
    <View style={{ maxWidth: GOALS_EMBED_MAX_W + 80, alignSelf: 'stretch' }}>
      {blocks.map((block) => {
        if (block.kind === 'text') {
          const t = block.text.trim();
          if (!t) return null;
          return (
            <Text key={block.id} style={[ARTICLE_TEXT, { marginBottom: 20 }]}>
              {t}
            </Text>
          );
        }
        if (!block.imageUri?.trim()) return null;
        return (
          <View key={block.id} style={{ marginBottom: 22, width: '100%', maxWidth: GOALS_EMBED_MAX_W, alignSelf: 'flex-start' }}>
            <ImageEmbed
              uri={block.imageUri}
              height={220}
              alignLeft
              placeholder={<Ionicons name="image-outline" size={36} color="rgba(255,255,255,0.2)" />}
            />
          </View>
        );
      })}
    </View>
  );
}

function SphereVisionEditor({ sphere }: { sphere: AnnualSphere }) {
  const text = useGlobalVisionStore((s) => s.doc.sphereVisions[sphere]);
  const setSphereVision = useGlobalVisionStore((s) => s.setSphereVision);
  const onChange = useCallback(
    (t: string) => {
      setSphereVision(sphere, t);
    },
    [sphere, setSphereVision]
  );
  return (
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
      <VisionTextInput value={text} onChangeText={onChange} />
    </View>
  );
}

/**
 * Глобальное видение: эссе (режим статьи / режим редактора) + видение по сферам.
 */
export function GlobalVisionScreen() {
  const { colors, spacing, typography } = useAppTheme();
  const insets = useSafeAreaInsets();
  const supabaseOn = useSupabaseConfigured;

  const doc = useGlobalVisionStore((s) => s.doc);
  const addBlock = useGlobalVisionStore((s) => s.addBlock);
  const removeBlock = useGlobalVisionStore((s) => s.removeBlock);
  const setBlockText = useGlobalVisionStore((s) => s.setBlockText);

  const [essayEditMode, setEssayEditMode] = useState(false);
  const [sphereTab, setSphereTab] = useState<AnnualSphere>('relationships');

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.xs,
          paddingHorizontal: spacing.xl + 4,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {supabaseOn ? (
          <Link href={'/cloud' as Href} asChild>
            <Pressable
              style={{
                marginBottom: spacing.lg,
                alignSelf: 'flex-start',
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: GOALS_BORDER,
                backgroundColor: 'rgba(255,255,255,0.03)',
              }}
            >
              <Text style={{ color: GOALS_ACCENT_SOFT, fontSize: 13, fontWeight: '600' }}>
                ☁️ Облако — войдите, чтобы данные жили на аккаунте
              </Text>
            </Pressable>
          </Link>
        ) : (
          <Text style={[typography.caption, { color: 'rgba(255,255,255,0.35)', marginBottom: spacing.lg }]}>
            Локально на устройстве. Подключите Supabase в .env для синхронизации по почте.
          </Text>
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: essayEditMode ? 14 : 20,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                letterSpacing: 1.3,
                color: 'rgba(255,255,255,0.35)',
                marginBottom: 6,
              }}
            >
              ЭССЕ
            </Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>
              Глобальное видение
            </Text>
          </View>
          <Pressable
            onPress={() => {
              setEssayEditMode((e) => !e);
              if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: essayEditMode ? 'rgba(168,85,247,0.45)' : 'rgba(255,255,255,0.1)',
              backgroundColor: pressed ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
            })}
          >
            <Ionicons
              name={essayEditMode ? 'checkmark-circle-outline' : 'create-outline'}
              size={20}
              color={essayEditMode ? GOALS_ACCENT_SOFT : 'rgba(255,255,255,0.55)'}
            />
            <Text style={{ fontSize: 14, fontWeight: '700', color: essayEditMode ? GOALS_ACCENT_SOFT : 'rgba(255,255,255,0.75)' }}>
              {essayEditMode ? 'Готово' : 'Редактировать'}
            </Text>
          </Pressable>
        </View>

        {essayEditMode ? (
          <>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16, lineHeight: 20 }}>
              Блоки, фото и порядок — ниже. Нажмите «Готово», чтобы снова видеть статью целиком.
            </Text>
            {doc.blocks.map((block, index) => (
              <View key={block.id} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: 1.2 }}>
                    Блок {index + 1} · {block.kind === 'text' ? 'Текст' : 'Фото'}
                  </Text>
                  <Pressable
                    onPress={() =>
                      Alert.alert('Удалить блок?', '', [
                        { text: 'Отмена', style: 'cancel' },
                        {
                          text: 'Удалить',
                          style: 'destructive',
                          onPress: () => {
                            removeBlock(block.id);
                            if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          },
                        },
                      ])
                    }
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={18} color="rgba(255,120,120,0.55)" />
                  </Pressable>
                </View>

                {block.kind === 'text' ? (
                  <View
                    style={{
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: GOALS_BORDER,
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                    }}
                  >
                    <VisionTextInput value={block.text} onChangeText={(t) => setBlockText(block.id, t)} />
                  </View>
                ) : (
                  <GlobalVisionImageBlockRow blockId={block.id} imageUri={block.imageUri} />
                )}
              </View>
            ))}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8, marginBottom: 36 }}>
              <Pressable
                onPress={() => {
                  addBlock('text');
                  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => ({
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(168,85,247,0.45)',
                  backgroundColor: pressed ? 'rgba(168,85,247,0.14)' : 'rgba(168,85,247,0.08)',
                })}
              >
                <Text style={{ color: GOALS_ACCENT_SOFT, fontWeight: '800', fontSize: 14 }}>+ Текст</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  addBlock('image');
                  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => ({
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  backgroundColor: pressed ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                })}
              >
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontWeight: '800', fontSize: 14 }}>+ Фото</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={{ marginBottom: 36 }}>
            <GlobalVisionArticleRead blocks={doc.blocks} />
          </View>
        )}

        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 1.3,
            color: 'rgba(255,255,255,0.35)',
            marginBottom: 12,
          }}
        >
          ВИДЕНИЕ ПО СФЕРАМ
        </Text>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {SPHERE_TABS.map(({ key, short, icon }) => {
            const activeTab = sphereTab === key;
            return (
              <Pressable key={key} onPress={() => setSphereTab(key)} style={{ flex: 1 }}>
                {activeTab ? (
                  <LinearGradient
                    colors={['rgba(168,85,247,0.45)', 'rgba(168,85,247,0.12)']}
                    style={{
                      borderRadius: CARD_R,
                      paddingVertical: 16,
                      paddingHorizontal: 8,
                      borderWidth: 1,
                      borderColor: 'rgba(168,85,247,0.55)',
                      alignItems: 'center',
                      gap: 8,
                      minHeight: 100,
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={icon} size={26} color={GOALS_ACCENT} />
                    <Text
                      numberOfLines={2}
                      style={{
                        textAlign: 'center',
                        fontSize: 13,
                        fontWeight: '800',
                        color: '#FAFAFC',
                        lineHeight: 17,
                      }}
                    >
                      {short}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View
                    style={{
                      borderRadius: CARD_R,
                      paddingVertical: 16,
                      paddingHorizontal: 8,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.08)',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      alignItems: 'center',
                      gap: 8,
                      minHeight: 100,
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={icon} size={26} color="rgba(255,255,255,0.42)" />
                    <Text
                      numberOfLines={2}
                      style={{
                        textAlign: 'center',
                        fontSize: 13,
                        fontWeight: '700',
                        color: colors.textMuted,
                        lineHeight: 17,
                      }}
                    >
                      {short}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <SphereVisionEditor sphere={sphereTab} />
      </ScrollView>
    </View>
  );
}
