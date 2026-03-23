# Работа через Expo Go (основной способ на телефон)

Бесплатно, без Apple Developer. На телефоне ставишь **Expo Go** из App Store — внутри открывается **Sophia OS** с Metro.

**Не понимаешь, куда нажимать?** Пошагово «скопировал — вставил»: [EXPO_GO_КУДА_ЖАТЬ.md](./EXPO_GO_КУДА_ЖАТЬ.md).

---

## 1. На iPhone

1. Установи **[Expo Go](https://apps.apple.com/app/expo-go/id982107779)** из App Store.
2. После запуска Metro (шаг 2) открой Expo Go:
   - **Enter URL manually** (ввод вручную), или  
   - сканируй **QR** из терминала (если удобно с тем же экраном).

Формат ссылки: **`exp://IP_СЕРВЕРА:8081`** — точный IP смотри в логе после `npm run start:lan` (строка `Packager host для QR`).

---

## 2. Запуск Metro (где пишешь код)

### Вариант A — сервер в интернете (Selectel / VPS)

```bash
cd /path/to/sophia-os
npm install
npm run start:lan
```

Нужен **открытый входящий TCP 8081** на сервере (фаервол). Подробно: [MOBILE_SETUP.md](./MOBILE_SETUP.md) и [SELECTEL_FIREWALL_8081.md](./SELECTEL_FIREWALL_8081.md).

Проверка с телефона: в Safari открой `http://ТВОЙ_IP:8081` — должно что-то ответить.

### Вариант B — Mac/ПК и телефон в одной Wi‑Fi

```bash
npx expo start
```

В терминале появится QR и LAN URL — iPhone в той же сети подключится без открытия портов в облаке.

### Вариант C — не хочешь настраивать фаервол на VPS

```bash
npm run start:tunnel
```

Expo поднимет туннель; в Expo Go открой ссылку из вывода. Иногда нужен `npx expo login`.

---

## 3. Не грузится с телефона (фаервол уже открыли)

Пошаговая диагностика: **[MOBILE_TROUBLESHOOTING.md](./MOBILE_TROUBLESHOOTING.md)**  
Кратко: Safari `http://IP:8081` → потом Expo Go `exp://IP:8081` → `npm run check:mobile` на сервере.

## 4. Полезное

| Команда | Зачем |
|---------|--------|
| `npm run check:mobile` | На сервере: IP, порт 8081, ufw, curl localhost. |
| `npm run start:lan` | VPS: Metro с публичным hostname для Expo Go. |
| `npm run start:tunnel` | Обход закрытого 8081 в облаке. |

После изменений в коде приложение в Expo Go обновится (**fast refresh**) или потряси телефон → **Reload**.

---

## 5. Ограничения Expo Go

- Это **не отдельная иконка «Sophia OS»** — иконка **Expo Go**, проект внутри.
- Некоторые нативные модули, которых нет в Expo Go, могут не заработать (у нас стек — в основном совместим с Expo).
- Metro **должен быть запущен** (или tunnel), пока пользуешься dev-сборкой.

Для «своей иконки без Expo» смотри [EAS_IOS.md](./EAS_IOS.md) или [IOS_FREE_PERSONAL.md](./IOS_FREE_PERSONAL.md) (веб-ярлык).
