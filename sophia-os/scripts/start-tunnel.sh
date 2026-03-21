#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Tunnel через ngrok (Expo). Иногда нужен npx expo login.
unset CI

echo ">>> Запуск tunnel (может занять 30–60 с)…"
echo ">>> Если спросит логин: npx expo login"
exec npx expo start --tunnel --port 8081
