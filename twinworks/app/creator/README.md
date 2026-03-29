# Creator Analytics Dashboard

Дэшборд аналитики контента YouTube и Instagram Reels. Сейчас работает на mock data.

## Подключение реальных данных

1. **YouTube Analytics API**  
   В `lib/creator-adapters.ts`: реализовать `fetchContentList()` — запрос к YouTube Data API v3 + Analytics API, преобразование ответа через `transformYouTubeAnalyticsToContent()`. Тип контента: `types/creator.ts` → `ContentItem`.

2. **Instagram Graph API**  
   В том же файле: добавить запрос к Instagram Insights (Reels), преобразование через `transformInstagramInsightsToContent()`.

3. **База данных (PostgreSQL)**  
   Завести таблицы под `ContentItem` и `ExperimentHypothesis`. В `creator-adapters.ts` заменить вызовы `getContentList()` / `getContentById()` на запросы к БД (или API routes типа `app/api/creator/content/route.ts`).

4. **AI / OpenClaw инсайты**  
   В `lib/creator-adapters.ts`: реализовать `fetchWeeklyInsightsFromAI()` — вызов агента/сервиса, возврат массива `{ title, items }[]` для блока Weekly Insights. На главной и на странице Insights подставлять этот результат вместо `getWeeklyInsights()`.

## Структура

- `types/creator.ts` — типы контента, фильтров, экспериментов.
- `data/mock-content.ts`, `data/mock-experiments.ts` — моковые данные.
- `lib/creator-stats.ts` — агрегации (getOverviewStats, getTopContent, getViewsChartData и т.д.).
- `lib/creator-adapters.ts` — слой для будущих API/DB.
- `components/creator/` — переиспользуемые UI-компоненты.
- Страницы: `app/creator/page.tsx` (dashboard), `app/creator/content/`, `app/creator/insights/`, `app/creator/experiments/`, `app/creator/settings/`.

## Навигация

В главном меню приложения (Navigation) добавлена кнопка «Контент» → `/creator`. Внутри раздела — боковое меню: Dashboard, Content, Insights, Experiments, Settings.
