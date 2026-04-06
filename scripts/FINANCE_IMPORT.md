# Импорт финансов Twinworks → Supabase (Sophia)

Кратко: **миграция в Supabase** → **узнать свой UUID** → **запустить скрипт** (только чтение SQLite).

---

## План «с нуля» (делай по порядку, не перескакивай)

**Шаг A — таблицы в облаке**  
Открой сайт Supabase → свой проект → слева **SQL Editor** → вставь весь текст из файла `supabase/migrations/009_finance.sql` из папки Sophia → кнопка **Run**. Должно закончиться без красной ошибки.

**Шаг B — твой UUID (это и есть «шаг 2», который смущает)**  
1. В том же проекте Supabase смотри **левое меню** (вертикальная полоска иконок слева).  
2. Найди значок **людей / замок** или надпись **Authentication** — нажми.  
3. Внутри сверху вкладка **Users** (Пользователи).  
4. Там таблица: email, дата и т.д. В одной из колонок будет длинный идентификатор **UUID** (или нажми на строку пользователя — UUID часто показывают в деталях).  
5. Скопируй этот UUID **целиком** (с дефисами). Это «кто владелец денег» в Софии — тот же аккаунт, под которым логинишься в приложение.  
6. Вставь куда-нибудь в заметку: понадобится в шаге D.

**Шаг C — секретный ключ**  
1. Слева внизу **шестерёнка** → **Project Settings**.  
2. Раздел **API Keys** (или Data API → ключи).  
3. Секретный ключ **`sb_secret_...`** — нажми **глаз**, скопируй **всю** строку. Сохрани в заметку до шага D (никому не отправляй).

**Шаг D — запуск на компьютере**  
1. Открой **Терминал** (Terminal на Mac).  
2. Перейди в папку проекта Sophia: `cd` в каталог, где лежит `package.json` (корень `sophia-os`).  
3. Один раз: `npm install`  
4. Подставь **свои** значения (URL проекта, ключ, UUID, путь к `dev.db` Twinworks):

```bash
export SUPABASE_URL="https://ТВОЙ-ПРОЕКТ.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="вставь_sb_secret_целиком"
export FINANCE_IMPORT_USER_ID="вставь_UUID_из_шага_B"

npm run import-finance -- --sqlite /полный/путь/к/twinworks/prisma/dev.db --wipe
```

5. Если в конце написало счётчики строк и «Готово» — всё импортировалось.

**Шаг E — проверка**  
Зайди в Софию **под тем же пользователем**, что и этот UUID → вкладка **Финансы** → должны быть цифры.

Если на **шаге B** не видишь **Authentication**: возможно, у аккаунта нет прав на проект — зайди под владельцем проекта или попроси его скинуть твой UUID из списка пользователей.

---

## Шаг 1. Применить миграцию `009_finance`

1. Открой [Supabase Dashboard](https://supabase.com/dashboard) → свой проект.
2. **SQL Editor** → New query.
3. Вставь содержимое файла `supabase/migrations/009_finance.sql` из репозитория Sophia.
4. Выполни (**Run**). Ошибок быть не должно.

*(Если пользуешься Supabase CLI локально: `supabase db push` или как у тебя принято.)*

---

## Шаг 2. Узнать свой `user_id` (UUID)

Это тот же пользователь, под которым заходишь в Софию (email/пароль или magic link).

1. Supabase → **Authentication** → **Users**.
2. Найди себя в списке.
3. Скопируй поле **UUID** (формат `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).

Именно его передаём в импорт как владельца всех строк `finance_*`.

---

## Шаг 3. Секретный ключ для импорта (обход RLS)

Скрипт пишет в базу от имени «бэкенда» и **обходит RLS**.

### Новый интерфейс Supabase (`sb_secret_...`)

1. **Project Settings** → **API Keys** (раздел секретных ключей).
2. Ключ с именем вроде **default**, формат **`sb_secret_...`** — нажми **Reveal** / глаз и скопируй **целиком**.
3. Подставь в переменную **`SUPABASE_SERVICE_ROLE_KEY`** (имя переменной можно оставить таким же — это просто «секрет для импорта»).

Это тот же уровень доступа, что у старого JWT **`service_role`**.

### Если скрипт ругается на JWT (`bad_jwt` и т.п.)

1. На той же странице ключей открой вкладку **Legacy API keys**.
2. Скопируй **`service_role`** (строка вида **`eyJhbGci...`**).
3. Используй её как `SUPABASE_SERVICE_ROLE_KEY`.

**Важно:** не клади секрет в клиент приложения, не коммить в git. `SUPABASE_URL` — **Project URL** на той же странице настроек.

---

## Шаг 4. Установить зависимости и запустить импорт

В терминале на машине, где лежит **Sophia** и доступен файл **`twinworks/prisma/dev.db`** (только чтение, файл не трогаем):

```bash
cd /path/to/sophia-os
npm install
```

Выставь переменные и запусти скрипт (подставь свои значения):

```bash
export SUPABASE_URL="https://ТВОЙ-ПРОЕКТ.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."
export FINANCE_IMPORT_USER_ID="твой-uuid-из-шага-2"

npm run import-finance -- \
  --sqlite /Users/admin/Desktop/cursor/twinworks/prisma/dev.db
```

Путь `--sqlite` должен указывать на **реальный** `prisma/dev.db` из Twinworks.

В консоли увидишь счётчики вставленных строк и сумму балансов.

### Повторный импорт (перезаписать финансы этого пользователя)

Если нужно заново залить те же данные:

```bash
npm run import-finance -- \
  --sqlite /path/to/twinworks/prisma/dev.db \
  --wipe
```

`--wipe` сначала удаляет все строки `finance_*` с твоим `user_id`, потом вставляет заново.

Альтернатива переменным:

```bash
node scripts/import-finance-from-sqlite.mjs \
  --sqlite /path/to/dev.db \
  --user "uuid-здесь" \
  --wipe
```

---

## Шаг 5. Проверить в приложении

1. Войди в **Sophia** под **тем же** аккаунтом Supabase Auth (тот же UUID).
2. Вкладка **Финансы** — должны подтянуться баланс, категории, транзакции, история (если были снимки в `monthly_history`).

Если данных нет: проверь, что миграция применена, импорт без ошибок, и `FINANCE_IMPORT_USER_ID` совпадает с пользователем в приложении.

---

## Что именно копируется

| Источник (SQLite Twinworks) | Назначение (Supabase) |
|----------------------------|------------------------|
| `PersonalAccount` | `finance_accounts` |
| `PersonalTransaction` | `finance_transactions` |
| `expense_categories` | `finance_expense_categories` |
| `expense_settings` (1 строка) | `finance_expense_settings` |
| `one_time_expenses` | `finance_one_time_expenses` |
| `monthly_history` | `finance_month_snapshots` (upsert по году/месяцу) |

`personal_settings` (оценочный капитал) **не** импортируем — в UI Софии не используется.

---

## Безопасность Twinworks

- SQLite **только чтение** в скрипте (`readonly: true`).
- Не запускай `prisma migrate reset` на боевой базе Twinworks без бэкапа.

---

## Ручной импорт без скрипта

Если не хочешь давать `service_role`, теоретически можно сгенерировать `INSERT` из `.dump` и выполнить в SQL Editor под ролью postgres — но тогда в каждую строку нужно вручную прописать `user_id`. Скрипт сильно проще.
