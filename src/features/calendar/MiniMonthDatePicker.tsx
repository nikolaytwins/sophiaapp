import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { monthTitleRu } from '@/features/calendar/calendarFormat';
import { monthCalendarRows, shiftCalendarMonth } from '@/features/calendar/calendarMonthLogic';
import { WEEKDAY_SHORT_RU } from '@/features/day/dayHabitUi';

function ymFromDateKey(dateKey: string | null | undefined): { y: number; m: number } {
  if (dateKey && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return { y: Number(dateKey.slice(0, 4)), m: Number(dateKey.slice(5, 7)) };
  }
  const t = new Date();
  return { y: t.getFullYear(), m: t.getMonth() + 1 };
}

function formatDateKeyRu(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

type Colors = { text: string; textMuted: string; border: string };

type Props = {
  /** YYYY-MM-DD или пусто = без даты */
  value: string;
  onChange: (dateKey: string) => void;
  /** Сброс в «без даты» */
  onClear?: () => void;
  allowClear?: boolean;
  /** Месяц календаря при первом открытии, если value пустой */
  fallbackMonthFromKey: string;
  todayKey: string;
  isLight: boolean;
  colors: Colors;
  /** Стили поля (как minimalField) */
  fieldStyle: object;
  typographyBody: object;
};

/** Поле даты: по нажатию — компактный календарь над полем (пн–вс). */
export function MiniMonthDateField({
  value,
  onChange,
  onClear,
  allowClear = true,
  fallbackMonthFromKey,
  todayKey,
  isLight,
  colors,
  fieldStyle,
  typographyBody,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pickerYm, setPickerYm] = useState(() => ymFromDateKey(value || fallbackMonthFromKey));

  useEffect(() => {
    if (open) {
      setPickerYm(ymFromDateKey(value || fallbackMonthFromKey));
    }
  }, [open, value, fallbackMonthFromKey]);

  const rows = useMemo(() => monthCalendarRows(pickerYm.y, pickerYm.m), [pickerYm.y, pickerYm.m]);
  const label = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDateKeyRu(value) : 'Без даты';

  const cardBg = isLight ? 'rgba(255,255,255,0.98)' : 'rgba(18, 10, 40, 0.96)';
  const cardBorder = isLight ? colors.border : 'rgba(157, 107, 255, 0.35)';

  return (
    <View style={{ position: 'relative', zIndex: open ? 50 : 0, flexDirection: 'column-reverse' }}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={[typographyBody, fieldStyle, { justifyContent: 'center' }]}
        accessibilityRole="button"
        accessibilityLabel="Выбрать дату"
      >
        <Text style={{ color: value ? colors.text : colors.textMuted, fontWeight: '700' }}>{label}</Text>
      </Pressable>

      {open ? (
        <View
          style={{
            marginBottom: 8,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: cardBorder,
            backgroundColor: cardBg,
            padding: 10,
            ...(Platform.OS === 'web'
              ? ({
                  boxShadow: '0 16px 48px rgba(0,0,0,0.35), 0 0 40px rgba(123,92,255,0.15)',
                } as object)
              : {}),
            elevation: 14,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Pressable
              onPress={() => setPickerYm((p) => shiftCalendarMonth(p.y, p.m, -1))}
              hitSlop={10}
              accessibilityLabel="Предыдущий месяц"
            >
              <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
            </Pressable>
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{monthTitleRu(pickerYm.y, pickerYm.m)}</Text>
            <Pressable
              onPress={() => setPickerYm((p) => shiftCalendarMonth(p.y, p.m, 1))}
              hitSlop={10}
              accessibilityLabel="Следующий месяц"
            >
              <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            {WEEKDAY_SHORT_RU.map((d) => (
              <View key={d} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: colors.textMuted }}>{d}</Text>
              </View>
            ))}
          </View>
          {rows.map((weekRow, wi) => (
            <View key={`mini-${wi}`} style={{ flexDirection: 'row', marginBottom: 2 }}>
              {weekRow.map((dateKey) => {
                const inMonth = Number(dateKey.slice(5, 7)) === pickerYm.m;
                const isToday = dateKey === todayKey;
                const selected = dateKey === value;
                return (
                  <Pressable
                    key={dateKey}
                    onPress={() => {
                      onChange(dateKey);
                      setOpen(false);
                    }}
                    style={{
                      flex: 1,
                      marginHorizontal: 1,
                      paddingVertical: 6,
                      borderRadius: 8,
                      alignItems: 'center',
                      backgroundColor: selected ? 'rgba(123, 92, 255, 0.35)' : isToday ? 'rgba(123, 92, 255, 0.12)' : 'transparent',
                      borderWidth: isToday && !selected ? 1 : 0,
                      borderColor: 'rgba(157, 107, 255, 0.45)',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color: inMonth ? colors.text : colors.textMuted,
                        opacity: inMonth ? 1 : 0.35,
                      }}
                    >
                      {Number(dateKey.slice(8, 10))}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
          {allowClear && onClear ? (
            <Pressable
              onPress={() => {
                onClear();
                setOpen(false);
              }}
              style={{ marginTop: 8, paddingVertical: 8, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textMuted }}>Без даты</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
