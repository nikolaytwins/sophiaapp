/**
 * Контент экрана «Стратегия» — меняй здесь тексты и списки без правки вёрстки.
 * У каждого чекпоинта стабильный `id` (для сохранения галочек в AsyncStorage).
 */

import { EXTRA_STRATEGY_MONTHLY_PLANS } from '@/features/strategy/data/monthlyPlansExtra';
import { newStrategyProjectsTab } from '@/features/strategy/data/newStrategyProjectsContent';

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

export type {
  StrategyMonthlyPlanTagVariant,
  StrategyMonthlyPlanCardAccent,
  StrategyMonthlyPlanCardDef,
  StrategyMonthlyPlanDef,
} from '@/features/strategy/strategyMonthlyPlanTypes';

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

export const STRATEGY_MAIN_TABS = ['strategy', 'vision', 'notes', 'newStrategy'] as const;
export type StrategyMainTabId = (typeof STRATEGY_MAIN_TABS)[number];

export type StrategyTabsLabelsDef = {
  strategy: string;
  vision: string;
  notes: string;
  newStrategy: string;
};

/** Фрагмент абзаца с акцентом (как strong/em в исходном HTML). */
export type StrategyRichTextPart = {
  text: string;
  variant?: 'default' | 'strong' | 'emphasis';
};

export type StrategyRichParagraph = StrategyRichTextPart[];

export type StrategySynastryMoneyPatternItem = {
  title: string;
  description: string;
};

export type StrategySynastryMoneyCardAccent = 'twilight' | 'mist' | 'aurora';

export type StrategySynastryMoneyCard = {
  id: string;
  accent: StrategySynastryMoneyCardAccent;
  overline: string;
  title?: string;
  paragraphs?: StrategyRichParagraph[];
  patterns?: StrategySynastryMoneyPatternItem[];
};

export type StrategyNewSynastryMoneyTabDef = {
  innerTabLabel: string;
  screenTitle: string;
  screenSubtitle: string;
  cards: StrategySynastryMoneyCard[];
};

export type StrategyProjectsChannelBadge = 'free' | 'paid' | 'partner' | 'primary';

export type StrategyProjectsChannelItem = {
  icon: string;
  badge: StrategyProjectsChannelBadge;
  badgeLabel: string;
  name: string;
  typeLine: string;
  body: StrategyRichParagraph;
};

export type StrategyProjectsChannelGroup = {
  sectionCaps: string;
  items: StrategyProjectsChannelItem[];
};

export type StrategyProjectsChannelsDef = {
  sectionTitle: string;
  sectionSubtitle: string;
  leadBlock: { overline: string; body: StrategyRichParagraph };
  groups: StrategyProjectsChannelGroup[];
};

export type StrategyProjectsValuationGridCell = { value: string; label: string };

export type StrategyProjectsValuationProductAccent = 'twilight' | 'ocean' | 'aurora' | 'amber' | 'mist';

export type StrategyProjectsValuationProduct = {
  id: string;
  accent: StrategyProjectsValuationProductAccent;
  overline: string;
  title: string;
  grid: StrategyProjectsValuationGridCell[];
  footnote: StrategyRichParagraph;
};

export type StrategyProjectsValuationDef = {
  sectionTitle: string;
  sectionSubtitle: string;
  methodology: {
    overline: string;
    paragraphs: StrategyRichParagraph[];
  };
  products: StrategyProjectsValuationProduct[];
  packageBlock: {
    overline: string;
    title: string;
    paragraphs: StrategyRichParagraph[];
  };
  closingNote: StrategyRichParagraph;
};

export type StrategyProjectsGeoRow = {
  lead: string;
  body: StrategyRichParagraph;
};

export type StrategyProjectsGeoProduct = {
  sectionCaps: string;
  rows: StrategyProjectsGeoRow[];
};

export type StrategyProjectsGeoDef = {
  sectionTitle: string;
  sectionSubtitle: string;
  ruleBlock: {
    overline: string;
    title: string;
    body: StrategyRichParagraph;
  };
  products: StrategyProjectsGeoProduct[];
  closingNote: StrategyRichParagraph;
};

