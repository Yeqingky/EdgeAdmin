package actionutils

import (
	"context"

	"git.ovh.im/yeqing/EdgeAdmin/internal/rpc"
	"github.com/iwind/TeaGo/maps"
)

type ActionInterface interface {
	RPC() *rpc.RPCClient

	AdminContext() context.Context

	ViewData() maps.Map
}
