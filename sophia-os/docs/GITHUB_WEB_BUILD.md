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

## Если репозиторий только `sophia-os` (без монорепо)

Перенеси файл в **`sophia-os/.github/workflows/expo-web.yml`**, убери префикс `sophia-os/` из путей (`working-directory: .`, `path: dist`, `cache-dependency-path: package-lock.json`).
