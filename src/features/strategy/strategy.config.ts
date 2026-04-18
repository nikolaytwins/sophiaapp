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

/** Сегменты Gantt-полосы (цвета как в макете таймлайна). */
export type TimelineSegmentKind = 'internal' | 'dev' | 'launch' | 'scale' | 'pause';

export type TimelineSegmentDef = {
  kind: TimelineSegmentKind;
  label: string;
  /** Доля ширины полосы */
  flex: number;
};

export type TimelineProjectRowDef = {
  id: string;
  title: string;
  segments: TimelineSegmentDef[];
  description: string;
};

export type TimelineSectionDef = {
  heading: string;
  legend: { kind: TimelineSegmentKind; label: string }[];
  rows: TimelineProjectRowDef[];
};

/** Бейджи крупных карточек и сетки */
export type ProjectsHighlightBadgeVariant = 'fullGas' | 'priority2' | 'inside' | 'october' | 'year2026';

/** Плашки-вехи под полосой */
export type ProjectsMilestoneTagVariant =
  | 'milestoneGreen'
  | 'milestoneOrange'
  | 'milestoneBrown'
  | 'milestoneGrey'
  | 'milestoneBlue';

export type ProjectsHighlightSegmentDef = {
  label: string;
  flex: number;
  backgroundColor: string;
  textColor: string;
};

export type ProjectsHighlightCardDef = {
  id: string;
  title: string;
  badge: { label: string; variant: ProjectsHighlightBadgeVariant };
  description: string;
  segments: ProjectsHighlightSegmentDef[];
  tags: { label: string; variant: ProjectsMilestoneTagVariant }[];
};

export type ProjectsGridCardDef = {
  id: string;
  title: string;
  badge: { label: string; variant: ProjectsHighlightBadgeVariant };
  description: string;
};

export type ProjectsStatusSectionDef = {
  heading: string;
  highlights: ProjectsHighlightCardDef[];
  grid: ProjectsGridCardDef[];
};

export type PersonalBrandNarrativeDef = {
  id: string;
  title: string;
  /** Вторая строка на плашке */
  subtitle?: string;
};

export type PersonalBrandSectionDef = {
  sectionTitle: string;
  subtitle: string;
  narratives: PersonalBrandNarrativeDef[];
};

export const STRATEGY_MAIN_TABS = ['strategy', 'vision', 'notes'] as const;
export type StrategyMainTabId = (typeof STRATEGY_MAIN_TABS)[number];

export type StrategyTabsLabelsDef = {
  strategy: string;
  vision: string;
  notes: string;
};

/** Стартовые побочные цели (id стабильны — прогресс в AsyncStorage). */
export type StrategySideGoalSeedDef = {
  id: string;
  title: string;
  /** Для шкалы: рубли, подписчики или 1 = «ещё / сделано». */
  defaultTarget: number;
  defaultCurrent?: number;
};

export type StrategyGoalsTabDef = {
  pageTitle: string;
  nearestSectionTitle: string;
  nearestDeadlineLine: string;
  /** Заголовок блока с фото и карточками (доска желаний). */
  sideSectionTitle: string;
  /** Подзаголовок списка целей без галочки «горизонт». */
  boardNearSubheading: string;
  /** Подзаголовок целей с отметкой «на горизонте». */
  boardHorizonSubheading: string;
  sideGoalSeeds: StrategySideGoalSeedDef[];
};

export type GlobalVisionGoalLevelDef = {
  id: string;
  label: string;
  headline: string;
  body: string;
  accent: 'green' | 'amber' | 'violet';
};

export type GlobalVisionWhatIBuildDef = {
  title: string;
  paragraphs: string[];
};

export type GlobalVisionDef = {
  whatIBuild: GlobalVisionWhatIBuildDef;
  /** Мелкий капс над блоками уровней (как в макете). */
  goalLevelsCapsTitle: string;
  goalLevelsTitle: string;
  goalLevels: GlobalVisionGoalLevelDef[];
};

