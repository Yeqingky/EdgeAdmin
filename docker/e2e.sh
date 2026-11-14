#!/bin/sh
set -eu

WORKSPACE=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
E2E_DIR=$(mktemp -d)
EDGE_ROOT_DIR="$E2E_DIR/root"
EDGE_SHARED_DIR="$E2E_DIR/shared"
export EDGE_ROOT_DIR EDGE_SHARED_DIR
export EDGE_DB_HOST=${EDGE_DB_HOST:-mysql}
export EDGE_DB_PORT=${EDGE_DB_PORT:-3306}
export EDGE_DB_USER=${EDGE_DB_USER:-goedge}
export EDGE_DB_PASSWORD=${EDGE_DB_PASSWORD:-e2e}
export EDGE_DB_NAME=${EDGE_DB_NAME:-goedge}
export API_NODE_HOST=127.0.0.1
export ADMIN_RPC_ENDPOINT=http://127.0.0.1:8001
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=e2e
export E2E_BASE_URL=http://127.0.0.1:7788
export E2E_PASSWORD=e2e

api_pid=
admin_pid=
cleanup() {
    [ -z "$admin_pid" ] || kill "$admin_pid" 2>/dev/null || true
    [ -z "$api_pid" ] || kill "$api_pid" 2>/dev/null || true
    [ -z "$admin_pid" ] || wait "$admin_pid" 2>/dev/null || true
    [ -z "$api_pid" ] || wait "$api_pid" 2>/dev/null || true
    rm -r -- "$E2E_DIR"
}
trap cleanup EXIT HUP INT TERM

mkdir -p "$EDGE_ROOT_DIR/bin" "$EDGE_ROOT_DIR/configs" "$EDGE_ROOT_DIR/web" "$EDGE_SHARED_DIR" "$E2E_DIR/home"
cd "$WORKSPACE/EdgeAdmin/frontend"
pnpm install --frozen-lockfile
pnpm build
pnpm exec playwright install --with-deps chromium
cp -R "$WORKSPACE/EdgeAdmin/web/public" "$WORKSPACE/EdgeAdmin/web/views" "$EDGE_ROOT_DIR/web/"
cp "$WORKSPACE/EdgeAdmin/build/configs/server.template.yaml" "$EDGE_ROOT_DIR/configs/"
cp "$WORKSPACE/EdgeAPI/build/configs/db.template.yaml" "$EDGE_ROOT_DIR/configs/"
go build -C "$WORKSPACE/EdgeAPI" -tags community -o "$EDGE_ROOT_DIR/bin/edge-api" ./cmd/edge-api
go build -C "$WORKSPACE/EdgeAdmin" -tags community -o "$EDGE_ROOT_DIR/bin/edge-admin" ./cmd/edge-admin

HOME="$E2E_DIR/home" "$WORKSPACE/EdgeAdmin/docker/entrypoint-api.sh" >"$E2E_DIR/api.log" 2>&1 &
api_pid=$!
HOME="$E2E_DIR/home" "$WORKSPACE/EdgeAdmin/docker/entrypoint-admin.sh" >"$E2E_DIR/admin.log" 2>&1 &
admin_pid=$!
ready=false
for _ in $(seq 1 120); do
    if curl -fsS --connect-timeout 2 --max-time 3 "$E2E_BASE_URL/login" >/dev/null 2>&1; then
        ready=true
        break
    fi
    if ! kill -0 "$api_pid" 2>/dev/null || ! kill -0 "$admin_pid" 2>/dev/null; then
        break
    fi
    sleep 1
done
if [ "$ready" != true ]; then
    cat "$E2E_DIR/api.log" "$E2E_DIR/admin.log" >&2
    exit 1
fi
pnpm exec playwright test e2e/tunnel.spec.ts --workers=1
