# Sophia OS

Premium Expo / React Native app: day dashboard, plan, Sophia AI, habits, finance, esoterica. Stage 1: UI, mocks, integration-ready architecture.

## Run

```bash
cd sophia-os
npm install
npx expo start
```

**Web на Mac (`http://localhost:8081`):** `npm run web`

### Телефон через Expo Go (бесплатно, без Apple $99)

Главный гайд: **[docs/EXPO_GO.md](docs/EXPO_GO.md)** — Expo Go из App Store, на сервере `npm run start:lan` или локально `npx expo start`, либо `npm run start:tunnel`.  
Если Metro на VPS: фаервол **8081** — [docs/MOBILE_SETUP.md](docs/MOBILE_SETUP.md). Не грузится — [docs/MOBILE_TROUBLESHOOTING.md](docs/MOBILE_TROUBLESHOOTING.md), на сервере `npm run check:mobile`.

### After Dark — реальные транзиты (локально)

Нужен Python 3 + `pip install ephem` в `skills/astro-core/scripts` (см. [docs/PRIVATE_MODULE.md](docs/PRIVATE_MODULE.md)).

- **Два терминала:** `npm run astro-api` (порт **8765**) и `npm run web` (порт **8081**).
- **Один терминал:** `npm run dev:with-astro` (astro + web через `concurrently`).

В dev по умолчанию подставляется `EXPO_PUBLIC_ASTRO_API_URL=http://127.0.0.1:8765` (`app.config.js`). Браузер и API на одном Mac — CORS на astro-сервере уже открыт. Если astro не запущен, After Dark покажет **ошибку загрузки** (моков больше нет).

**Своя иконка, без Expo Go (TestFlight / store):** см. [docs/EAS_IOS.md](docs/EAS_IOS.md) — EAS Build, `npm run eas:ios:production`, затем submit в App Store Connect.

**Не хочу платить Apple $99:** см. [docs/IOS_FREE_PERSONAL.md](docs/IOS_FREE_PERSONAL.md) — веб + «На экран Домой», Android, честно про лимиты iOS.

## Stack

Expo Router, TypeScript, TanStack Query, Zustand, Reanimated, Gesture Handler, expo-blur, expo-linear-gradient, expo-haptics, react-native-svg.

## Structure

- `app/` — routes only: `(tabs)` + modal `create-event`
- `src/theme/` — design tokens; эталон UI ритма — **Привычки** и **День** ([docs/UI_HABITS.md](docs/UI_HABITS.md))
- `src/entities/` — domain types
- `src/services/repositories/` — interfaces + mock implementations (swap for REST/Supabase)
- `src/services/ai/` — `sophiaService` + types
- `src/services/integrations/` — calendar, health, sync stubs
- `src/features/` — screens by domain
- `src/navigation/CustomTabBar.tsx` — glass tab bar, Sophia center

## Wiring production

1. Replace mocks in `src/services/repositories/index.ts` with remote adapters.
2. AI: `sophiaService.setProvider(...)` in `src/services/ai/sophia.service.ts`.
3. Apple Calendar / Health: implement `integrations/calendar.ts` and `integrations/health.ts`.

## Scripts

- `npm run lint` — TypeScript check
- `npm run astro-api` — поднять astro API (`:8765`), из корня workspace рядом с `skills/`
- `npm run dev:with-astro` — astro + веб Expo (`CI=1`, без интерактивного запроса порта, если 8081 занят — см. `web:ci` / закрой старый Expo)
- `npm run clean:cache` — удалить `.expo`, `node_modules/.cache`, `web-build`, `dist` (освободить место / сбросить кэш Metro)
- Удалённый SSH / «виснет» / Selectel: [docs/EXPO_REMOTE_SSH.md](docs/EXPO_REMOTE_SSH.md)
