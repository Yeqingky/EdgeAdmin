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

cat > configs/api_db.yaml <<EOF
user: goedge
password: goedge
host: mysql:3306
database: goedge
EOF

cp "${SHARED_DIR}/api_admin.yaml" configs/api_admin.yaml
mkdir -p "${HOME}/.edge-admin"
cp "${SHARED_DIR}/api_admin.yaml" "${HOME}/.edge-admin/api_admin.yaml"

exec bin/edge-admin
