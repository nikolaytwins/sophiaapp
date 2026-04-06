import React, { type ChangeEvent } from 'react';
import { Platform, Switch, Text, TextInput, View } from 'react-native';

import type { JournalFieldDefinition } from '@/features/day/dayJournal.types';
import { AppSurfaceCard } from '@/shared/ui/AppSurfaceCard';
import { useDayJournalStore } from '@/stores/dayJournal.store';
import { useAppTheme } from '@/theme';

export function JournalMultilineInput({
  value,
  placeholder,
  onChangeText,
}: {
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
}) {
  const onWebChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.currentTarget.value;
    if (next !== value) onChangeText(next);
  };

  if (Platform.OS === 'web') {
    return React.createElement('textarea', {
      value,
      onChange: onWebChange,
      placeholder,
      rows: 4,
      style: {
        width: '100%',
        minHeight: 110,
        color: 'rgba(248,250,252,0.94)',
        fontSize: 15,
        lineHeight: '24px',
        fontWeight: 400,
        padding: 0,
        margin: 0,
        backgroundColor: 'transparent',
        border: 'none',
        outline: 'none',
        resize: 'vertical',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
      },
    });
  }

  return (
    <TextInput
      multiline
      scrollEnabled={false}
      textAlignVertical="top"
      underlineColorAndroid="transparent"
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,0.32)"
      style={{
        width: '100%',
        minHeight: 110,
        color: 'rgba(248,250,252,0.94)',
        fontSize: 15,
        lineHeight: 24,
        padding: 0,
        margin: 0,
      }}
    />
  );
}

export function JournalFieldCard({
  field,
  dateKey,
  onValueCommit,
}: {
  field: JournalFieldDefinition;
  dateKey: string;
  onValueCommit: (field: JournalFieldDefinition, value: string | number | boolean | null) => void;
}) {
  const { colors, brand, radius } = useAppTheme();
  const value = useDayJournalStore((s) => s.doc.entries[dateKey]?.values[field.id]);

  return (
    <AppSurfaceCard style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: field.prompt ? 6 : 12 }}>
        {field.label}
      </Text>
      {field.prompt ? (
        <Text style={{ fontSize: 13, lineHeight: 20, color: colors.textMuted, marginBottom: 12 }}>{field.prompt}</Text>
      ) : null}

      {field.type === 'text' ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: brand.surfaceBorder,
            borderRadius: radius.lg,
            backgroundColor: 'rgba(0,0,0,0.2)',
            padding: 14,
          }}
        >
          <JournalMultilineInput
            value={typeof value === 'string' ? value : ''}
            placeholder="Напиши сюда"
            onChangeText={(text) => onValueCommit(field, text)}
          />
        </View>
      ) : field.type === 'number' ? (
        <TextInput
          value={typeof value === 'number' ? String(value) : ''}
          onChangeText={(text) => {
            const trimmed = text.trim();
            onValueCommit(field, trimmed ? Number(trimmed.replace(',', '.')) : null);
          }}
          placeholder="0"
          placeholderTextColor="rgba(255,255,255,0.28)"
          keyboardType="numeric"
          style={{
            borderWidth: 1,
            borderColor: brand.surfaceBorder,
            borderRadius: radius.lg,
            backgroundColor: 'rgba(0,0,0,0.2)',
            paddingVertical: 14,
            paddingHorizontal: 14,
            color: colors.text,
            fontSize: 16,
          }}
        />
      ) : (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 1,
            borderColor: brand.surfaceBorder,
            borderRadius: radius.lg,
            backgroundColor: 'rgba(0,0,0,0.2)',
            paddingVertical: 12,
            paddingHorizontal: 14,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{value === true ? 'Да' : 'Нет'}</Text>
          <Switch value={value === true} onValueChange={(next) => onValueCommit(field, next)} />
        </View>
      )}
    </AppSurfaceCard>
  );
}
