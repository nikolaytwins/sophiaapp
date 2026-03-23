# After Dark / Private Module

## Information architecture

| Route | Screen | Role |
|-------|--------|------|
| `/(private)` | `PrivateOverviewScreen` | Hero score, day metrics, tonight / risks / relationship tone / social windows, nav to subsections |
| `/(private)/periods` | `PrivatePeriodsScreen` | Period selector (day → season), multi-line chart, highlight bands |
| `/(private)/relationships` | `PrivateRelationshipScreen` | Forecast, do/avoid, timeline markers |
| `/(private)/flirt` | `PrivateFlirtScreen` | Social windows, confidence, practical lines |
| `/(private)/chat` | `PrivateChatScreen` | Private Sofia thread, quick prompts |

**Entry:** Esoterica tab → «After Dark» card → `router.push('/(private)')`.

## Data layer

- **Types:** `src/entities/private/models.ts`
- **Contract:** `src/services/private/repository.types.ts` — `PrivateModuleRepository`
- **Данные:** только `remote-repository.ts` → `astro_api_server.py`. **Моков нет.** Ошибка API → `PrivateQueryError` + «Повторить».
- **Чат:** `private-chat-local.ts` (очередь + текст, что LLM не подключён), не астрологические моки.
- **Hooks:** `src/hooks/usePrivateModule.ts` (TanStack Query)

### Локальные реальные расчёты

Из каталога **`sophia-os`** (ожидается соседняя папка `../skills` в workspace):

```bash
pip install ephem   # один раз, в venv при желании
npm run astro-api   # слушает 0.0.0.0:8765
# другой терминал:
npm run web         # :8081
# или одной командой:
npm run dev:with-astro
```

В dev **`app.config.js`** задаёт `extra.astroApiUrl` и `EXPO_PUBLIC_*`. **В вебе** клиент сам подставляет `http://<тот же host что у страницы>:8765` (чтобы `localhost:8081` ходил на `localhost:8765`, а не на `127.0.0.1:8765` — иначе браузер часто даёт «Failed to fetch»).

**Если astro не запущен:** запросы падают → **экран ошибки** (не подмена моками). Подними процесс на `:8765`.

**Проверка API:** `curl -s http://127.0.0.1:8765/health`

Чат: локальная очередь; quick prompts — статический список кнопок UI.

См. `src/services/private/integration.stub.ts` для будущего единого backend.

## UX principles

- Copy and UI frame metrics as **probabilistic / navigational**, not fate.
- Playful fields (`chanceOfSex`, `chanceOfThreesome`) include `speculativeNote`, `isPlayfulEstimate`, and explicit low confidence in mocks and overview disclaimers.

## Privacy (future)

- `PrivatePrivacyPrefs` in models — Face ID / PIN / hidden notification previews. No full implementation in v1; add gate on `/(private)` when ready.

## Visual system

- Tokens: `src/theme/privateTokens.ts` (plum / burgundy / gold accent, separate from main app theme).
