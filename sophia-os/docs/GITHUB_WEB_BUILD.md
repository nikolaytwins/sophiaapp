# Веб-сборка в GitHub Actions (без VPS)

**Не разработчик?** Пошагово простым языком: [ПОШАГОВО_GITHUB_ВЕБ_СБОРКА.md](./ПОШАГОВО_GITHUB_ВЕБ_СБОРКА.md)

---

В корне репозитория лежит workflow **`.github/workflows/expo-web.yml`**.

## Что делает

1. `npm ci` в каталоге `sophia-os`
2. `npm run build:web` → `expo export --platform web` → статика в **`dist/`**
3. Загружает **`dist`** как артефакт **`sophia-os-web-dist`**

Сборка идёт на **GitHub-hosted runner** (Ubuntu), не на твоём Selectel — OOM на VPS от этого не зависит.

## Как запустить

1. Репозиторий с этим workflow должен быть на **GitHub** (запушен).
2. **Actions** → workflow **Sophia OS — web export** → **Run workflow** (или пуш в `main`/`master` при изменениях в `sophia-os/**`).
3. После успеха: открой последний run → секция **Artifacts** → скачай **`sophia-os-web-dist`**, распакуй.
4. Содержимое `dist/` выкладывай на nginx / в object storage / на **app.twinlabs.ru** (корень сайта, `try_files` для SPA — см. отдельную инструкцию по nginx).

## Переменные окружения (`EXPO_PUBLIC_*`)

Если для сборки нужны секреты или URL API, в репозитории: **Settings → Secrets and variables → Actions** → добавь переменные и пропиши в workflow:

```yaml
- name: Export static web
  run: npm run build:web
  env:
    CI: true
    EXPO_PUBLIC_ASTRO_API_URL: ${{ secrets.EXPO_PUBLIC_ASTRO_API_URL }}
```

Без этого подставятся значения по умолчанию из `app.config.js` / `.env` (если закоммичены — не для секретов).

### Привычки (Twinworks API)

Чтобы веб-София ходила в базу привычек на том же домене, что и Next (Twinworks):

| Переменная | Описание |
|------------|----------|
| `EXPO_PUBLIC_SOPHIA_HABITS_API_BASE` | Origin без слэша, например `https://app.twinlabs.ru` — к нему дописываются пути `/api/sophia/habits/...`. |
| `EXPO_PUBLIC_SOPHIA_HABITS_BEARER_TOKEN` | Опционально: то же значение, что `TW_SITE_AUTH_TOKEN` на сервере Twinworks, если нет общей cookie-сессии (кросс-домен). **Попадает в клиентский бандл** — только для личного приложения. |

На стороне Twinworks: применить миграции Prisma (`habit_check_ins`, поле `icon`, затем миграция **`20260405120000_habit_meta_and_reflection`** — категории, счётчик, поле дневника), выставить при необходимости `SOPHIA_HABITS_CORS_ORIGIN=https://app.twinlabs.ru` если статика и API на разных origin. Выгрузка всех чекинов: `GET /api/sophia/habits/export` (тот же auth). Сохранение текста рефлексии: **`POST /api/sophia/habits/reflection`** с телом `{"dateKey":"YYYY-MM-DD","note":"..."}`.

**Аккуратно по нагрузке на VPS:** веб Sophia собирай в **GitHub Actions** (`build:web`), не на сервере. На Selectel достаточно `prisma migrate deploy`, при необходимости один раз `npx tsx scripts/sophia-habits-reset.ts` в каталоге `twinworks`, затем `systemctl restart twinworks` — без параллельного тяжёлого `next build`/`expo export` на той же машине.

Workflow **Deploy Sophia OS web** передаёт эти секреты в шаг `build:web`, если они заданы в GitHub Actions.

## Если репозиторий только `sophia-os` (без монорепо)

Перенеси файл в **`sophia-os/.github/workflows/expo-web.yml`**, убери префикс `sophia-os/` из путей (`working-directory: .`, `path: dist`, `cache-dependency-path: package-lock.json`).
