#!/usr/bin/env bash
# Быстрая самопроверка на сервере: IP, слушает ли 8081, не только localhost.
set -euo pipefail
echo "=== Sophia OS — проверка для Expo Go (мобилка) ==="
echo ""
PUB="${REACT_NATIVE_PACKAGER_HOSTNAME:-$(curl -4 -s --max-time 5 https://ifconfig.me/ip 2>/dev/null || hostname -I | awk '{print $1}')}"
echo "1) Публичный IP (для exp:// и Safari): $PUB"
echo ""
if command -v ss >/dev/null 2>&1; then
  echo "2) Кто слушает порт 8081:"
  ss -tlnp 2>/dev/null | grep ':8081' || echo "   (ничего — Metro не запущен или другой порт)"
else
  echo "2) Установи ss (iproute2) или: netstat -tlnp | grep 8081"
fi
echo ""
echo "   Нужно: 0.0.0.0:8081 или *:8081 — НЕ только 127.0.0.1:8081"
echo ""
if command -v ufw >/dev/null 2>&1; then
  echo "3) UFW (если active — нужно: 8081/tcp ALLOW; иначе sudo ufw status):"
  (ufw status 2>/dev/null || true) | head -20
  echo ""
fi
echo "4) Ответ Metro на localhost:"
CODE="000"
if HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:8081" 2>/dev/null); then
  CODE="$HTTP_CODE"
fi
if echo "$CODE" | grep -qE '200|301|302|404'; then
  echo "   HTTP $CODE — Metro, скорее всего, жив."
else
  echo "   Нет ответа (код $CODE) — запусти: npm run start:lan"
fi
echo ""
echo "5) С iPhone в Safari открой:  http://${PUB}:8081"
echo "   В Expo Go введи:          exp://${PUB}:8081"
echo ""
echo "Если Safari не открывает — облачный фаервол / не тот IP / порт."
echo "Полный чеклист: docs/MOBILE_TROUBLESHOOTING.md"
echo ""
