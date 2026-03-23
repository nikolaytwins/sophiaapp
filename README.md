# Sophia OS

Expo / React Native app: экран «Финал», день, план. Моки репозиториев, архитектура под замену на REST / Supabase.

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

**Своя иконка, без Expo Go (TestFlight / store):** см. [docs/EAS_IOS.md](docs/EAS_IOS.md) — EAS Build, `npm run eas:ios:production`, затем submit в App Store Connect.

**Не хочу платить Apple $99:** см. [docs/IOS_FREE_PERSONAL.md](docs/IOS_FREE_PERSONAL.md) — веб + «На экран Домой», Android, честно про лимиты iOS.

## Stack

Expo Router, TypeScript, TanStack Query, Zustand, Reanimated, Gesture Handler, expo-blur, expo-linear-gradient, expo-haptics, react-native-svg.

## Structure

- `app/` — routes only: `(tabs)` + modal `create-event`
- `src/theme/` — design tokens
- `src/entities/` — domain types
- `src/services/repositories/` — interfaces + mock implementations (swap for REST/Supabase)
- `src/services/integrations/` — calendar, health, sync stubs
- `src/features/` — screens by domain
- `src/navigation/CustomTabBar.tsx` — glass tab bar

## Wiring production

1. Replace mocks in `src/services/repositories/index.ts` with remote adapters.
2. Apple Calendar / Health: implement `integrations/calendar.ts` and `integrations/health.ts`.

## Scripts

- `npm run lint` — TypeScript check
- `npm run clean:cache` — удалить `.expo`, `node_modules/.cache`, `web-build`, `dist` (освободить место / сбросить кэш Metro)
- Удалённый SSH / «виснет» / Selectel: [docs/EXPO_REMOTE_SSH.md](docs/EXPO_REMOTE_SSH.md)
