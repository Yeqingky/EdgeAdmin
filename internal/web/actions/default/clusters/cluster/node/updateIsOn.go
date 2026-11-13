package node

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type UpdateIsOnAction struct {
	actionutils.ParentAction
}

func (this *UpdateIsOnAction) RunPost(params struct {
	NodeId int64
	IsOn   bool
}) {
	if params.IsOn {
		defer this.CreateLogInfo(codes.Node_LogUpdateNodeOn, params.NodeId)
	} else {
		defer this.CreateLogInfo(codes.Node_LogUpdateNodeOff, params.NodeId)
	}

	_, err := this.RPC().NodeRPC().UpdateNodeIsOn(this.AdminContext(), &pb.UpdateNodeIsOnRequest{
		NodeId: params.NodeId,
		IsOn:   params.IsOn,
	})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Success()
}
