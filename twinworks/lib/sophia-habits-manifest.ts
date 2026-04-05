/**
 * Контент экрана Sophia «Привычки»: супер-цель, плашки, цели спринта, текст дневника.
 * Меняется в коде; при необходимости позже вынести в БД.
 */
export const SOPHIA_HABITS_MANIFEST = {
  northStar: {
    badge: 'Супер-цель',
    title: 'Поездка в Китай',
    subtitle: 'То, ради чего я работаю — держу ритм и фокус.',
    amountLine: '~300 000 ₽ на поездку',
  },
  reminders: [
    {
      id: 'pc-reward',
      variant: 'info' as const,
      title: 'Компьютер — только награда',
      body: 'Компы только после сделанного действия по работе, как награда.',
    },
    {
      id: 'no-fantasy',
      variant: 'warning' as const,
      title: '❗ Убрать жизнь в фантазиях',
      body: 'Временно не крутить в голове девушек, тройнички и большие проекты — только реальные шаги.',
    },
  ],
  sprintGoals: [
    { id: 'china-300k', title: 'Китай — накопить ~300 000 ₽' },
    { id: 'cushion-700k', title: 'Подушка безопасности — 700 000 ₽' },
  ],
  journalPrompt:
    'Я оправдывался? Объяснял себя? Подстраивался под ожидания другого?',
} as const

export type SophiaHabitsManifest = typeof SOPHIA_HABITS_MANIFEST
