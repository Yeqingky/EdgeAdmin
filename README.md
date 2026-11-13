# GoEdge目标
做一款人人用得起的CDN & WAF系统。

![截图](doc/screenshot.png)

## 特性
* `免费` - 开源、免费、自由、开放
* `简单` - 架构简单清晰，安装简单，使用简单，运维简单
* `高扩展性` - 可以自由扩展新的节点，支持亿级数据

## 功能介绍
* 多用户
* 日志审计
* 集群管理
* HTTP/HTTPS/TCP/UDP等协议支持
* WAF
* 缓存
* DNS自动解析
* 多域名绑定
* 免费证书申请
* IP黑白名单
* 访问日志
* 统计
* 内容压缩
* Protocol Proxy协议
* 本地静态文件
* URL跳转
* 路由规则
* 重写规则
* 访问控制
* 字符编码
* 自定义页面
* 自定义HTTP Header
* Websocket
* WebP自动转换
* Fastcgi
* 请求限制
* 流量限制

## 在线演示
* [http://demo.goedge.cloud](http://demo.goedge.cloud)

## 文档
* [新手指南](https://goedge.cloud/docs/QuickStart/Index.md)
* [完整文档](https://goedge.cloud/docs)
* [开发者指南](https://goedge.cloud/docs/Developer/Build.md)

## 架构
![架构图](doc/architect-zh.png)

其中的组件源码地址如下：
* [边缘节点](https://git.ovh.im/yeqing/EdgeNode)
* [API节点](https://git.ovh.im/yeqing/EdgeAPI)
* [管理平台](https://git.ovh.im/yeqing/EdgeAdmin)

## 开发环境

| 主机 | 部署内容 | 方式 |
| --- | --- | --- |
| `192.168.5.30` | 管理面板 EdgeAdmin, API 节点 EdgeAPI | docker compose |
| `192.168.5.31` | 边缘节点 EdgeNode | 由管理面板通过 SSH 安装到裸机 |

本仓库是六个仓库的主仓库, 跨模块的架构规划, 部署方式和开发环境约定放在本仓库. 六个仓库为 EdgeAdmin, EdgeAPI, EdgeNode, EdgeCommon, firewall-server, toa.

## 使用 Docker Compose 部署

构建上下文是上层 GoEdge 目录, 需要 EdgeAPI, EdgeCommon, EdgeNode 与本仓库并列:

```
GoEdge/
  EdgeAdmin/
  EdgeAPI/
  EdgeCommon/
  EdgeNode/
```

构建并启动管理面板, API 节点和数据库:

```sh
docker compose build
docker compose up -d
```

- 管理面板地址为 `http://主机:7788`.
- API 节点监听 `8001` 端口.
- 首次启动自动创建数据库表结构, API 节点和初始管理员, 默认账号 `admin` / `123456`.

运行时数据全部使用宿主机目录挂载, 不使用 Docker 卷:

| 宿主机目录 | 容器路径 | 用途 |
| --- | --- | --- |
| `data/mysql` | `/var/lib/mysql` | 数据库数据 |
| `data/edge-api/configs` | `/usr/local/goedge/configs` | API 节点配置 |
| `data/edge-api/data` | `/usr/local/goedge/data` | API 节点缓存 |
| `data/edge-api/logs` | `/usr/local/goedge/logs` | API 节点日志 |
| `data/edge-admin/configs` | `/usr/local/goedge/configs` | 管理面板配置 |
| `data/edge-admin/logs` | `/usr/local/goedge/logs` | 管理面板日志 |
| `data/shared` | `/shared` | 管理面板与 API 节点共享配置 |

启动前创建目录并设置权限:

```sh
mkdir -p data/mysql data/edge-api/{configs,data,logs} data/edge-admin/{configs,logs} data/shared
sudo chown -R 999:999 data/mysql
```

- `mysql` 进程以 uid `999` gid `999` 运行, 首次启动会自动修正 `data/mysql` 属主, 也可以提前执行上面的 `chown`.
- `edge-api` 和 `edge-admin` 进程以 uid `0` gid `0` 运行, root 可以写入任意宿主机目录, 不需要修改属主.
- `data/` 是运行时目录, 已加入 `.gitignore`.

支持的环境变量:

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DB_ROOT_PASSWORD` | `root` | 数据库 root 密码 |
| `DB_USER` | `edge` | 数据库用户名 |
| `DB_PASSWORD` | `edge` | 数据库密码 |
| `DB_NAME` | `db_edge` | 数据库名 |
| `ADMIN_PORT` | `7788` | 管理面板端口 |
| `API_PORT` | `8001` | API 节点端口 |
| `API_NODE_HOST` | `edge-api` | API 节点对外地址, 必须能被边缘节点访问 |
| `ADMIN_USERNAME` | `admin` | 初始管理员用户名 |
| `ADMIN_PASSWORD` | `123456` | 初始管理员密码 |

边缘节点不使用容器, 由管理面板通过 SSH 安装; `API_NODE_HOST` 需要设置为边缘节点可访问的地址. 节点部署包按 Docker 构建平台的架构生成, 支持 `amd64` 与 `arm64`. 数据库密码只支持字母, 数字, 下划线, 点和连字符.
