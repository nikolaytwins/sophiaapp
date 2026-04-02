# План деплоя Twinworks (Next.js 16 + Prisma + SQLite)

## 1. Анализ проекта

- **Стек:** Next.js 16, React 19, Prisma 7, SQLite (better-sqlite3).
- **Корень:** `/root/.openclaw/workspace/twinworks`.
- **Запуск:** `npm run build` → `npm run start`. Порт задаётся через `PORT=3001`.
- **БД:** SQLite. В коде используется `prisma/dev.db` (относительно корня проекта). Prisma также читает `DATABASE_URL` из env (`file:./prisma/dev.db`). Сервис обязан запускаться из папки проекта (`WorkingDirectory`), иначе Prisma и API не найдут базу.
- **Перед build:** `prisma generate` уже в `prebuild` в package.json.

## 2. Порты и прокси

- Приложение слушает **3001** (через `Environment=PORT=3001` в systemd).
- Nginx проксирует запросы с выбранного домена на `http://127.0.0.1:3001`.

## 3. Что сделать на сервере (один раз)

| Шаг | Действие |
|-----|----------|
| 1 | Перейти в проект |
| 2 | Установить зависимости: `npm ci` |
| 3 | Применить миграции: `npx prisma migrate deploy` |
| 4 | Собрать приложение: `npm run build` |
| 5 | Установить systemd-сервис и запустить |
| 6 | Настроить nginx (подставить свой домен) и перезагрузить |

## 4. Команды для выполнения

Выполнять на сервере, где лежит `/root/.openclaw/workspace/twinworks`.

```bash
# 1) Перейти в проект
cd /root/.openclaw/workspace/twinworks

# 2) Зависимости (если ещё не ставили)
npm ci

# 3) Миграции БД (создаст/обновит prisma/dev.db)
npx prisma migrate deploy

# 4) Сборка
npm run build

# 5) Установить systemd-сервис
sudo cp deploy/twinworks.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable twinworks.service
sudo systemctl start twinworks.service
sudo systemctl status twinworks.service

# 6) Nginx: скопировать конфиг, подставить свой server_name, включить
sudo cp deploy/nginx-twinworks.conf /etc/nginx/sites-available/twinworks
# Отредактировать server_name в /etc/nginx/sites-available/twinworks (например, IP или домен)
sudo ln -sf /etc/nginx/sites-available/twinworks /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 5. Проверка

- Локально (без nginx): `curl http://127.0.0.1:3001` или открыть в браузере.
- Через nginx: открыть `http://<твой-server_name>` (домен или IP из конфига).

## 6. Полезные команды после деплоя

```bash
# Логи сервиса
sudo journalctl -u twinworks.service -f

# Перезапуск после изменений кода (после build)
sudo systemctl restart twinworks.service
```

## 7. Если главный сайт (Twinworks) отдаёт 502 или HTTP 505

Часто **502** ошибочно воспринимают как «505». Обычные причины:

1. **Next.js слушал не тот адрес** — nginx ходит на `127.0.0.1:3001`, а процесс был только на IPv6. В проекте `npm run start` = `next start --hostname 127.0.0.1`; после обновления кода сделай `npm run build` и `sudo systemctl restart twinworks`.
2. **Сервис не запущен или падает** — `sudo systemctl status twinworks` и `journalctl -u twinworks -n 80 --no-pager`.
3. **БД без миграций** — `cd` в корень twinworks, `npx prisma migrate deploy`, снова `npm run build` и перезапуск сервиса.
4. **Nginx** — обнови фрагмент из `deploy/nginx-twinworks.conf` (в т.ч. `proxy_http_version 1.1` для `location = /api/auth/check`), затем `sudo nginx -t && sudo systemctl reload nginx`.
