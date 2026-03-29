import React, { memo, useCallback, type ChangeEvent } from 'react';
import { Platform, StyleSheet, TextInput } from 'react-native';

const VISION_MIN_H = 80;

const styles = StyleSheet.create({
  input: {
    width: '100%',
    minHeight: VISION_MIN_H,
    color: 'rgba(248,250,252,0.94)',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400',
    padding: 0,
    margin: 0,
  },
});

/** Один объект на модуль — не меняем ссылку между рендерами. */
const WEB_TEXTAREA_STYLE: React.CSSProperties = {
  width: '100%',
  minHeight: VISION_MIN_H,
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
};

const PLACEHOLDER = 'Напишите или вставьте текст видения для этой сферы.';

type Props = {
  value: string;
  onChangeText: (t: string) => void;
};

/**
 * Web: только DOM textarea. Импорт `VisionTextInput.web.tsx` при алиасе `@/.../VisionTextInput`
 * в Metro часто НЕ резолвится — подставляется этот файл с RN TextInput → Maximum update depth.
 * Нативно: RN TextInput (без react-native-web textarea).
 */
function VisionTextInputInner({ value, onChangeText }: Props) {
  const onWebChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const t = e.currentTarget.value;
      if (t === value) return;
      onChangeText(t);
    },
    [value, onChangeText]
  );

  if (Platform.OS === 'web') {
    return React.createElement('textarea', {
      value,
      onChange: onWebChange,
      placeholder: PLACEHOLDER,
      rows: 4,
      style: WEB_TEXTAREA_STYLE,
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
      placeholder={PLACEHOLDER}
      placeholderTextColor="rgba(255,255,255,0.32)"
      style={styles.input}
    />
  );
}

export const VisionTextInput = memo(VisionTextInputInner);
