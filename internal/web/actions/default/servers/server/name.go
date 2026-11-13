package server

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type NameAction struct {
	actionutils.ParentAction
}

func (this *NameAction) RunGet(params struct {
	ServerId int64
}) {
	resp, err := this.RPC().ServerRPC().FindEnabledServer(this.AdminContext(), &pb.FindEnabledServerRequest{ServerId: params.ServerId})
	if err != nil {
		this.ErrorPage(err)
		return
	}
	if resp.Server == nil {
		this.NotFound("server", params.ServerId)
		return
	}
	this.Data["name"] = resp.Server.Name
	this.Success()
}
