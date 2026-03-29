import type { ExperimentHypothesis } from '@/types/creator'

export const MOCK_EXPERIMENTS: ExperimentHypothesis[] = [
  {
    id: 'e1',
    name: 'Короткий хук до 2 секунд',
    whatWeTest: 'Хук до 2 сек повышает retention в первой трети',
    videosTested: 8,
    result: 'Retention +12% в первых 10 сек при коротком хуке',
    status: 'validated',
  },
  {
    id: 'e2',
    name: 'Цифры в заголовке',
    whatWeTest: 'Цифры в заголовке улучшают CTR',
    videosTested: 5,
    result: 'CTR в среднем +1.5% при цифре в заголовке',
    status: 'in_progress',
  },
  {
    id: 'e3',
    name: 'Личная история и подписчики',
    whatWeTest: 'Личная история даёт больше подписчиков с ролика',
    videosTested: 6,
    result: 'Подтверждается: +40% подписчиков на сторителл vs обучение',
    status: 'validated',
  },
  {
    id: 'e4',
    name: 'Провокационный вход',
    whatWeTest: 'Провокационный хук усиливает досмотр',
    videosTested: 4,
    result: 'Пока недостаточно данных',
    status: 'in_progress',
  },
  {
    id: 'e5',
    name: 'Длина 45 сек vs 60 сек (Reels)',
    whatWeTest: 'Оптимальная длина Reels 45 vs 60 сек',
    videosTested: 3,
    result: '45 сек дали выше avgViewPercent, но 60 сек — больше сохранений',
    status: 'rejected',
  },
]
