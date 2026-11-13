package node

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type UninstallAction struct {
	actionutils.ParentAction
}

func (this *UninstallAction) RunPost(params struct {
	NodeId int64
}) {
	resp, err := this.RPC().NodeRPC().UninstallNode(this.AdminContext(), &pb.UninstallNodeRequest{NodeId: params.NodeId})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	// 创建日志
	defer this.CreateLogInfo(codes.Node_LogUninstallNodeRemotely, params.NodeId)

	if resp.IsOk {
		this.Success()
	}

	this.Fail("执行失败:" + resp.Error)
}
