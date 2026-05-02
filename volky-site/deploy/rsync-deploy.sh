#!/usr/bin/env bash
# Выкладка статики volky на сервер по SSH (запускайте на машине, где есть файлы).
#
# Переменные (обязательно поправьте):
#   VOLKY_SSH       — user@twinlabs.ru (или IP)
#   VOLKY_REMOTE    — каталог на сервере (должен совпадать с alias в nginx)
#
# Пример:
#   export VOLKY_SSH=deploy@twinlabs.ru
#   export VOLKY_REMOTE=/var/www/volky
#   ./rsync-deploy.sh "/Users/admin/Downloads"
#
set -euo pipefail

LOCAL_DIR="${1:?Укажите локальную папку, например: $0 \"/Users/admin/Downloads\"}"
VOLKY_SSH="${VOLKY_SSH:?Задайте VOLKY_SSH=user@host}"
VOLKY_REMOTE="${VOLKY_REMOTE:-/var/www/volky}"

INDEX_SRC=""
if [[ -f "$LOCAL_DIR/index (1).html" ]]; then
  INDEX_SRC="$LOCAL_DIR/index (1).html"
elif [[ -f "$LOCAL_DIR/index.html" ]]; then
  INDEX_SRC="$LOCAL_DIR/index.html"
else
  echo "Не найден index.html или «index (1).html» в: $LOCAL_DIR" >&2
  exit 1
fi

if [[ ! -d "$LOCAL_DIR/assets" ]]; then
  echo "Нет папки assets в: $LOCAL_DIR" >&2
  exit 1
fi

echo "→ $VOLKY_SSH:$VOLKY_REMOTE"
ssh "$VOLKY_SSH" "mkdir -p \"$VOLKY_REMOTE/assets\""
scp "$INDEX_SRC" "$VOLKY_SSH:$VOLKY_REMOTE/index.html"
rsync -avz --delete "$LOCAL_DIR/assets/" "$VOLKY_SSH:$VOLKY_REMOTE/assets/"

echo "Готово. Убедитесь, что в nginx подключён фрагмент из nginx-twinlabs-volky.conf.example и сделан nginx -s reload."
