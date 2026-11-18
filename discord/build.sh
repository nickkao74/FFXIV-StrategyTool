#!/usr/bin/env bash
# 把公開網站檔案複製到 discord/dist,供 Worker 托管。
# 刻意不含 _Planning、.claude、discord 本身等非公開內容。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/discord/dist"
rm -rf "$DIST" && mkdir -p "$DIST"
cp "$ROOT"/index.html "$ROOT"/guide.html "$ROOT"/board.html "$DIST"/
cp -r "$ROOT"/css "$ROOT"/js "$ROOT"/data "$DIST"/
# 讓 config.js 帶入環境變數裡的 Client ID(未設定則保留原檔)
if [[ -n "${DISCORD_CLIENT_ID:-}" ]]; then
  sed -i "s/clientId: ''/clientId: '${DISCORD_CLIENT_ID}'/" "$DIST/js/discord/config.js"
fi
echo "built → $DIST"