export type NotesScenarioItemDef = {
  /** Жирный зачин пункта */
  lead: string;
  body: string;
};

export type NotesTragicScenarioDef = {
  capsAboveCard: string;
  cardTitle: string;
  items: NotesScenarioItemDef[];
};

export type NotesHealthyScenarioDef = {
  cardTitle: string;
  items: NotesScenarioItemDef[];
};

export type NotesPatternAccent = 'violet' | 'coral' | 'amber' | 'slate' | 'blue';

export type NotesPatternCardDef = {
  id: string;
  accent: NotesPatternAccent;
  title: string;
  description: string;
  rule: string;
};

export type NotesPatternsSectionDef = {
  heading: string;
  cards: NotesPatternCardDef[];
};

export type AboutMeNotesDef = {
  pageTitle: string;
  sectionTitle: string;
  tragic: NotesTragicScenarioDef;
  healthy: NotesHealthyScenarioDef;
  patterns: NotesPatternsSectionDef;
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
  /** Таймлайн сервисов (редактируется здесь же). */
  timeline: TimelineSectionDef;
  /** Проекты: статус + мини-таймлайн (крупные карточки + сетка). */
  projectsStatus: ProjectsStatusSectionDef;
  /** Личный бренд: нарративы. */
  personalBrand: PersonalBrandSectionDef;
  /** Подписи верхних табов экрана «Стратегия». */
  tabs: StrategyTabsLabelsDef;
  globalVision: GlobalVisionDef;
  aboutMeNotes: AboutMeNotesDef;
  goalsTab: StrategyGoalsTabDef;
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
  timeline: {
    heading: 'ТАЙМЛАЙН ВСЕХ СЕРВИСОВ · АПРЕЛЬ 2025 — Q2 2026',
    legend: [
      { kind: 'internal', label: 'Внутри / активно' },
      { kind: 'dev', label: 'Разработка' },
      { kind: 'launch', label: 'Запуск' },
      { kind: 'scale', label: 'Масштаб' },
      { kind: 'pause', label: 'Пауза' },
    ],
    rows: [
      {
        id: 'tl-hypeman',
        title: 'Хайпмен',
        segments: [
          { kind: 'dev', label: 'Апр', flex: 1 },
          { kind: 'internal', label: 'Май', flex: 1 },
          { kind: 'internal', label: 'Июн', flex: 1 },
          { kind: 'internal', label: 'Июл', flex: 1 },
          { kind: 'scale', label: 'Авг', flex: 1.15 },
          { kind: 'scale', label: '→2026', flex: 1.35 },
        ],
        description:
          'Апр: MVP для 30 рилсов Коперника. Май+: инструмент для всей медийки. Отдельный паблик-продукт — 2026 когда Коперник зарабатывает без рук.',
      },
      {
        id: 'tl-copernicus',
        title: 'Коперник',
        segments: [
          { kind: 'dev', label: 'Апр тест', flex: 1.1 },
          { kind: 'dev', label: 'Май PDF', flex: 1 },
          { kind: 'launch', label: 'Июн v1', flex: 1 },
          { kind: 'launch', label: 'Июл', flex: 1 },
          { kind: 'scale', label: 'Авг', flex: 1 },
          { kind: 'scale', label: '→990₽', flex: 1.15 },
        ],
        description:
          'Апр: 30 рилсов + 3–5 тест-продаж PDF 2990₽. Май: 10+ продаж → строить сервис. Июн–Июл: v1.0. Авг+: подписка 990₽/мес — первый пассивный доход.',
      },
      {
        id: 'tl-daisy',
        title: 'Дейзи',
        segments: [
          { kind: 'internal', label: 'Апр–Июн: внутри TwinLabs', flex: 2.6 },
          { kind: 'internal', label: 'Июл–Сен: внутри, итерации', flex: 2.2 },
          { kind: 'launch', label: 'Окт MVP', flex: 1 },
          { kind: 'scale', label: '→', flex: 1.1 },
        ],
        description:
          'Всё лето — только для повышения маржи агентства. Паблик в октябре если будет 500+ аудитория от медийки. Астро-комментарий: Меркурий (управитель Луны Близнецов) усилен — Дейзи как инструмент скорости мышления верна по карте.',
      },
      {
        id: 'tl-sofia',
        title: 'Sofia',
        segments: [
          { kind: 'pause', label: 'Апр–Сен: пауза', flex: 3.2 },
          { kind: 'launch', label: 'Окт', flex: 1 },
          { kind: 'scale', label: 'Ноя', flex: 1 },
          { kind: 'scale', label: '→', flex: 1.15 },
        ],
        description:
          'Продукт готов, нет аудитории. Запуск в октябре когда ТГ/Инст 1000+. Sofia + личный бренд о постановке целей = прямое попадание в Раху Льва (влиять на умы).',
      },
      {
        id: 'tl-team-tracker',
        title: 'Тим Трекер',
        segments: [
          { kind: 'internal', label: '2025: только для себя и агентства', flex: 2.8 },
          { kind: 'dev', label: 'Q1 2026 MVP', flex: 1.2 },
          { kind: 'launch', label: 'Q2 2026', flex: 1 },
        ],
        description:
          'Используй сам — ты лучший кейс. Паблик когда TwinLabs системно работает. Юпитер+Сатурн в 4м доме: строить-разрушать-строить — трекер буквально лечит этот паттерн.',
      },
      {
        id: 'tl-angie',
        title: 'Энжи',
        segments: [
          { kind: 'pause', label: '2025: стоп', flex: 2 },
          { kind: 'dev', label: 'Q1 2026', flex: 1.2 },
          { kind: 'launch', label: 'Q2 2026', flex: 1 },
        ],
        description:
          'По натальной карте: Венера Лев 8й дом + Юпитер Телец = трансформация через тело и ресурсы — Энжи кармически ок. Но рынок перегрет. Вернуться в 2026: если к тому моменту есть аудитория, запустить быстро через Хайпмен.',
      },
    ],
  },
  projectsStatus: {
    heading: 'ПРОЕКТЫ · СТАТУС И ТАЙМЛАЙН',
    highlights: [
      {
        id: 'ph-twinlabs',
        title: 'TwinLabs Studio',
        badge: { label: 'Полный газ', variant: 'fullGas' },
        description: 'Выживание и фундамент. Агентство + AI-разработка.',
        segments: [
          { label: 'Апр: 300к', flex: 1, backgroundColor: '#dcfce7', textColor: '#14532d' },
          { label: 'Май: сайт', flex: 1, backgroundColor: '#86efac', textColor: '#14532d' },
          { label: 'Июн: тендеры', flex: 1, backgroundColor: '#4ade80', textColor: '#052e16' },
          { label: 'Авг+: рост', flex: 1.15, backgroundColor: '#166534', textColor: '#ecfdf5' },
        ],
        tags: [
          { label: 'Проект 300к → апрель-май', variant: 'milestoneGreen' },
          { label: 'Сайт → неделя 4 (10 мая)', variant: 'milestoneOrange' },
          { label: 'Тендеры → июнь', variant: 'milestoneBrown' },
          { label: 'Корп. аутсорс → июнь+', variant: 'milestoneGrey' },
        ],
      },
      {
        id: 'ph-copernicus',
        title: 'Коперник · ИИ-астролог',
        badge: { label: 'Приоритет #2', variant: 'priority2' },
        description: 'Первый тест пассивного дохода. Рилсы → PDF → сервис.',
        segments: [
          { label: 'Апр: рилсы', flex: 1, backgroundColor: '#bfdbfe', textColor: '#1e3a8a' },
          { label: 'Май: PDF', flex: 1, backgroundColor: '#60a5fa', textColor: '#0f172a' },
          { label: 'Июн: v1.0', flex: 1, backgroundColor: '#8b5cf6', textColor: '#faf5ff' },
          { label: 'Авг: подписка', flex: 1, backgroundColor: '#7c3aed', textColor: '#faf5ff' },
          { label: '→ 990₽', flex: 1.05, backgroundColor: '#5b21b8', textColor: '#ede9fe' },
        ],
        tags: [
          { label: 'Хайпмен MVP → нед 1', variant: 'milestoneBlue' },
          { label: '30 рилсов → конец мая', variant: 'milestoneBlue' },
          { label: 'PDF 2990₽ → тест в мае', variant: 'milestoneBlue' },
          { label: 'Сервис → если 10+ продаж', variant: 'milestoneGrey' },
        ],
      },
    ],
    grid: [
      {
        id: 'pg-daisy',
        title: 'Дейзи',
        badge: { label: 'Внутри', variant: 'inside' },
        description: 'Повышает маржу агентства. Паблик — октябрь 2025 если будет аудитория.',
      },
      {
        id: 'pg-sofia',
        title: 'Sofia',
        badge: { label: 'Октябрь', variant: 'october' },
        description: 'Продукт готов. Запуск когда 1000+ подписчиков от медийки.',
      },
      {
        id: 'pg-tracker',
        title: 'Тим Трекер',
        badge: { label: '2026', variant: 'year2026' },
        description: 'Только для себя весь 2025. Ты лучший кейс для него.',
      },
      {
        id: 'pg-angie',
        title: 'Энжи / Хайпмен',
        badge: { label: '2026', variant: 'year2026' },
        description: 'Кармически ок (Венера Лев 8й дом), но рынок перегрет. Вернуться с аудиторией.',
      },
    ],
  },
  personalBrand: {
    sectionTitle: 'Личный бренд',
    subtitle: 'Три нарратива, которые работают вместе',
    narratives: [
      {
        id: 'pb-crisis',
        title: 'Нарратив 1. Кризис и трансформация.',
        subtitle: 'ИИ убил мой бизнес → вот что делаю',
      },
      {
        id: 'pb-vibe',
        title: 'Нарратив 2. ИИ разработка внутри',
        subtitle: 'Как я сделал вайбкодингом 300к',
      },
      {
        id: 'pb-astro',
        title: 'Нарратив 3. Строю ИИ астролога',
      },
    ],
  },
  tabs: {
    strategy: 'Стратегия',
    vision: 'Глобальное видение',
    notes: 'Важные заметки обо мне',
  },
  globalVision: {
    whatIBuild: {
      title: 'Что я строю',
      paragraphs: [
        'TwinTech — это технологическая корпорация которую я создаю с нуля. Она состоит из двух направлений.',
        'TwinLabs Studio — агентство нового поколения. Мы делаем сайты, дизайн и продукты используя ИИ там где раньше нужны были десятки людей. Мы не конкурируем с обычными агентствами — мы в другой лиге. У нас есть кейсы на 300 тысяч рублей за разовый проект через вайбкодинг. Это только начало.',
        'SAAS-портфель — публичные продукты по подписке. Первый из них Коперник — ИИ-астролог который помогает людям понять себя через натальную карту. За ним идут Sofia, Дейзи, Хайпмен и другие. Каждый из них решает реальную боль реальных людей. Каждый зарабатывает пока я сплю.',
        'В далёком горизонте — Monolyth. IP-вселенная. Фильмы, игры, персонажи, нарративы созданные с помощью ИИ. Это то ради чего я готов работать без остановки. Это мой Марвел.',
      ],
    },
    goalLevelsCapsTitle: 'ТРИ УРОВНЯ ЦЕЛЕЙ',
    goalLevelsTitle: 'Три уровня целей',
    goalLevels: [
      {
        id: 'gv-min',
        label: 'МИНИМУМ · 2026–2027',
        headline: '500 000 рублей в месяц. Без моих рук.',
        body:
          'Я занимаюсь теннисом, путешествую, провожу время с семьёй — а деньги идут потому что система работает. Это не мечта. Это конкретная архитектура: агентство на автопилоте, Коперник с подписчиками, Sofia запущена. Эту цель я достигну к концу 2027.',
        accent: 'green',
      },
      {
        id: 'gv-mid',
        label: 'СРЕДНИЙ УРОВЕНЬ · 2027–2028',
        headline: 'Миллион в месяц. BMW. Дом за 50 миллионов.',
        body:
          'Атрибуты успеха которые я заслужил. BMW — не понты. Это сигнал себе что кризис закончился и я в другой точке жизни. Дом — пространство для семьи и творчества. Exit в одном из SAAS-продуктов даёт капитал для следующего уровня.',
        accent: 'amber',
      },
      {
        id: 'gv-max',
        label: 'МАКСИМУМ · 2028 И ДАЛЬШЕ',
        headline: 'IP-вселенная. Фильмы и игры через ИИ. Большой exit.',
        body:
          'Это полярная звезда. Я не знаю точно как это выглядит — но я знаю что это то для чего я рождён. Раху во Льве в моей натальной карте говорит одно: влиять на умы в масштабе. IP-вселенная — это буквально воплощение этой кармической задачи.',
        accent: 'violet',
      },
    ],
  },
  goalsTab: {
    pageTitle: 'Цели',
    nearestSectionTitle: 'Ближайшие цели',
    nearestDeadlineLine: 'Китай и подушка · до 14 августа',
    sideSectionTitle: 'Доска желаний',
    boardNearSubheading: 'Ближайшие',
    boardHorizonSubheading: 'Горизонт',
    sideGoalSeeds: [
      { id: 'sg-bmw', title: 'BMW — 3 500 000 ₽', defaultTarget: 3_500_000 },
      { id: 'sg-subs', title: '1000 подписчиков', defaultTarget: 1000 },
      {
        id: 'sg-jul',
        title: 'Июль — отдых в глэмпинге или красивом отеле, 2 суток',
        defaultTarget: 1,
      },
      { id: 'sg-nov', title: 'Ноябрь — отдых в классном отеле', defaultTarget: 1 },
    ],
  },
  aboutMeNotes: {
    pageTitle: 'Важные заметки обо мне',
    sectionTitle: 'Как устроен Николай',
    tragic: {
      capsAboveCard: 'ДВА СЦЕНАРИЯ · ВЫБОР КАЖДЫЙ ДЕНЬ',
      cardTitle: 'Трагический сценарий · когда иду против карты',
      items: [
        {
          lead: 'Не могу ни отдыхать, ни работать с удовольствием.',
          body:
            'Сатурн требует результатов — Весы задыхаются без красоты и смысла. Итог: делаю через силу и ненавижу процесс.',
        },
        {
          lead: 'Строю-строю-обнуляю.',
          body:
            'Юпитер+Сатурн в 4м доме создают паттерн: строю с нуля, достигаю, разрушаю — и снова с нуля. Фундамент никогда не становится настоящим потому что я сам его рушу.',
        },
        {
          lead: 'Рождён влиять, но прячусь.',
          body:
            'Раху во Льве — кармическая задача быть заметным. Чем дольше прячусь — тем сильнее внутренняя пустота и ощущение что живу не своей жизнью.',
        },
        {
          lead: 'Транслирую «я всё могу» — не получаю настоящей близости.',
          body:
            'Венера Лев 8й дом создаёт образ непробиваемости. Люди восхищаются — но не знают настоящего меня. Одиночество в толпе.',
        },
        {
          lead: 'Я никто без результата.',
          body: 'Shame core активен. Самооценка падает в ноль если нет достижений — даже при объективном прогрессе.',
        },
      ],
    },
    healthy: {
      cardTitle: 'Здоровый сценарий · когда иду по карте',
      items: [
        {
          lead: 'Строю красиво.',
          body:
            'Весы + Сатурн = дисциплина с вкусом. Не выбирать между деньгами и смыслом — совмещать. Процесс приносит удовольствие, а не только результат.',
        },
        {
          lead: 'Добавляю этаж — не разрушаю фундамент.',
          body:
            'Когда хочется всё бросить — достраиваю текущее. TwinLabs → Коперник → Медийка → TwinTech. По порядку. Не одновременно.',
        },
        {
          lead: 'Выхожу из тени.',
          body:
            'Контент, личный бренд, публичность — это не маркетинг. Это буквально кармическая задача. Когда выхожу — пустота уходит, энергия прибывает.',
        },
        {
          lead: 'Позволяю себе быть увиденным настоящим.',
          body:
            'Уязвимость в контенте — «ИИ убил мой бизнес, вот что делаю» — это Лев в полную силу. Не слабость, а магнит.',
        },
        {
          lead: 'Я достоин хорошего прямо сейчас.',
          body: 'Не когда заработаю. Маленькие акты красоты и роскоши лечат Shame core лучше чем десять закрытых проектов.',
        },
      ],
    },
    patterns: {
      heading: 'АКТИВНЫЕ ПАТТЕРНЫ · КАК РАСПОЗНАТЬ И ОСТАНОВИТЬ',
      cards: [
        {
          id: 'pat-refocus',
          accent: 'violet',
          title: 'Расфокус-эйфория',
          description:
            'Новая идея → эйфория → бросаю текущее → перегруз → выгорание → новая идея. Средняя фаза любого проекта невыносима — именно тогда хочется начать что-то новое.',
          rule:
            'Стоп-слово: «Список потом». Каждая новая идея — записывается с датой «когда смотреть». Открывать только в последнее воскресенье месяца.',
        },
        {
          id: 'pat-hero',
          accent: 'coral',
          title: 'Выгорание героя',
          description:
            'Давит результат через сверхусилие — 12 часов, ночи, без отдыха. Потом срыв. Тело не выдерживает того что голова считает нормой. Цикл повторяется каждые 4–6 недель.',
          rule:
            'Правило: два блока по 90 минут — это дневной максимум глубокой работы. Не подвиг, а система. 3 часа качественно > 10 часов в хаосе.',
        },
        {
          id: 'pat-reset',
          accent: 'amber',
          title: 'Обнуление',
          description:
            'Само рушится в один момент — не как осознанное решение. Так Юпитер+Сатурн в 4м доме проявляется: строишь-строишь — и в какой-то момент всё валится. Происходит когда теряется смысл или появляется лучшая идея.',
          rule:
            'Антидот: «Добавлять этаж, не разрушать фундамент». Когда хочется обнулить — спросить: «Что я могу достроить здесь прежде чем уйти?»',
        },
        {
          id: 'pat-control',
          accent: 'slate',
          title: 'Контроль и перфекционизм',
          description:
            'Микроменеджмент команды — «если не я, будет плохо». Раздражение когда другие делают не так. Итог: команда не растёт, ты не делегируешь, застреваешь в операционке навсегда.',
          rule:
            'Правило: делегировать 70%-результат, не ждать 100%. Хороший дизайн сделанный другим > идеальный не сделанный никем.',
        },
        {
          id: 'pat-spend',
          accent: 'blue',
          title: 'Импульсивные траты',
          description:
            'Путешествия, покупки как регуляция эмоций и быстрый дофамин. Появляются в моменты стресса или скуки. Потом сожаление и финансовая дыра.',
          rule:
            'Правило 48 часов: любая незапланированная трата больше 10к — ждёт двое суток. Если через 48 часов всё ещё хочется — это не импульс.',
        },
      ],
    },
  },
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
