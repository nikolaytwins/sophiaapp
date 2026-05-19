import type { StrategySideGoalSeedDef } from '@/features/strategy/strategy.config';

/** Цель подушки на дашборде «Система жизни» (синхрон с notes счёта `target:…`). */
export const LIFE_SYSTEM_CUSHION_TARGET_RUB = 1_200_000;

export const LIFE_SYSTEM_PASSIVE_INCOME_RUB = 250_000;

/** Цели для раздела «Цели» и дашборда (стабильные id). */
export const LIFE_SYSTEM_SIDE_GOAL_SEEDS: StrategySideGoalSeedDef[] = [
  {
    id: 'sg-wcd',
    title: 'World Class Deluxe — 220 000 ₽',
    description: 'В рассрочку',
    defaultTarget: 220_000,
    isNearestPinned: true,
  },
  {
    id: 'sg-istanbul',
    title: 'Встретить 1 октября в Стамбуле',
    description: 'Личная точка назначения',
    defaultTarget: 1,
    progressKind: 'checkbox',
    isNearestPinned: true,
    dateMode: 'single',
    dateSingle: '2026-10-01',
  },
  {
    id: 'sg-macmini',
    title: 'Уютное рабочее место с Mac Mini',
    description: 'Домашний офис',
    defaultTarget: 1,
    progressKind: 'checkbox',
    isNearestPinned: true,
  },
  {
    id: 'sg-iphone',
    title: 'Новый iPhone',
    description: 'Подарок на день рождения себе',
    defaultTarget: 1,
    progressKind: 'checkbox',
    isNearestPinned: true,
  },
  {
    id: 'sg-mercedes',
    title: 'Mercedes E Coupe',
    description: 'Серый матовый. Без компромиссов.',
    defaultTarget: 1,
    progressKind: 'checkbox',
    isHorizon: true,
  },
  {
    id: 'sg-house',
    title: 'Частный дом',
    description: 'Своё пространство. Своя территория.',
    defaultTarget: 1,
    progressKind: 'checkbox',
    isHorizon: true,
  },
];

export type LifeSystemMoneyBucket = {
  id: string;
  label: string;
  amountRub: number;
  note: string;
  breakdown?: { label: string; amountRub: number }[];
};

export const LIFE_SYSTEM_FINANCE: {
  buckets: LifeSystemMoneyBucket[];
  cardDepositRub: number;
  principle: string;
  growthAccountHint: string;
} = {
  buckets: [
    {
      id: 'ops',
      label: 'Операционный счёт',
      amountRub: 117_000,
      note: 'На карту ~95 000 ₽ / мес',
      breakdown: [
        { label: 'Быт', amountRub: 40_000 },
        { label: 'Совместное время', amountRub: 30_000 },
        { label: 'Мои расходы', amountRub: 10_000 },
        { label: 'Расходы Леры', amountRub: 10_000 },
        { label: 'Рабочие расходы', amountRub: 10_000 },
        { label: 'Коммуналка', amountRub: 5_000 },
      ],
    },
    {
      id: 'payroll',
      label: 'Счёт зарплат',
      amountRub: 100_000,
      note: 'Фонд оплаты труда команды',
    },
    {
      id: 'cushion',
      label: 'Подушка безопасности',
      amountRub: 50_000,
      note: 'Ежемесячное пополнение',
    },
  ],
  cardDepositRub: 95_000,
  principle:
    'Сначала операционка, зарплаты и подушка. Только то, что остаётся — на рост и хотелки. Не наоборот.',
  growthAccountHint:
    'Создайте счёт в «Финансы» → накопления с «рост» или «хотелки» в названии — прогресс появится здесь.',
};

export type LifeSystemTimelineItem = {
  id: string;
  when: string;
  title: string;
  subtitle: string;
  chips?: string[];
  accent: 'violet' | 'teal' | 'amber' | 'rose' | 'mint';
  highlight?: boolean;
};

