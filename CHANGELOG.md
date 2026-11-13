# Changelog

## v1.4.2-rc.1 (2026-11-13)

- 新增 TODO.md, 汇总所有商业版 (plus) 功能的实现计划, 含四个开源组件与 EdgeUser, EdgeDNS, EdgeReporter, EdgeBoot, edge-toa 五项闭源程序, 按 P0 至 P6 分阶段编排
- 升级全部依赖链并升级 Go 工具链到 1.27.4, govulncheck 符号级扫描可达漏洞 11 -> 0
- golang.org/x/net v0.23.0 -> v0.62.0, google.golang.org/grpc v1.63.2 -> v1.85.0, golang.org/x/crypto v0.23.0 -> v0.59.0, golang.org/x/text v0.15.0 -> v0.44.0
- 移除 go.mod 中对不存在模块 EdgePlus 的 replace 和 require (无代码引用)
- internal/waf/injectionutils: 将包根的 libinjection 包装 .c 文件并入 cgo 预部并删除, 修复默认构建 (无 gcc tag) 下 "C source files not allowed" 报错; gcc tag 构建行为不变
- 依赖 quic-go 无代码引用, 已随 go mod tidy 移除
- 将模块路径, 源码导入和文档链接中的仓库地址统一迁移到 git.ovh.im/yeqing
- docker/Dockerfile 改为多阶段源码构建, 编译 edge-admin, edge-api, 节点安装助手和边缘节点部署包, 不再下载二进制发布包
- 新增 docker-compose.yml, 包含 mysql, edge-api, edge-admin 服务, 首次启动自动初始化数据库, API 节点和初始管理员
- docker-compose.yml 全部使用宿主机目录挂载, 不使用 Docker 卷, 挂载路径下注释进程 uid/gid 和需要执行的权限命令
- docker-compose.yml 数据库名称, 用户名, 密码和 root 密码统一为 goedge 并写死, 服务顺序调整为管理面板, API 节点, 数据库, 新增显式 IPv6 NAT 网络
- docker-compose.yml 镜像名改为 ghcr.io/yeqingky/goedge-admin 与 ghcr.io/yeqingky/goedge-api, 三个容器使用固定容器名, 开发环境启动使用 --build
- 修复 Dockerfile.dockerignore 的 **/dist 误排除 web/public/js/sweetalert2/dist, 导致管理面板提示框失效和无法修改密码
- docker/entrypoint-admin.sh 写入 configs/api_db.yaml, 修复系统设置数据库页面读取配置失败
- cmd/edge-admin 启动时读取 EDGE_DB_* 环境变量生成 configs/api_db.yaml, entrypoint 不再生成数据库配置文件
- 移除系统设置数据库页面的修改模板功能, 数据库配置由配置文件和环境变量提供
- 移除界面设置中的显示底部开源信息开关, 底部开源信息始终隐藏
- 前端整体迁移到 React + TypeScript + Vite SPA (frontend/), 使用 pnpm, Lucide 图标, HashRouter, TanStack Query 和 Playwright e2e, 仅 CSR
- 新增 `_format=json` 页面数据输出和 `/api/login`, `/api/session` 接口, 未登录 JSON 请求返回 401
- 迁移网站、集群、节点、DNS、证书、分组、缓存、WAF、系统设置、用户、管理员、数据库、日志、消息、安装和恢复等全部页面, 旧版弹窗 URL 提供兼容路由
- 新增页面错误边界和登录失效自动跳转
- 根路径 `/` 和所有旧版页面 GET 地址重定向到 React SPA, 旧 action 仅作为 JSON 数据接口
- 修复 SPA 主内容区沿用旧版二级菜单偏移量, 导致内容整体右移的问题
- 新增 `/spa/` 入口和 Docker 前端构建阶段
- 新增 docker/entrypoint-api.sh 与 docker/entrypoint-admin.sh, 负责生成数据库配置, API 节点配置和管理面板配置
- docker/build.sh 与 docker/run.sh 改为 docker compose 封装
- 新增 AGENTS.md, 说明 EdgeAdmin 作为六个仓库主仓库的定位, 开发环境 192.168.5.30 与 192.168.5.31 的分工和容器化部署方式
- README 增加开发环境与 Docker Compose 部署说明
