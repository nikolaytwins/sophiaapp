#!/usr/bin/env bash
# Запуск расчёта транзитов для After Dark (из корня monorepo: skills/astro-core)
set -euo pipefail
# sophia-os/.. = workspace (рядом лежит skills/)
SOPHIA_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_DIR="$SOPHIA_ROOT/../skills/astro-core/scripts"
if [[ ! -f "$SCRIPT_DIR/astro_api_server.py" ]]; then
  echo "Не найден $SCRIPT_DIR/astro_api_server.py (ожидается репозиторий openclaw workspace)."
  exit 1
fi
cd "$SCRIPT_DIR"
exec python3 astro_api_server.py "$@"
