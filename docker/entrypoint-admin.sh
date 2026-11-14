#!/bin/sh
set -eu

ROOT_DIR=/usr/local/goedge
SHARED_DIR=/shared

cd "$ROOT_DIR"

mkdir -p configs logs web/tmp

# 等待 API 节点写入管理面板配置
attempts=150
while [ ! -s "${SHARED_DIR}/api_admin.yaml" ]; do
    attempts=$((attempts - 1))
    if [ "$attempts" -le 0 ]; then
        echo "[ERROR] could not find ${SHARED_DIR}/api_admin.yaml" >&2
        exit 1
    fi
    echo "waiting for api node ..."
    sleep 2
done

cp "${SHARED_DIR}/api_admin.yaml" configs/api_admin.yaml
mkdir -p "${HOME}/.edge-admin"
cp "${SHARED_DIR}/api_admin.yaml" "${HOME}/.edge-admin/api_admin.yaml"

# 等待 API 节点开始监听, 避免启动期间登录失败
api_host=$(sed -n 's|^[[:space:]]*- "http://\([^:/"]*\):\([0-9]*\)".*|\1|p' "${SHARED_DIR}/api_admin.yaml" | head -n 1)
api_port=$(sed -n 's|^[[:space:]]*- "http://\([^:/"]*\):\([0-9]*\)".*|\2|p' "${SHARED_DIR}/api_admin.yaml" | head -n 1)
api_host=${api_host:-goedge-api}
api_port=${api_port:-8001}
attempts=120
while ! nc -z "$api_host" "$api_port" 2>/dev/null; do
    attempts=$((attempts - 1))
    if [ "$attempts" -le 0 ]; then
        echo "[WARN] api node ${api_host}:${api_port} is not ready, starting admin anyway" >&2
        break
    fi
    echo "waiting for api node ${api_host}:${api_port} ..."
    sleep 1
done

exec bin/edge-admin