export const LIFE_SYSTEM_ROADMAP: LifeSystemTimelineItem[] = [
  {
    id: 'may-twin',
    when: 'МАЙ\nприоритет',
    title: 'Twijnlabs — автоматизация',
    subtitle: 'Закрытие обязательств + автопоток лидов',
    chips: ['дизайнер', 'профи.ру бот', 'парсер', 'КП'],
    accent: 'violet',
    highlight: true,
  },
  {
    id: 'jun',
    when: 'ИЮНЬ',
    title: 'Коперник + Блог',
    subtitle: 'Запуск нового проекта. Старт медийки.',
    accent: 'teal',
  },
  {
    id: 'jul',
    when: 'ИЮЛЬ',
    title: 'Дейзи — платформа',
    subtitle: 'ИИ-чат, CRM, отдел продаж, конструктор',
    accent: 'amber',
  },
  {
    id: 'aug',
    when: '14 АВГ',
    title: 'Хайпмен',
    subtitle: 'Запуск',
    accent: 'rose',
  },
  {
    id: 'sep',
    when: '27 СЕНТ',
    title: 'Импульс + Татуировка',
    subtitle: 'Запуск курса. И — тату в этот же день.',
    accent: 'violet',
  },
  {
    id: 'oct',
    when: '1 ОКТ',
    title: 'Стамбул',
    subtitle: 'Личная точка назначения',
    accent: 'teal',
    highlight: true,
  },
];

export const LIFE_SYSTEM_TWINLABS_STEPS = [
  { n: '01', title: 'Нанять дизайнера', note: 'Снять с себя визуальную часть' },
  { n: '02', title: 'Автооткликатор Профи.ру', note: 'Поток лидов 24/7 без участия' },
  { n: '03', title: 'Парсер Яндекс.Карт / Авито', note: 'Проактивный поиск клиентов' },
  { n: '04', title: 'Генератор КП', note: '20 мин → 5 мин на коммерческое предложение' },
  { n: '05', title: 'Генератор прототипов — Claude Code', note: 'Автоматическая генерация прототипов' },
  { n: '06', title: 'Новый сайт twinlabs.pro', note: 'Заглушка и дальше полноценный сайт' },
];

export const LIFE_SYSTEM_WORK_MODE = {
  blocks: [
    { value: '3', label: 'блока' },
    { value: '1.5', label: 'часа каждый' },
    { value: '1', label: 'выходной' },
  ],
  rhythm: ['Отдых → до начала работы', 'Блоки с разными типами задач', 'Отдых после работы', 'Жёсткий конец дня — не нарушать'],
  priorities: [
    {
      n: 1,
      title: 'Закрытие обязательств перед клиентами',
      note: 'Всегда первое. Репутация — основа всего.',
      tone: 'urgent' as const,
    },
    {
      n: 2,
      title: 'Twijnlabs — автоматизация',
      note: 'Деньги сейчас + освобождение времени',
      tone: 'primary' as const,
    },
    {
      n: 3,
      title: 'Продажи на большие чеки + курс',
      note: 'Параллельно с операционкой',
      tone: 'muted' as const,
    },
    {
      n: 4,
      title: 'Остальные проекты — по расписанию',
      note: 'Коперник, Дейзи, блог — по срокам из таймлайна',
      tone: 'muted' as const,
    },
  ],
  rule90:
    'Правило 90 дней: два активных направления максимум. Всё остальное в режиме минимальной поддержки. Не пересматривать 30 дней.',
};

export const LIFE_SYSTEM_DAILY_PRACTICES = [
  { icon: '❄', title: 'Холодный душ каждое утро', note: 'Запускает нервную систему. Не скипать.' },
  { icon: '✕', title: 'Без кофе', note: 'Отказ полностью, не снижение.' },
  { icon: '○', title: 'Сон до 01:00, подъём в 09:00', note: 'Фиксированный ритм. Не варьировать.' },
];

export const LIFE_SYSTEM_LIFE_RULES = [
  { icon: '✕', title: 'Кофе, лимонады, сладкие калории', note: 'Отказ полностью.' },
  { icon: '✕', title: 'Мучное, жареное, паста', note: 'Десерт — раз в месяц максимум.' },
  { icon: '↓', title: 'Сон до 01:00, подъём в 09:00', note: 'Фиксированный ритм.' },
  { icon: '◎', title: 'Проветривать комнату перед сном', note: 'Прохладный воздух улучшает сон.' },
  { icon: '❄', title: 'Холодный душ по утрам', note: 'Каждый день.' },
  { icon: '◐', title: 'Одно занятие без KPI', note: 'Физическое или творческое — для дофамина.' },
];

export const LIFE_SYSTEM_NAV_SECTIONS = [
  { id: 'goals', label: 'Цели' },
  { id: 'money', label: 'Деньги' },
  { id: 'projects', label: 'Проекты' },
  { id: 'work', label: 'Режим' },
  { id: 'health', label: 'Здоровье' },
  { id: 'life', label: 'Правила' },
] as const;
