#!/usr/bin/env bash

set -euo pipefail

echo "开始自动部署..."
echo "部署提交: ${GIT_SHA:-unknown}"

# 确保 compose 使用最新环境变量，并清理历史残留容器。
docker compose down --remove-orphans || true

stale_container_ids="$(docker ps -aq --filter name='^/smart-ledger-app-1$')"
if [ -n "${stale_container_ids}" ]; then
  echo "清理残留容器: ${stale_container_ids}"
  docker rm -f ${stale_container_ids}
fi

docker compose rm -sf app || true

docker compose up -d --build --force-recreate
docker image prune -f

echo "部署完成！"

container_id="$(docker compose ps -q app)"
if [ -n "${container_id}" ]; then
  docker inspect "${container_id}" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep APP_GIT_SHA || true
fi
