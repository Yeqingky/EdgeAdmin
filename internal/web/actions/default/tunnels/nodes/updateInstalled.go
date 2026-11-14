package nodes

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type UpdateInstalledAction struct {
	actionutils.ParentAction
}

func (this *UpdateInstalledAction) RunPost(params struct {
	TunnelNodeId int64
	IsInstalled  bool
}) {
	_, err := this.RPC().TunnelNodeRPC().UpdateTunnelNodeIsInstalled(this.AdminContext(), &pb.UpdateTunnelNodeIsInstalledRequest{
		TunnelNodeId: params.TunnelNodeId,
		IsInstalled:  params.IsInstalled,
	})
	if err != nil {
		this.Fail(err.Error())
		return
	}
	this.Success()
}
