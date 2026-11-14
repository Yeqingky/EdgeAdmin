package nodes

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type DeleteAction struct {
	actionutils.ParentAction
}

func (this *DeleteAction) RunPost(params struct {
	TunnelNodeId int64
}) {
	_, err := this.RPC().TunnelNodeRPC().DeleteTunnelNode(this.AdminContext(), &pb.DeleteTunnelNodeRequest{
		TunnelNodeId: params.TunnelNodeId,
	})
	if err != nil {
		this.Fail(err.Error())
		return
	}
	this.Success()
}
