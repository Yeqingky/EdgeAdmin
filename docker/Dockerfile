# syntax=docker/dockerfile:1

# 前端 SPA 构建
FROM node:24-alpine AS frontend

RUN corepack enable

WORKDIR /src/EdgeAdmin/frontend

COPY EdgeAdmin/frontend/package.json EdgeAdmin/frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY EdgeAdmin/frontend ./
COPY EdgeAdmin/web /src/EdgeAdmin/web
RUN pnpm build

# 构建上下文是上层 GoEdge 目录:
#   GoEdge/EdgeAdmin, GoEdge/EdgeAPI, GoEdge/EdgeCommon, GoEdge/EdgeNode
FROM golang:1.27.4-alpine AS build

RUN apk add --no-cache gcc g++ musl-dev zip

ARG TARGETARCH=amd64

WORKDIR /src

COPY EdgeCommon ./EdgeCommon
COPY EdgeAPI ./EdgeAPI
COPY EdgeNode ./EdgeNode
COPY EdgeTunnel ./EdgeTunnel
COPY EdgeAdmin ./EdgeAdmin
COPY --from=frontend /src/EdgeAdmin/web/public/spa ./EdgeAdmin/web/public/spa

ENV CGO_ENABLED=0 \
    GOOS=linux \
    GOFLAGS=-trimpath

# edge-admin 与 edge-api
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -C EdgeAdmin -tags community -ldflags "-s -w" -o /out/edge-admin ./cmd/edge-admin \
 && go build -C EdgeAPI -tags community -ldflags "-s -w" -o /out/edge-api ./cmd/edge-api

# 节点安装助手, 由 API 节点上传到被安装节点
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    for arch in amd64 arm64; do \
        GOARCH="${arch}" go build -C EdgeAPI -tags community -ldflags "-s -w" -o "/out/installers/edge-installer-helper-linux-${arch}" ./cmd/installer-helper; \
    done

# 边缘节点部署包, 由 API 节点通过 SSH 分发到裸机
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    set -eux; \
    version=$(sed -n 's/.*Version[[:space:]]*=[[:space:]]*"\([0-9.]*\)".*/\1/p' EdgeNode/internal/const/const.go | head -n 1); \
    test -n "${version}"; \
    mkdir -p EdgeNode/dist/edge-node/bin EdgeNode/dist/edge-node/configs EdgeNode/dist/edge-node/logs EdgeNode/dist/edge-node/data; \
    cp EdgeNode/build/configs/*.yaml EdgeNode/dist/edge-node/configs/; \
    cp -R EdgeNode/build/www EdgeNode/build/pages EdgeNode/dist/edge-node/; \
    CGO_ENABLED=0 GOARCH="${TARGETARCH}" go build -C EdgeTunnel -ldflags "-s -w" -o "/out/frps-linux-${TARGETARCH}" ./cmd/frps; \
    cp "/out/frps-linux-${TARGETARCH}" EdgeNode/dist/edge-node/bin/frps; \
    CGO_ENABLED=1 GOARCH="${TARGETARCH}" go build -C EdgeNode -tags community -ldflags "-s -w -linkmode external -extldflags -static" -o dist/edge-node/bin/edge-node ./cmd/edge-node; \
    cd EdgeNode/dist; \
    zip -qr "/out/edge-node-linux-${TARGETARCH}-v${version}.zip" edge-node

# 组装运行目录
RUN mkdir -p /out/admin/bin /out/admin/configs /out/admin/logs /out/admin/web/tmp \
             /out/admin/edge-api/deploy /out/admin/edge-api/installers \
 && cp /out/edge-admin /out/admin/bin/ \
 && cp -R EdgeAdmin/web/public EdgeAdmin/web/views /out/admin/web/ \
 && rm -rf /out/admin/web/public/js/components /out/admin/web/public/js/components.src.js \
 && cp EdgeAdmin/build/configs/server.template.yaml /out/admin/configs/ \
 && cp /out/edge-node-linux-*.zip /out/admin/edge-api/deploy/ \
 && cp /out/installers/* /out/admin/edge-api/installers/ \
 && mkdir -p /out/api/bin /out/api/configs /out/api/deploy /out/api/installers /out/api/data /out/api/logs \
 && cp /out/edge-api /out/api/bin/ \
 && cp EdgeAPI/build/configs/db.template.yaml /out/api/configs/ \
 && cp /out/edge-node-linux-*.zip /out/api/deploy/ \
 && cp /out/installers/* /out/api/installers/

# 管理面板
FROM alpine:3.22 AS admin

RUN apk add --no-cache ca-certificates tzdata

ENV TZ=Asia/Shanghai

WORKDIR /usr/local/goedge

COPY --from=build /out/admin/ ./
COPY EdgeAdmin/docker/entrypoint-admin.sh /usr/local/bin/entrypoint-admin.sh

RUN chmod +x /usr/local/bin/entrypoint-admin.sh

EXPOSE 7788

ENTRYPOINT ["/usr/local/bin/entrypoint-admin.sh"]

# API 节点
FROM alpine:3.22 AS api

RUN apk add --no-cache ca-certificates mariadb-client tzdata

ENV TZ=Asia/Shanghai

WORKDIR /usr/local/goedge

COPY --from=build /out/api/ ./
COPY EdgeAdmin/docker/entrypoint-api.sh /usr/local/bin/entrypoint-api.sh

RUN chmod +x /usr/local/bin/entrypoint-api.sh

EXPOSE 8001

ENTRYPOINT ["/usr/local/bin/entrypoint-api.sh"]
