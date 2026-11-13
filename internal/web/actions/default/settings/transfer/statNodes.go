package transfer

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type StatNodesAction struct {
	actionutils.ParentAction
}

func (this *StatNodesAction) RunPost(params struct{}) {
	countNodesResp, err := this.RPC().NodeRPC().CountAllEnabledNodesMatch(this.AdminContext(), &pb.CountAllEnabledNodesMatchRequest{ActiveState: 1})
	if err != nil {
		this.ErrorPage(err)
		return
	}
	this.Data["countNodes"] = countNodesResp.Count

	this.Success()
}
