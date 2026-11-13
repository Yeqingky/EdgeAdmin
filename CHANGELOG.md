# Changelog

## v1.4.2-rc.1 (2026-11-13)

- 升级全部依赖链并升级 Go 工具链到 1.27.4, govulncheck 符号级扫描可达漏洞 11 -> 0
- golang.org/x/net v0.23.0 -> v0.62.0, google.golang.org/grpc v1.63.2 -> v1.85.0, golang.org/x/crypto v0.23.0 -> v0.59.0, golang.org/x/text v0.15.0 -> v0.44.0
- 移除 go.mod 中对不存在模块 EdgePlus 的 replace 和 require (无代码引用)
- internal/waf/injectionutils: 将包根的 libinjection 包装 .c 文件并入 cgo 预部并删除, 修复默认构建 (无 gcc tag) 下 "C source files not allowed" 报错; gcc tag 构建行为不变
- 依赖 quic-go 无代码引用, 已随 go mod tidy 移除
