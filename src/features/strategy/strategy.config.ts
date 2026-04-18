/**
 * Контент экрана «Стратегия» — меняй здесь тексты и списки без правки вёрстки.
 * У каждого чекпоинта стабильный `id` (для сохранения галочек в AsyncStorage).
 */

export type StrategyPhaseBadgeVariant = 'now' | 'build' | 'growth' | 'launch' | 'scale' | 'muted';

export type StrategyCheckpointDef = {
  id: string;
  text: string;
};

export type StrategyColumnDef = {
  title: string;
  checkpoints: StrategyCheckpointDef[];
};

export type StrategyMonthBlockDef = {
  title: string;
  checkpoints: StrategyCheckpointDef[];
};

export type StrategyPhaseDef = {
  id: string;
  badgeLabel: string;
  badgeVariant: StrategyPhaseBadgeVariant;
  title: string;
  /** Короткая подпись справа в шапке плашки */
  headerAside?: string;
  /** Три колонки (как «приоритет 1 / 2 / май») */
  columns?: StrategyColumnDef[];
  /** Блоки «Июнь» / «Июль» и т.п. */
  months?: StrategyMonthBlockDef[];
  /** Текст в отдельной карточке снизу фазы */
  footnoteCard?: { text: string };
  initiallyOpen?: boolean;
};

export type StrategyPageConfig = {
  meta: {
    title: string;
    subtitle: string;
    /** Подзаголовок с датой последнего обновления контента */
    lastContentUpdate: string;
    headerBadge: string;
  };
  strategySectionTitle: string;
  phases: StrategyPhaseDef[];
};

/** Алиас для импорта: один объект данных страницы. */
export const strategyData: StrategyPageConfig = {
  meta: {
    title: 'Стратегия · TwinTech',
    subtitle: 'Дорожная карта и чекпоинты',
    lastContentUpdate: 'Последнее обновление контента: 18 апреля 2026',
    headerBadge: 'Апрель 2026',
  },
  strategySectionTitle: 'Стратегия',
  phases: [
    {
      id: 'phase-2026-q2-survival',
      badgeLabel: 'Сейчас',
      badgeVariant: 'now',
      title: 'Апрель–май 2026 · Выживание + закладка фундамента',
      headerAside: 'Сатурн ↔ Солнце · Марс заблок.',
      initiallyOpen: true,
      columns: [
        {
          title: 'Апрель – середина мая. Приоритет №1',
          checkpoints: [
            { id: 'p1-apr-p1-close300', text: 'Закрыть проект за 300к' },
            { id: 'p1-apr-p1-sales-daily', text: 'Внедрить ежедневные продажи' },
            { id: 'p1-apr-p1-designer', text: 'Нанять дизайнера на полставки' },
          ],
        },
        {
          title: 'Апрель – середина мая. Приоритет №2',
          checkpoints: [
            { id: 'p1-apr-p2-hypeman-mvp', text: 'Разработать MVP хайпмена' },
            { id: 'p1-apr-p2-reels30', text: 'Сделать 30 тестовых рилсов для Коперника через Хайпмена' },
            { id: 'p1-apr-p2-design-course', text: 'Закрыть минимум 2 модуля курса по дизайну' },
          ],
        },
        {
          title: 'Май',
          checkpoints: [
            { id: 'p1-may-site', text: 'Новый сайт Twinlabs' },
            { id: 'p1-may-traffic', text: 'Запуск трафика с Егором' },
          ],
        },
      ],
      footnoteCard: {
        text:
          'Транзит-режим апрель–июль: Сатурн ↔ Солнце — всё через сопротивление, делать медленно и точно. Марс заблокирован — форсировать крупные запуски бесполезно. Нептун туманит коммуникации — никаких новых партнёрств с незнакомцами. Живой контент о кризисе — можно и нужно, системная медийка — нет.',
      },
    },
    {
      id: 'phase-2026-summer-infra',
      badgeLabel: 'Строим',
      badgeVariant: 'build',
      title: 'Июнь–июль 2026 · Инфраструктура',
      headerAside: 'Процессы и носители',
      initiallyOpen: false,
      months: [
        {
          title: 'Июнь',
          checkpoints: [
            { id: 'p2-jun-tenders', text: 'Старт откликов на тендерах' },
            { id: 'p2-jun-case300', text: 'Кейс 300к — оформить как портфолио' },
            { id: 'p2-jun-copernicus10', text: 'Коперник: если 10+ продаж → v1.0 в разработку' },
            { id: 'p2-jun-bigco', text: 'Начать поиск работ в больших компаниях' },
          ],
        },
        {
          title: 'Июль',
          checkpoints: [
            { id: 'p2-jul-media', text: 'Запуск стабильной медийки в личном инстаграм' },
            { id: 'p2-jul-youtube', text: 'Ютуб + инст постить активно' },
          ],
        },
      ],
    },
  ],
};

/** То же, что `strategyData` — удобное имя для экрана. */
export const strategyPageConfig = strategyData;

/** Все id чекпоинтов из конфига (для валидации / миграций). */
export function collectStrategyCheckpointIds(config: StrategyPageConfig = strategyData): string[] {
  const ids: string[] = [];
  for (const ph of config.phases) {
    for (const col of ph.columns ?? []) {
      for (const c of col.checkpoints) ids.push(c.id);
    }
    for (const m of ph.months ?? []) {
      for (const c of m.checkpoints) ids.push(c.id);
    }
  }
  return ids;
}
