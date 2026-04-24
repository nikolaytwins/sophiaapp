import { Platform } from 'react-native';

import { SOPHIA_UI_ACCENT } from '@/navigation/navConstants';

/** Карточки как модалки календаря (тёмная тема). */
export const PROFILE_CARD_BG_DARK = '#1A1535';

export function profileCardBorder(isLight: boolean) {
  return isLight ? 'rgba(15,17,24,0.1)' : 'rgba(157, 107, 255, 0.2)';
}

/** Подписи секций в духе `sectionLabel` календаря (не v2). */
export function profileSectionEyebrow(isLight: boolean, textMuted: string) {
  return {
    fontSize: 10,
    fontWeight: '900' as const,
    letterSpacing: 1.55,
    color: isLight ? textMuted : 'rgba(210, 200, 255, 0.78)',
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    ...(Platform.OS === 'web' && !isLight ? ({ textShadow: '0 0 22px rgba(157,107,255,0.35)' } as const) : {}),
  };
}

/** Единая полоска-акцент слева у карточек (как рейл/календарь, без радуги). */
export const PROFILE_CARD_STRIPE = SOPHIA_UI_ACCENT;

/** Иконка-стрелка у списка «что любишь» — приглушённый фирменный лиловый. */
export const PROFILE_LIST_ICON = 'rgba(157, 107, 255, 0.72)';
