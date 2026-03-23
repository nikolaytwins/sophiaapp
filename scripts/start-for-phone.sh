#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Публичный IP этой машины (Selectel / VPS). Expo Go подставит его в QR.
export REACT_NATIVE_PACKAGER_HOSTNAME="${REACT_NATIVE_PACKAGER_HOSTNAME:-$(curl -4 -s --max-time 5 https://ifconfig.me/ip 2>/dev/null || hostname -I | awk '{print $1}')}"

echo ">>> Packager host для QR: $REACT_NATIVE_PACKAGER_HOSTNAME"
echo ">>> В панели Selectel открой входящий TCP :8081 (и 19000/19001 при необходимости)."
echo ">>> Запуск: expo start --lan"
echo ""

exec npx expo start --lan --port 8081
