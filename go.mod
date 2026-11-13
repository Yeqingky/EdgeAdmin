module git.ovh.im/yeqing/EdgeAdmin

go 1.27.4

replace git.ovh.im/yeqing/EdgeCommon => ../EdgeCommon

require (
	git.ovh.im/yeqing/EdgeCommon v1.3.9
	github.com/cespare/xxhash/v2 v2.3.0
	github.com/go-sql-driver/mysql v1.10.1
	github.com/iwind/TeaGo v0.0.0-20240508072741-7647e70b7070
	github.com/iwind/gosock v1.0.0
	github.com/miekg/dns v1.1.73
	github.com/shirou/gopsutil/v3 v3.24.5
	github.com/skip2/go-qrcode v0.0.0-20200617195104-da1b6568686e
	github.com/tealeg/xlsx/v3 v3.3.13
	github.com/xlzd/gotp v0.1.0
	golang.org/x/crypto v0.59.0
	golang.org/x/net v0.62.0
	golang.org/x/sys v0.50.0
	google.golang.org/grpc v1.85.0
	gopkg.in/yaml.v3 v3.0.1
)

require (
	filippo.io/edwards25519 v1.2.0 // indirect
	github.com/frankban/quicktest v1.14.6 // indirect
	github.com/go-ole/go-ole v1.3.0 // indirect
	github.com/google/btree v1.1.3 // indirect
	github.com/google/go-cmp v0.7.0 // indirect
	github.com/kr/pretty v0.3.1 // indirect
	github.com/kr/text v0.2.0 // indirect
	github.com/peterbourgon/diskv/v3 v3.0.1 // indirect
	github.com/power-devops/perfstat v0.0.0-20260916203055-22a1a467d9f0 // indirect
	github.com/rogpeppe/fastuuid v1.2.0 // indirect
	github.com/rogpeppe/go-internal v1.16.0 // indirect
	github.com/shabbyrobe/xmlwriter v0.0.0-20251128030032-2fcb52763289 // indirect
	github.com/yusufpapurcu/wmi v1.2.4 // indirect
	golang.org/x/text v0.44.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20261110000943-09e21b237f2c // indirect
	google.golang.org/protobuf v1.36.12 // indirect
)
