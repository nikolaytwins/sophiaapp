import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFieldsBySection } from '@/features/day/dayJournal.logic';
import type { JournalFieldSection, JournalFieldType } from '@/features/day/dayJournal.types';
import { useDayJournalStore } from '@/stores/dayJournal.store';
import { AppSurfaceCard } from '@/shared/ui/AppSurfaceCard';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { ScreenTitle } from '@/shared/ui/ScreenTitle';
import { useAppTheme } from '@/theme';

const TYPE_OPTIONS: { id: JournalFieldType; label: string }[] = [
  { id: 'text', label: 'Текст' },
  { id: 'number', label: 'Число' },
  { id: 'toggle', label: 'Переключатель' },
];

const SECTION_OPTIONS: { id: JournalFieldSection; label: string }[] = [
  { id: 'journal', label: 'Дневник' },
  { id: 'health', label: 'Здоровье' },
];

export function JournalSettingsScreen() {
  const { colors, spacing, radius, brand } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const fields = useDayJournalStore((s) => s.doc.fields);
  const addField = useDayJournalStore((s) => s.addField);
  const removeField = useDayJournalStore((s) => s.removeField);

  const [label, setLabel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [type, setType] = useState<JournalFieldType>('text');
  const [section, setSection] = useState<JournalFieldSection>('journal');

  const journalFields = useMemo(() => getFieldsBySection(fields, 'journal'), [fields]);
  const healthFields = useMemo(() => getFieldsBySection(fields, 'health'), [fields]);

  const submit = () => {
    const res = addField({ label, prompt, type, section });
    if (!res.ok) {
      Alert.alert('Поле дневника', res.error);
      return;
    }
    setLabel('');
    setPrompt('');
    setType('text');
    setSection('journal');
  };

  return (
    <ScreenCanvas>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingHorizontal: spacing.xl + 8,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Дневник</Text>
        </Pressable>

        <ScreenTitle title="Настройки" subtitle="Добавляй свои поля в дневник и в здоровье" />

        <AppSurfaceCard>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 14 }}>Новое поле</Text>

          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>Название</Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="Например: За что благодарен"
            placeholderTextColor="rgba(255,255,255,0.28)"
            style={{
              borderWidth: 1,
              borderColor: brand.surfaceBorder,
              borderRadius: radius.lg,
              paddingVertical: 14,
              paddingHorizontal: 14,
              color: colors.text,
              fontSize: 16,
              marginBottom: 14,
            }}
          />

          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>Подсказка</Text>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Опционально"
            placeholderTextColor="rgba(255,255,255,0.28)"
            style={{
              borderWidth: 1,
              borderColor: brand.surfaceBorder,
              borderRadius: radius.lg,
              paddingVertical: 14,
              paddingHorizontal: 14,
              color: colors.text,
              fontSize: 16,
              marginBottom: 14,
            }}
          />

          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>Тип поля</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {TYPE_OPTIONS.map((opt) => {
              const on = type === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setType(opt.id)}
                  style={{
                    paddingVertical: 9,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: on ? brand.surfaceBorderStrong : brand.surfaceBorder,
                    backgroundColor: on ? brand.primaryMuted : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: on ? colors.text : colors.textMuted }}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>Раздел</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {SECTION_OPTIONS.map((opt) => {
              const on = section === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setSection(opt.id)}
                  style={{
                    paddingVertical: 9,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: on ? brand.surfaceBorderStrong : brand.surfaceBorder,
                    backgroundColor: on ? brand.primaryMuted : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: on ? colors.text : colors.textMuted }}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={submit}
            style={{
              backgroundColor: brand.primary,
              paddingVertical: 14,
              borderRadius: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Добавить поле</Text>
          </Pressable>
        </AppSurfaceCard>

        <FieldGroup title="Поля дневника" fields={journalFields} onRemove={removeField} />
        <FieldGroup title="Поля здоровья" fields={healthFields} onRemove={removeField} />
      </ScrollView>
    </ScreenCanvas>
  );
}

function FieldGroup({
  title,
  fields,
  onRemove,
}: {
  title: string;
  fields: ReturnType<typeof useDayJournalStore.getState>['doc']['fields'];
  onRemove: (fieldId: string) => void;
}) {
  const { colors, spacing, brand } = useAppTheme();

  return (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 12 }}>{title}</Text>
      {fields.map((field) => (
        <AppSurfaceCard key={field.id} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{field.label}</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 6 }}>
                {field.type === 'text' ? 'Текст' : field.type === 'number' ? 'Число' : 'Переключатель'}
                {field.prompt ? ` · ${field.prompt}` : ''}
              </Text>
            </View>
            {field.builtIn ? (
              <View
                style={{
                  alignSelf: 'flex-start',
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor: brand.surfaceBorder,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted }}>базовое</Text>
              </View>
            ) : (
              <Pressable onPress={() => onRemove(field.id)} hitSlop={8}>
                <Ionicons name="trash-outline" size={20} color="rgba(255,120,120,0.75)" />
              </Pressable>
            )}
          </View>
        </AppSurfaceCard>
      ))}
    </View>
  );
}
