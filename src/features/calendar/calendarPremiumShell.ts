import { Platform } from 'react-native';

/** Фон страницы календаря (Synaptix-style). */
export const CAL_PAGE_BASE = '#0D0E1A';

/** Карточки / панели. */
export const CAL_CARD_BG = '#141526';

export const CAL_CARD_BORDER = 'rgba(255,255,255,0.03)';

const SYN_WEB_CARD_SHADOW =
  '10px 10px 30px rgba(0,0,0,0.5), inset -5px -5px 15px rgba(255,255,255,0.01), inset 5px 5px 15px rgba(0,0,0,0.3)';

/** Основной «премиальный» контейнер (сайдбар, сетка, карточки блоков). */
export function calendarSynaptixCardStyle(): object {
  if (Platform.OS === 'web') {
    return {
      backgroundColor: CAL_CARD_BG,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: CAL_CARD_BORDER,
      boxShadow: SYN_WEB_CARD_SHADOW,
    };
  }
  return {
    backgroundColor: CAL_CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CAL_CARD_BORDER,
    elevation: 12,
  };
}

/** Свечение для активной кнопки / таба (web). */
export function calendarSynaptixGlowWeb(accentRgb: string): object {
  if (Platform.OS !== 'web') return {};
  return {
    boxShadow: `0 0 28px rgba(${accentRgb}, 0.45), 0 8px 24px rgba(0,0,0,0.35)`,
  } as object;
}
