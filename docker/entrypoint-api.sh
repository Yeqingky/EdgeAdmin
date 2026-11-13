#!/bin/sh
set -eu

ROOT_DIR=/usr/local/goedge
SHARED_DIR=/shared

DB_HOST=${DB_HOST:-mysql}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-edge}
DB_PASSWORD=${DB_PASSWORD:-edge}
DB_NAME=${DB_NAME:-db_edge}

API_NODE_HOST=${API_NODE_HOST:-edge-api}
API_NODE_PORT=${API_NODE_PORT:-8001}
ADMIN_RPC_ENDPOINT=${ADMIN_RPC_ENDPOINT:-http://edge-api:8001}

ADMIN_USERNAME=${ADMIN_USERNAME:-admin}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-123456}

check_token() {
    if ! printf '%s' "$2" | grep -Eq '^[A-Za-z0-9_.-]+$'; then
        echo "[ERROR] invalid $1: '$2'" >&2
        exit 1
    fi
}

check_token "DB_HOST" "$DB_HOST"
check_token "DB_USER" "$DB_USER"
check_token "DB_PASSWORD" "$DB_PASSWORD"
check_token "DB_NAME" "$DB_NAME"
check_token "API_NODE_HOST" "$API_NODE_HOST"
check_token "ADMIN_USERNAME" "$ADMIN_USERNAME"

cd "$ROOT_DIR"

mkdir -p configs data logs "$SHARED_DIR"

# API 节点的数据库配置
cat > configs/db.yaml <<EOF
user: ${DB_USER}
password: ${DB_PASSWORD}
host: ${DB_HOST}:${DB_PORT}
database: ${DB_NAME}
EOF

cat > configs/.db.yaml <<EOF
default:
    db: prod
    prefix: ""
dbs:
    prod:
        driver: mysql
        dsn: ${DB_USER}:${DB_PASSWORD}@tcp(${DB_HOST}:${DB_PORT})/${DB_NAME}?charset=utf8mb4&timeout=30s&multiStatements=true
        prefix: edge
EOF

# 等待数据库
attempts=60
while ! MYSQL_PWD="$DB_PASSWORD" mariadb --protocol=tcp -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -e 'SELECT 1' "$DB_NAME" >/dev/null 2>&1; do
    attempts=$((attempts - 1))
    if [ "$attempts" -le 0 ]; then
        echo "[ERROR] could not connect to database ${DB_HOST}:${DB_PORT}" >&2
        exit 1
    fi
    echo "waiting for database ..."
    sleep 2
done

# 创建数据库表结构、API 节点配置和管理节点令牌, 重复执行安全
attempts=3
while :; do
    if setup_output=$(bin/edge-api setup -api-node-protocol=http -api-node-host="$API_NODE_HOST" -api-node-port="$API_NODE_PORT" 2>&1); then
        break
    fi
    attempts=$((attempts - 1))
    if [ "$attempts" -le 0 ]; then
        echo "$setup_output" >&2
        echo "[ERROR] edge-api setup failed" >&2
        exit 1
    fi
    echo "edge-api setup failed, retrying ..."
    echo "$setup_output" >&2
    sleep 3
done

if ! printf '%s' "$setup_output" | grep -q '"isOk":true'; then
    echo "$setup_output" >&2
    echo "[ERROR] edge-api setup failed" >&2
    exit 1
fi

admin_node_id=$(printf '%s' "$setup_output" | sed -n 's/.*"adminNodeId":"\([^"]*\)".*/\1/p')
admin_node_secret=$(printf '%s' "$setup_output" | sed -n 's/.*"adminNodeSecret":"\([^"]*\)".*/\1/p')
if [ -z "$admin_node_id" ] || [ -z "$admin_node_secret" ]; then
    echo "$setup_output" >&2
    echo "[ERROR] could not read admin node token from setup result" >&2
    exit 1
fi

# 管理面板连接 API 节点所需的配置
cat > "${SHARED_DIR}/api_admin.yaml.tmp" <<EOF
rpc.endpoints:
  - "${ADMIN_RPC_ENDPOINT}"
nodeId: "${admin_node_id}"
secret: "${admin_node_secret}"
EOF
mv "${SHARED_DIR}/api_admin.yaml.tmp" "${SHARED_DIR}/api_admin.yaml"

# 初始管理员账号
admin_count=$(MYSQL_PWD="$DB_PASSWORD" mariadb --protocol=tcp -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" --batch --skip-column-names -e "SELECT COUNT(*) FROM edgeAdmins WHERE username='${ADMIN_USERNAME}'" "$DB_NAME")
if [ "$admin_count" = "0" ]; then
    escaped_password=$(printf '%s' "$ADMIN_PASSWORD" | sed -e 's/\\/\\\\/g' -e "s/'/''/g")
    MYSQL_PWD="$DB_PASSWORD" mariadb --protocol=tcp -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -e "INSERT INTO edgeAdmins (isOn, username, password, fullname, isSuper, modules, canLogin, state, createdAt, updatedAt) VALUES (1, '${ADMIN_USERNAME}', MD5('${escaped_password}'), '${ADMIN_USERNAME}', 1, '[]', 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())" "$DB_NAME"
    echo "created admin '${ADMIN_USERNAME}'"
fi

exec bin/edge-api
