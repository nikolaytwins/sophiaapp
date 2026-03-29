import type { ContentIdea } from '@/types/creator'

export const MOCK_IDEAS: ContentIdea[] = [
  { id: 'i1', name: 'Как я вышел на 500к подписчиков', platform: 'youtube', topic: 'личная история', format: 'личная история', hook: 'Цифра + личный результат', status: 'in_progress', priority: 'high', notes: 'Снять до конца марта', createdAt: '2026-03-01' },
  { id: 'i2', name: '5 ошибок в Reels', platform: 'instagram', topic: 'ошибки новичков', format: 'разбор ошибки', hook: '90% делают эти ошибки', status: 'idea', priority: 'high', notes: '', createdAt: '2026-03-05' },
  { id: 'i3', name: 'Почему дизайнеры не зарабатывают', platform: 'youtube', topic: 'дизайн', format: 'провокация', hook: 'Жёсткая правда', status: 'published', priority: 'medium', notes: 'Уже вышло', createdAt: '2026-02-28' },
  { id: 'i4', name: 'День из жизни фрилансера', platform: 'instagram', topic: 'фриланс', format: 'реалити', hook: 'Реальный день', status: 'shot', priority: 'medium', notes: 'Монтаж на этой неделе', createdAt: '2026-03-03' },
  { id: 'i5', name: 'Переход из офиса в свой бизнес', platform: 'telegram', topic: 'деньги', format: 'личная история', hook: 'Как я ушёл с работы', status: 'postponed', priority: 'low', notes: 'Отложить до апреля', createdAt: '2026-02-20' },
  { id: 'i6', name: 'Кейс: как мы вывели агентство на 200к', platform: 'youtube', topic: 'агентство', format: 'кейс', hook: 'Цифра + результат', status: 'idea', priority: 'high', notes: '', createdAt: '2026-03-07' },
]
