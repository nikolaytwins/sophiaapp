# Деплой web (sophia-os) через GitHub Actions

Единственный источник истины для кода — **GitHub**. VPS отдаёт уже собранный **`dist`** из `/var/www/sophia-os/dist/` через nginx; сборка на сервере не выполняется.

## См. также

- Автодеплой: `.github/workflows/deploy-sophia-web.yml` (push в `sophia-os/**` → rsync на VPS).
- Только артефакт `dist` без деплоя (вручную): `.github/workflows/expo-web.yml` (`workflow_dispatch`).

---

## 1. План миграции на git-based workflow

1. **Главный репозиторий:** репозиторий на GitHub, куда входит каталог `sophia-os/` (монорепо workspace или отдельный репо — как у вас заведено).
2. **Зафиксировать состояние:** на VPS и на Mac сделать `git status`, сохранить важные незакоммиченные правки в патчи (`git diff > backup.patch`) или закоммитить в ветку `backup/vps-YYYYMMDD`.
3. **Синхронизация:** один раз выровнять историю: запушить актуальный код с той машины, где он полнее (например Mac), или наоборот — `git pull` на Mac после push с VPS, разрешив конфликты вручную.
4. **Избежать потери правок:** не удалять `sophia-os` на VPS до тех пор, пока не убедитесь, что все нужные коммиты есть на GitHub; при необходимости `git fetch` + сравнение веток.
5. **После миграции:** работать на Mac, пушить в `main`; деплой dist — только через Actions; **не редактировать боевой код на VPS** в Cursor, кроме экстренных согласованных случаев.

---

## 2. Файлы в репозитории

| Файл | Назначение |
|------|------------|
| `.github/workflows/deploy-sophia-web.yml` | Сборка + rsync на VPS |
| `sophia-os/docs/DEPLOY_WEB_GITHUB.md` | Эта инструкция |

---

## 3. GitHub Secrets

| Secret | Обязательно | Описание |
|--------|-------------|----------|
| `SERVER_HOST` | да | IP или hostname VPS (например `178.72.168.156`) |
| `SERVER_USER` | да | SSH-пользователь (часто `root`) |
| `SERVER_SSH_KEY` | да | Приватный ключ (полный PEM), **Deploy key** или **user key** с правом на запись в `/var/www/sophia-os/dist/` |
| `SERVER_PORT` | нет | SSH-порт; если не задан, используется **22** |
| `EXPO_PUBLIC_TEAMTRACKER_URL` | нет* | Прод: `https://tt.twinlabs.ru` (без `/pm-board`, если у Teamtracker `TEAM_TRACKER_ROOT_DOMAIN=1`). Нужен для дашборда «доход из TT». |
| `EXPO_PUBLIC_TEAMTRACKER_INTEGRATION_SECRET` | нет* | Тот же секрет, что **`TT_INTEGRATION_SECRET`** на сервере Teamtracker (≥16 символов). |

\*Если secrets не заданы, шаг сборки получит пустые строки — интеграция дохода с TT на вебе будет отключена, остальной Sophia работает.

**Веб-Sophia не в systemd:** на VPS только **nginx + файлы в `/var/www/sophia-os/dist/`**; `EXPO_PUBLIC_*` попадают в бандл **на GitHub при `npm run build:web`**, не из `/etc` на Selectel.

---

## 4. Первый деплой и проверка

1. В GitHub: **Settings → Secrets and variables → Actions** — добавить secrets.
2. **Settings → Secrets → Actions** — убедиться, что ключ не имеет лишних пробелов/переносов.
3. Убедиться, что на VPS каталог ` /var/www/sophia-os/dist/` существует и пользователь из `SERVER_USER` может писать в него.
4. Запустить workflow вручную: **Actions → Deploy Sophia OS web → Run workflow** или сделать push в `main` с изменением в `sophia-os/**`.
5. Проверить лог job (зелёный), затем в браузере: `https://app.twinlabs.ru/sophia/` (или ваш URL).
6. Опционально: `grep -r "import.meta" dist` локально после `npm run build:web` — не должно быть в entry.

---

## 5. Риски

- **SSH-доступ:** при компрометации `SERVER_SSH_KEY` возможна запись на сервер; используйте отдельный deploy key с минимальными правами.
- **Двойной CI:** один push может запустить и `expo-web.yml`, и `deploy-sophia-web.yml` — лишняя минута на раннере; отключите push в одном из workflow при необходимости.
- **rsync --delete:** удалит на сервере файлы в `dist`, которых нет в новой сборке — это ожидаемо.

---

## 6. После успешного деплоя

- Рабочая копия — **Mac**; **GitHub** — источник истины.
- На VPS **не открывать** `sophia-os` в Cursor для правок прод-кода; при необходимости только чтение, либо `git pull` для проверки.
- OpenClaw, systemd, `/root/.openclaw` — **не менять** этим деплоем.
