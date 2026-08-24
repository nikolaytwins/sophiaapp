#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
find "$ROOT/dist" -name "*.html" -print0 | while IFS= read -r -d "" f; do
  sed -i "s|<script src=\"/sophia/_expo/static/js/web/entry-\([^\"]*\)\.js\" defer></script>|<script type=\"module\" src=\"/sophia/_expo/static/js/web/entry-\1.js\"></script>|g" "$f"
done
