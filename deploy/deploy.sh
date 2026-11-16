#!/usr/bin/env bash
# Выкладка AI RISE на сервер станции ТАКТ (тот же Caddy, отдельный адрес).
# Запуск из папки проекта:   bash deploy/deploy.sh [root@IP] [домен]
# Повторный запуск = обновление.
set -euo pipefail
SERVER="${1:-root@178.104.59.10}"
HOST="${SERVER#*@}"
DOMAIN="${2:-arise.$(echo "$HOST" | tr . -).sslip.io}"
REMOTE=/opt/arise
cd "$(dirname "$0")/.."

echo "▸ 1/4 Проверяю тесты и типы"
npm run lint >/dev/null && npm test >/dev/null

echo "▸ 2/4 Копирую код на $SERVER"
ssh -o ConnectTimeout=15 "$SERVER" "mkdir -p $REMOTE /opt/caddy-sites"
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude .git --exclude '*.tsbuildinfo' \
  --exclude .dev.log --exclude /data --exclude '.env*' --exclude coverage --exclude test-results \
  ./ "$SERVER:$REMOTE/"

echo "▸ 3/4 Собираю и запускаю (сборка идёт с пониженным приоритетом, чтобы не мешать ТАКТ)"
ssh "$SERVER" "cd $REMOTE/deploy && nice -n 15 docker compose build && docker compose up -d && docker image prune -f >/dev/null"

echo "▸ 4/4 Подключаю адрес $DOMAIN в Caddy"
ssh "$SERVER" bash -s -- "$DOMAIN" <<'REMOTE_SH'
set -e
cat > /opt/caddy-sites/arise.caddy <<CADDY
$1 {
	encode gzip
	reverse_proxy arise:3000
	header {
		Strict-Transport-Security "max-age=31536000"
		Referrer-Policy "same-origin"
		X-Content-Type-Options "nosniff"
	}
}
CADDY
docker exec takt-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
REMOTE_SH

# Ждём, пока игра реально ответит (первые секунды после перезапуска Caddy может отдавать 502)
for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/" || true)
  [ "$code" = "200" ] && break
  sleep 1
done
[ "$code" = "200" ] || { echo "⚠ https://$DOMAIN отвечает $code"; exit 1; }

echo "✅ Готово: https://$DOMAIN"
