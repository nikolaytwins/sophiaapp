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