export type StrategyNewSynastryProjectsDef = {
  innerTabLabel: string;
  channels: StrategyProjectsChannelsDef;
  valuation: StrategyProjectsValuationDef;
  geo: StrategyProjectsGeoDef;
};

/** Контент вкладки «Новая стратегия» (астро + рынки/проекты из HTML). */
export type StrategyNewSynastryDef = {
  money: StrategyNewSynastryMoneyTabDef;
  projects: StrategyNewSynastryProjectsDef;
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
  /** Вкладка целей с датой в текущем календарном годе. */
  boardYearSubheading: string;
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

/** Напутствия и жёсткие рамки над дорожной картой (вкладка «Стратегия»). */
export type StrategyReminderSectionDef = {
  title: string;
  bullets: string[];
};

export type StrategyRemindersDef = {
  sections: StrategyReminderSectionDef[];
};

export type StrategyPageConfig = {
  meta: {
    title: string;
    subtitle: string;
    /** Подзаголовок с датой последнего обновления контента */
    lastContentUpdate: string;
    headerBadge: string;
  };
  /** Фокус по месяцам: табы + карточки (тексты правятся здесь). */
  monthlyPlans: import('@/features/strategy/strategyMonthlyPlanTypes').StrategyMonthlyPlanDef[];
  /** Напутствия на год и долгие горизонты — блок над фокусом по месяцам. */
  strategyReminders: StrategyRemindersDef;
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
  newStrategySynastry: StrategyNewSynastryDef;
};

/** Алиас для импорта: один объект данных страницы. */
export const strategyData: StrategyPageConfig = {
  meta: {
    title: 'Стратегия · TwinTech',
    subtitle: 'Дорожная карта и чекпоинты',
    lastContentUpdate: 'Последнее обновление контента: 23 апреля 2026',
    headerBadge: 'Апрель 2026',
  },
  strategyReminders: {
    sections: [
      {
        title: 'Важное напутствие на 2026 год',
        bullets: ['Не переезжать в Москву', 'Не думать об офисе пока что (цель на 2027 год)'],
      },
      {
        title: 'Важно в целом',
        bullets: ['Думать о детях в декабре 2031 года, не раньше'],
      },
    ],
  },
  monthlyPlans: [
    {
      id: '2026-05',
      tabLabel: 'Май 2026',
      monthTitle: 'Май 2026',
      monthTagline: 'Выйти из болезни, запустить движение',
      cards: [
        {
          id: 'mp-2026-05-01',
          emoji: '💼',
          title: 'Закрыть проект 300к и получить деньги',
          description: 'Финальная сдача, акт, оплата. Главный приоритет месяца — это хлеб.',
          tag: { label: '1-15 мая', variant: 'sky' },
          accent: 'slate',
        },
        {
          id: 'mp-2026-05-02',
          emoji: '🤖',
          title: 'Разработать MVP Хайпмена',
          description:
            'Минимально рабочий инструмент для генерации рилсов Коперника. Вайбкодинг — быстро. Цель: работает настолько чтобы снимать рилсы каждый день.',
          tag: { label: '1-20 мая', variant: 'violet' },
          accent: 'violet',
        },
        {
          id: 'mp-2026-05-03',
          emoji: '🎬',
          title: '30 тестовых рилсов для Коперника + первые PDF-продажи',
          description:
            'Через Хайпмен. Параллельно предложить 3-5 людям PDF-расшифровку за 2990₽. Цель: 3-5 оплат — значит рынок есть. Рилс «ИИ заменил мой бизнес» — сегодня.',
          tag: { label: 'с 4 мая', variant: 'sky' },
          accent: 'blue',
        },
        {
          id: 'mp-2026-05-04',
          emoji: '👤',
          title: 'Нанять дизайнера 0.5 ставки',
          description:
            'Написать кандидатам на этой неделе. Без дизайнера не выйти из операционки — это разблокирует всё остальное.',
          tag: { label: 'до 25 мая', variant: 'sky' },
          accent: 'slate',
        },
        {
          id: 'mp-2026-05-05',
          emoji: '📊',
          title: 'Запустить трафик дизайнера 150-200$ — прямо сейчас',
          description:
            'Или сейчас или никогда — предложение актуально только пока. Нужна хоть минимальная страница. Сделать заглушку за 1 день и запустить.',
          tag: { label: 'эта неделя', variant: 'orange' },
          footerItalic: 'Марс трин Марсу 4 мая — физическая энергия, хорошее время стартовать',
          accent: 'orange',
        },
        {
          id: 'mp-2026-05-06',
          emoji: '📚',
          title: 'Курс дизайна — закрыть 2-3 модуля',
          description: 'Не каждый день, а 3 раза в неделю по 45 мин. 2-3 модуля к концу мая — реально.',
          tag: { label: '3 раза в нед', variant: 'sky' },
          accent: 'slate',
        },
        {
          id: 'mp-2026-05-07',
          emoji: '🔮',
          title: 'Неочевидное: Сатурн трин Раху 8 мая — написать манифест публично',
          description:
            'Дисциплина прямо ведёт к предназначению. Написать пост или сторис: «Строю TwinTech — вот зачем». Не ради охватов — ради закрепления намерения в публичном пространстве.',
          tag: { label: '8 мая', variant: 'pink' },
          footerItalic:
            'Астро-инсайт: Сатурн трин Раху случается редко — слова сказанные вслух в этот день имеют вес',
          accent: 'pink',
        },
      ],
    },
    {
      id: '2026-06',
      tabLabel: 'Июнь 2026',
      monthTitle: 'Июнь 2026',
      monthTagline: 'Деньги, контент, сайт, курс',
      cards: [
        {
          id: 'mp-2026-06-01',
          emoji: '💰',
          title: 'Переговоры и сделки — 7 июня',
          description:
            'Юпитер трин 2му дому — лучший день месяца для денег. Встреча с клиентом, закрытие договора, запрос оплаты у постоянников. Поставить в календарь.',
          tag: { label: '7 июня', variant: 'amber' },
          accent: 'amber',
        },
        {
          id: 'mp-2026-06-02',
          emoji: '🌐',
          title: 'Полный сайт TwinLabs',
          description:
            'С кейсом 300к, портфолио, формой. Дизайнер + вайбкодинг = неделя. Нужен для тендеров и корпоратов.',
          tag: { label: '1-10 июня', variant: 'sky' },
          accent: 'blue',
        },
        {
          id: 'mp-2026-06-03',
          emoji: '🚀',
          title: 'Запустить Коперник как приложение с подпиской',
          description:
            'Если к концу мая есть 5+ PDF-оплат — строить сервис. Подписка 990₽/мес. Июнь — разработка и запуск v1.0. Венера соединение Раху 22 июня — идеальный день для публичного анонса.\n\n22 июня: Венера соединение Раху — анонс Коперника в публичном пространстве будет работать особенно сильно',
          tag: { label: 'к 22 июня', variant: 'violet' },
          accent: 'violet',
        },
        {
          id: 'mp-2026-06-04',
          emoji: '📱',
          title: 'Контент 3+ рилса в неделю через Хайпмен',
          description:
            '3 рилса в неделю = 12 в месяц. За 3 месяца это 36 единиц контента. При правильных темах и вирусных механиках — достаточно для первых 500 подписчиков. Меньше не имеет смысла.',
          tag: { label: 'каждую неделю', variant: 'slate' },
          accent: 'slate',
        },
        {
          id: 'mp-2026-06-05',
          emoji: '📚',
          title: 'Курс дизайна — закрыть ещё 2-3 модуля',
          description: 'К концу июня должны быть закрыты 4-5 модулей. Финиш — 25 мая или конец июня.',
          tag: { label: '3 раза в нед', variant: 'emerald' },
          accent: 'emerald',
        },
        {
          id: 'mp-2026-06-06',
          emoji: '📋',
          title: 'Зарегистрироваться на тендерных платформах',
          description:
            'Один день — регистрация и заполнение кейсов. Потом откликаться 2-3 в неделю фоном. Длинный цикл, но первый контракт может прийти в октябре.',
          tag: { label: 'середина июня', variant: 'amber' },
          accent: 'amber',
        },
        {
          id: 'mp-2026-06-07',
          emoji: '🔮',
          title: 'Неочевидное: Венера соединение Луна 20 июня — неожиданная деловая связь',
          description:
            'Солнце соединение Луны натальной в этот день — интуиция и коммуникации на пике. Написать кому-то важному кому давно хотел но откладывал. Партнёрство, коллаборация, нетворкинг.',
          tag: { label: '20 июня', variant: 'pink' },
          accent: 'pink',
        },
      ],
    },
    {
      id: '2026-07',
      tabLabel: 'Июль 2026',
      monthTitle: 'Июль 2026',
      monthTitleBadge: { label: 'Пик желаний' },
      monthTagline: 'Пиковые желания, публичность, Китай бронировать',
      cards: [
        {
          id: 'mp-2026-07-01',
          emoji: '🔥',
          title: '6 июля — разговор с Лерой ИЛИ выйти знакомиться',
          description:
            'Венера соединение натальной Венеры. Два пути: если чувствуешь что с Лерой есть тепло — говорить. Не про тройнички прямо, а «что нам обоим нужно в близости». Козерог Солнце Леры будет сопротивляться — дай ей время, не жди ответа в тот же день. Если тепла нет — этот день хорош для знакомства. Тусовка, бар, где красивые люди — поток сам приведёт.',
          tag: { label: '6-10 июля', variant: 'rose' },
          footerItalic:
            'Лера: Козерог Солнце + Сатурн в Льве = она сама предложила тему, но потом испугалась. Разговор возможен если без давления',
          accent: 'pink',
        },
        {
          id: 'mp-2026-07-02',
          emoji: '🎯',
          title: 'Подготовить публичный запуск Хайпмена к августу',
          description:
            'Хайпмен как отдельный публичный продукт — анонс 14 августа под Юпитер на Раху. Июль — доделать, упаковать, написать посадочную страницу.',
          tag: { label: 'весь июль', variant: 'violet' },
          accent: 'violet',
        },
        {
          id: 'mp-2026-07-03',
          emoji: '✈️',
          title: 'Бронировать Китай — 10-20 августа',
          description:
            'Билеты покупать сейчас. Шанхай или Пекин. Юпитер на Раху 14 августа — будешь там в пике судьбоносной энергии.',
          tag: { label: 'купить в июле', variant: 'emerald' },
          accent: 'emerald',
        },
        {
          id: 'mp-2026-07-04',
          emoji: '💸',
          title: 'Искать 2й крупный клиент в агентство',
          description:
            'Марс трин Солнцу 10 июля — уверенность и сила для переговоров. Написать корпоратам с предложением дизайн-отдела на аутсорсе. 5-10 писем.',
          tag: { label: '10 июля', variant: 'sky' },
          accent: 'amber',
        },
        {
          id: 'mp-2026-07-05',
          emoji: '🔮',
          title: 'Неочевидное: 26 июля — Марс оппозиция Марсу, не принимать финансовых решений',
          description:
            'Конфликт воли и обстоятельств. В этот день легко сделать импульсивную трату или принять решение о деньгах из злости/усталости. Отложить крупные решения на 3 дня.',
          tag: { label: '26 июля — стоп', variant: 'pink' },
          accent: 'pink',
        },
      ],
    },
    {
      id: '2026-08',
      tabLabel: 'Август 2026',
      monthTitle: 'Август 2026',
      monthTitleBadge: { label: 'Раху пик', starCount: 2 },
      monthTagline: 'Публичность, Китай, Хайпмен в эфире',
      cards: [
        {
          id: 'mp-2026-08-01',
          emoji: '🚀',
          title: '14 августа — анонс Хайпмена публично',
          description:
            'Юпитер соединение Раху — раз в 12 лет. Конкретно: публичный запуск Хайпмена как инструмента для создателей контента. Пост, рилс, YouTube-ролик «как я автоматизировал создание рилсов». Это точный продукт под точную дату.',
          tag: { label: '14 августа', variant: 'violet' },
          footerItalic:
            'Это не просто «выйти публично» — это конкретный продукт в конкретный астрологический пик',
          accent: 'violet',
        },
        {
          id: 'mp-2026-08-02',
          emoji: '🇨🇳',
          title: 'Китай — 10–20 августа',
          description:
            'Шанхай или Пекин. Не туристическая — деловая. Встретить кого-то из ИИ/tech сообщества. Попасть на ивент. Снять контент для YouTube и Коперника на фоне Китая.',
          tag: { label: '10–20 августа', variant: 'emerald' },
          accent: 'emerald',
        },
        {
          id: 'mp-2026-08-03',
          emoji: '✨',
          title: '18 августа — Солнце соединение Венеры, довериться потоку',
          description:
            'В Китае или после возвращения. Ты в пике привлекательности. Не планировать заранее — просто быть открытым. Если появится интересный человек рядом — это не случайно.',
          tag: { label: '18–20 августа', variant: 'rose' },
          accent: 'pink',
        },
        {
          id: 'mp-2026-08-04',
          emoji: '💰',
          title: '5 августа — открыть переговоры по крупному клиенту',
          description:
            'Юпитер секстиль Солнцу — возможности приходят сами. Принять входящие запросы которые могли прийти после июльской активности в медийке.',
          tag: { label: '5 августа', variant: 'amber' },
          accent: 'amber',
        },
        {
          id: 'mp-2026-08-05',
          emoji: '🔮',
          title: 'Неочевидное: в Китае 14 августа — найти астролога или нумеролога',
          description:
            'Юпитер на Раху в день пребывания в Китае. В китайской культуре глубокая традиция предсказания судьбы. Найти местного мастера БаЦзы или И Цзин — это не туристика, это резонанс с энергией дня. Может дать неожиданный инсайт.',
          tag: { label: '14 августа', variant: 'pink' },
          accent: 'pink',
        },
      ],
    },
    {
      id: '2026-09',
      tabLabel: 'Сентябрь 2026',
      monthTitle: 'Сентябрь',
      monthYear: '2026',
      monthTagline: 'Горы + главный рабочий день года',
      cards: [
        {
          id: 'mp-2026-09-01',
          emoji: '🏔️',
          title: 'Горы одному — Домбай или Архыз',
          description:
            '4–5 дней. После августовского пика тело просит тишины. Середина сентября — самый тихий период между пиками. Без ноутбука, только телефон для фото.',
          tag: { label: '10–16 сентября', variant: 'emerald' },
          accent: 'emerald',
        },
        {
          id: 'mp-2026-09-02',
          emoji: '⚡',
          title: '27 сентября — Юпитер трин Марсу: закрыть главную сделку',
          description:
            'Лучший день для активных действий в 2026. Конкретно: закрыть переговоры с корпоративным клиентом, или подписать партнёрство по Копернику, или запустить что-то что откладывал. Поставить встречу заранее.',
          tag: { label: '27 сентября', variant: 'sky' },
          accent: 'amber',
        },
        {
          id: 'mp-2026-09-03',
          emoji: '📹',
          title: 'YouTube-ролик про Китай — пока свежо',
          description:
            '«Я поехал в Китай строить корпорацию с нуля». Контент из поездки монтировать сразу по возвращении.',
          tag: { label: '1-7 сентября', variant: 'violet' },
          accent: 'violet',
        },
        {
          id: 'mp-2026-09-04',
          emoji: '🔮',
          title: 'Неочевидное: 5 сентября — Марс секстиль Сатурн, зафиксировать систему',
          description:
            'Лучший день для структурирования: написать SOP (стандартные процедуры) для агентства, настроить Тим Трекер, описать процессы для дизайнера. Скучно но важно — именно в этот день делается легко.',
          tag: { label: '5 сентября', variant: 'pink' },
          accent: 'pink',
        },
        {
          id: 'mp-2026-09-05',
          emoji: '🚴',
          title: 'Купить велосипед',
          description:
            'Закрепить лето движением: выбрать формат (шоссе, город, MTB), прокатиться, оформить покупку. К октябрю уже кататься регулярно.',
          tag: { label: 'сентябрь 2026', variant: 'emerald' },
          accent: 'emerald',
        },
        {
          id: 'mp-2026-09-06',
          emoji: '✒️',
          title: '27 сентября — набить татуировку',
          description:
            'Отдельный якорь дня рядом с рабочим пиком: если по транзитам день на переговоры — тату можно смести на выходные до/после 27-го, но слот забронировать заранее.',
          tag: { label: '27 сентября', variant: 'rose' },
          accent: 'pink',
        },
      ],
    },
    {
      id: '2026-10',
      tabLabel: 'Октябрь 2026',
      monthTitle: 'Октябрь 2026 🎂',
      monthTagline: '27 лет — праздновать правильно',
      cards: [
        {
          id: 'mp-2026-10-01',
          emoji: '🎂',
          title: '1–4 октября — поездка на день рождения',
          description:
            'Солнце на натальном Солнце — личный новый год. Солнце секстиль Раху 3 октября — судьба открыта. Не вечеринка в Ростове — уехать на 3–4 дня. Москва или Питер: хороший ресторан, красивый отель, что-то что давно хотел но откладывал. С людьми которые видят тебя настоящим.',
          tag: { label: '1–4 октября', variant: 'slate' },
          footerItalic: 'Соляр 2026: Солнце секстиль Раху — год публичности начинается с дня рождения',
          accent: 'slate',
        },
        {
          id: 'mp-2026-10-02',
          emoji: '🦁',
          title: '15 октября — запустить Sofiю публично',
          description:
            'Марс соединение Раху — публичный импульс и смелость. Если к октябрю аудитория 500+ — запустить Sofiю. Анонс в контенте: «Я сделал личного ИИ-ассистента для роста — теперь он доступен вам».',
          tag: { label: '15 октября', variant: 'sky' },
          accent: 'blue',
        },
        {
          id: 'mp-2026-10-03',
          emoji: '🏠',
          title: 'Начать смотреть недвижимость — просто изучать рынок',
          description:
            'Не покупать — понять цены, районы, форматы. К декабрю 2027 нужно знать что хочешь. Начать сейчас чтобы не спешить потом.',
          tag: { label: 'октябрь', variant: 'amber' },
          accent: 'amber',
        },
        {
          id: 'mp-2026-10-04',
          emoji: '🔮',
          title: 'Неочевидное: 22 октября — Сатурн трин Раху, написать долгосрочный манифест',
          description:
            'Второй раз за год когда дисциплина прямо ведёт к предназначению. В день рождения поставил цели — 22 октября зафиксировать план как их достичь. Письмо себе на год вперёд.',
          tag: { label: '22 октября', variant: 'pink' },
          accent: 'pink',
        },
        {
          id: 'mp-2026-10-05',
          emoji: '🦷',
          title: 'Заняться лечением зубов',
          description:
            'Плановый курс: диагностика, гигиена, лечение по списку. Разнести по неделям вокруг поездок и запусков — не откладывать «после нервного месяца», иначе снова уедет в долгий ящик.',
          tag: { label: 'октябрь 2026', variant: 'teal' },
          accent: 'teal',
        },
      ],
    },
    {
      id: '2026-11',
      tabLabel: 'Ноябрь 2026',
      monthTitle: 'Ноябрь 2026',
      monthTitleBadge: { label: 'Пик близости', starCount: 2 },
      monthTagline: 'Главная дата по сексуальности',
      cards: [
        {
          id: 'mp-2026-11-01',
          emoji: '🔥',
          title: '9–10 ноября — выйти знакомиться или особый вечер с Лерой',
          description:
            'Юпитер трин Асценденту — ты максимально привлекателен и харизматичен. Если с Лерой нет — это лучшее время познакомиться с кем-то новым. Красивое место, хорошая одежда, довериться потоку. Если с Лерой — организовать что-то особенное: ужин, отель, новый опыт вместе.',
          tag: { label: '9–10 ноября', variant: 'pink' },
          accent: 'pink',
        },
        {
          id: 'mp-2026-11-02',
          emoji: '⭐',
          title: '15–16 ноября — трансформирующий опыт',
          description:
            'Юпитер + Марс соединение натальной Венеры. Главная дата по сексуальности за весь период. Готовить заранее — не импульсивно в день. Конкретно: если с Лерой договорились в июле — реализовать. Если нет — другой глубокий опыт. Открытость к тому что придёт само.',
          tag: { label: '15–16 ноября', variant: 'pink' },
          footerItalic: 'Два тела одновременно на Венере в 8м доме — редкость. Следующий раз нескоро',
          accent: 'pink',
        },
        {
          id: 'mp-2026-11-03',
          emoji: '🚗',
          title: 'Открыть счёт «BMW» — первые 300к',
          description:
            'Юпитер соединение Венеры 15 ноября — день роскоши. Открыть отдельный счёт и положить первую сумму. Символически закрепляет намерение.',
          tag: { label: '15 ноября', variant: 'amber' },
          accent: 'amber',
        },
        {
          id: 'mp-2026-11-04',
          emoji: '💪',
          title: '1–10 ноября — спорт на максимум',
          description:
            'Марс трин натальному Марсу 1 ноября. Лучшее время для физических нагрузок за осень. Теннис или зал каждый день кто хочет.',
          tag: { label: '1-10 ноября', variant: 'teal' },
          accent: 'teal',
        },
      ],
    },
    ...EXTRA_STRATEGY_MONTHLY_PLANS,
  ],
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
    newStrategy: 'Новая стратегия',
  },
  newStrategySynastry: {
    money: {
      innerTabLabel: 'Деньги · 2й/8й',
      screenTitle: 'Деньги · психология',
      screenSubtitle: '2й дом Рыбы · 8й дом Дева · почему деньги утекают',
      cards: [
        {
          id: 'money-water',
          accent: 'twilight',
          overline: '2й дом Рыбы · управитель Нептун в 1м доме',
          title: 'Деньги как вода — приходят и уходят',
          paragraphs: [
            [
              { text: '2й дом = личные финансы, ценности. Рыбы в 2м = ' },
              { text: 'размытые границы с деньгами.', variant: 'strong' },
              { text: ' Нептун управляет — растворяет всё к чему прикасается.' },
            ],
            [
              {
                text: 'Импульсивные траты в стрессе — это Нептун: реальность размывается, граница «могу/не могу» исчезает. Рестораны, компы, что-то ещё — Нептун ищет удовольствие и растворение прямо сейчас.',
              },
            ],
            [
              { text: 'Нептун в 1м доме', variant: 'strong' },
              { text: ' — управитель 2го живёт в доме личности. ' },
              { text: 'Твоя идентичность и деньги перемешаны.', variant: 'emphasis' },
              { text: ' Когда денег нет — ощущение что и тебя нет.' },
            ],
          ],
        },
        {
          id: 'money-patterns',
          accent: 'mist',
          overline: 'Конкретные паттерны',
          patterns: [
            {
              title: 'Трата в стрессе как анестезия',
              description:
                'Нептун = побег от реальности. Когда тревожно — Рыбы в 2м дают разрешение потратить «просто чтобы почувствовать себя лучше». Это не слабость — это конфигурация карты.',
            },
            {
              title: 'Плохо чувствуешь деньги в руках',
              description:
                'Рыбы — знак без границ. Трудно точно знать сколько есть, сколько уходит. Финансовый учёт даётся с усилием — он против природы 2го дома.',
            },
            {
              title: 'Деньги приходят через интуицию и красоту',
              description:
                'Рыбы чувствуют что будет работать ещё до анализа. Лучшие финансовые решения — интуитивные, не рациональные.',
            },
          ],
        },
        {
          id: 'money-actions',
          accent: 'aurora',
          overline: 'Что делать',
          paragraphs: [
            [
              {
                text: 'Не бороться с природой 2го дома — создать структуру которая работает вместо воли.',
                variant: 'strong',
              },
            ],
            [
              {
                text: 'Один стоп-лимит на карте (решить один раз, не думать каждый день). Разделить деньги физически: операционный счёт + подушка + цели. Когда деньги разделены — Рыбы не могут их «растворить» в кучу.',
              },
            ],
            [
              {
                text: 'Самый важный инсайт: ты не «плохо управляешь деньгами». У тебя Нептун управляет 2м домом. Это требует системы — не дисциплины.',
                variant: 'emphasis',
              },
            ],
          ],
        },
      ],
    },
    projects: newStrategyProjectsTab,
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
    boardYearSubheading: 'На этот год',
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
