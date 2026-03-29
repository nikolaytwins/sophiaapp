# Подключение YouTube API — настройка

## 1. Google Cloud Console

1. Открой [Google Cloud Console](https://console.cloud.google.com/).
2. Создай проект или выбери существующий.
3. **Включи API:**
   - [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com)
   - [YouTube Analytics API](https://console.cloud.google.com/apis/library/youtubeAnalytics.googleapis.com)

## 2. OAuth 2.0 credentials (user flow)

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID.**
2. Тип приложения: **Web application** (для redirect URI с твоего домена).
3. **Authorized redirect URIs** добавь:
   - Локально: `http://localhost:3000/api/youtube/callback`
   - Продакшен: `https://ТВОЙ_ДОМЕН/api/youtube/callback`  
     Например: `https://178.72.168.156/api/youtube/callback` (если приложение на этом хосте и за nginx с SSL — укажи свой URL).
4. Сохрани **Client ID** и **Client Secret**.

## 3. Scopes (области доступа)

Используются только права на чтение:

- `https://www.googleapis.com/auth/youtube.readonly` — канал, плейлисты, список видео, базовая статистика.
- `https://www.googleapis.com/auth/yt-analytics.readonly` — аналитика канала и видео (просмотры, подписчики, retention и т.д.).

Этого достаточно для дашборда без доступа к загрузке/удалению видео.

## 4. Переменные окружения

В `.env` или `.env.local` в корне проекта Twinworks добавь:

```env
# YouTube (OAuth 2.0)
GOOGLE_CLIENT_ID=твой_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=твой_client_secret

# URL приложения (для redirect после OAuth)
NEXT_PUBLIC_APP_URL=http://localhost:3000
# В продакшене: https://твой-домен.ru
```

- **GOOGLE_CLIENT_ID** и **GOOGLE_CLIENT_SECRET** — из шага 2.
- **NEXT_PUBLIC_APP_URL** — базовый URL приложения (без слэша в конце). Для callback будет использоваться `NEXT_PUBLIC_APP_URL + '/api/youtube/callback'`.

## 5. Redirect URI в приложении

Callback обрабатывается по адресу:

```
{NEXT_PUBLIC_APP_URL}/api/youtube/callback
```

Этот же URL должен быть добавлен в **Authorized redirect URIs** в Google Cloud Console (шаг 2).

## 6. После первой авторизации

- Токены сохраняются в БД (модель `YoutubeCredential`).
- Для обновления данных используется **refresh token** — повторная авторизация в браузере не нужна, пока пользователь не отзовёт доступ или токены не истекут.
