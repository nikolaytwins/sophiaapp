# Expo + Remote SSH + Selectel

## Что «ломается» на самом деле

| Симптом | Частая причина | Не файрвол на VPS |
|--------|----------------|-------------------|
| VS Code «Reconnecting to SSH…» / **taking longer** | Обрыв сети, сон ноутбука, таймаут NAT, перезагрузка VPS, перегруз sshd | Проверь **сначала** пинг и `ssh user@host` с терминала Mac |
| Expo «Port 8081 in use» | Уже запущен другой `expo start` | Закрой лишний процесс или другой порт |
| After Dark без цифр | Не запущен `npm run astro-api` (`:8765`) | См. [PRIVATE_MODULE.md](./PRIVATE_MODULE.md) |

**Сносить файрвол на VPS «нафиг»** обычно **не нужно**: достаточно **22/tcp** для SSH и при необходимости **8081** если ходишь на dev-сервер по IP. На **Selectel** отдельно проверь **облачный фаервол** в панели (правила для входящих на IP сервера).

## Быстрая проверка с Mac

```bash
ping -c 3 YOUR_VPS_IP
ssh -v user@YOUR_VPS_IP   # смотри, на чём обрывается
```

Если SSH с терминала стабилен, а VS Code отваливается — увеличь **ServerAliveInterval** в `~/.ssh/config` для этого хоста (например `60`), отключи **VPN** для теста, проверь сон Wi‑Fi.

## Кэши Expo (освободить место / сбросить залипания)

Из каталога `sophia-os`:

```bash
npm run clean:cache
```

Потом снова `npm install` при необходимости и `npx expo start --web` (или `npm run dev:with-astro`).
