#!/usr/bin/env bash
# Запускает cloudflared и при появлении URL пишет его в .tunnel-url в корне репо (для бота).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
cloudflared tunnel --url http://localhost:5173 2>&1 | while IFS= read -r line; do
  echo "$line"
  if echo "$line" | grep -qE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com'; then
    echo "$line" | grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' | head -1 > .tunnel-url
  fi
done
