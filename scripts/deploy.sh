#!/usr/bin/env bash

set -euo pipefail

echo "开始自动部署..."
echo "部署提交: ${GIT_SHA:-unknown}"

prepare_env_files() {
  local env_source="${DEPLOY_ENV_SOURCE:-}"

  if [ -f ".env.local" ]; then
    cp .env.local .env
    return 0
  fi

  if [ -n "${env_source}" ] && [ -f "${env_source}" ]; then
    echo "从 ${env_source} 补充 .env.local"
    cp "${env_source}" .env.local
    cp "${env_source}" .env
    return 0
  fi

  echo "缺少 .env.local，且未找到可用的 DEPLOY_ENV_SOURCE"
  return 1
}

cleanup_stale_container() {
  stale_container_ids="$(docker ps -aq --filter name='^/smart-ledger-app-1$')"
  compose_container_ids="$(docker compose ps -aq app 2>/dev/null || true)"
  all_container_ids="$(printf '%s\n%s\n' "${stale_container_ids}" "${compose_container_ids}" | awk 'NF' | sort -u)"

  if [ -n "${all_container_ids}" ]; then
    echo "清理残留容器: ${all_container_ids}"
    docker rm -f ${all_container_ids} || true
  fi
}

wait_for_container_absent() {
  for _ in $(seq 1 15); do
    if ! docker ps -aq --filter name='^/smart-ledger-app-1$' | grep -q .; then
      return 0
    fi
    sleep 1
  done
  return 1
}

wait_for_service_ready() {
  for _ in $(seq 1 30); do
    container_id="$(docker compose ps -q app 2>/dev/null || true)"

    if [ -n "${container_id}" ]; then
      if ! docker inspect "${container_id}" >/dev/null 2>&1; then
        sleep 1
        continue
      fi

      running_state="$(docker inspect "${container_id}" --format '{{.State.Status}}' 2>/dev/null || true)"

      if [ "${running_state}" = "running" ]; then
        if curl -fsS http://127.0.0.1:3000/ >/dev/null 2>&1; then
          return 0
        fi
      fi
    fi

    sleep 1
  done
  return 1
}

prepare_compose_restart() {
  prepare_env_files
  docker compose down --remove-orphans || true
  cleanup_stale_container
  docker compose rm -sf app || true
  cleanup_stale_container

  if ! wait_for_container_absent; then
    echo "等待 smart-ledger-app-1 清理超时，强制再次清理..."
    cleanup_stale_container
    wait_for_container_absent || true
  fi
}

# 确保 compose 使用最新环境变量，并清理历史残留容器。
prepare_env_files
prepare_compose_restart

prepare_env_files
if ! docker compose up -d --build --force-recreate; then
  echo "首次启动失败，重试清理 smart-ledger-app-1 后再次启动..."
  prepare_compose_restart
  sleep 2
  prepare_env_files
  docker compose up -d --build --force-recreate
fi

if ! wait_for_service_ready; then
  echo "部署后服务未在预期时间内就绪，打印最近日志..."
  docker compose ps -a || true
  docker compose logs --tail=200 app || true
  exit 1
fi

docker image prune -f

echo "部署完成！"

container_id="$(docker compose ps -q app)"
if [ -n "${container_id}" ]; then
  docker inspect "${container_id}" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep APP_GIT_SHA || true
fi
