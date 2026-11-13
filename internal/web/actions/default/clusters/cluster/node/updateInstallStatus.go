package node

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type UpdateInstallStatusAction struct {
	actionutils.ParentAction
}

func (this *UpdateInstallStatusAction) RunPost(params struct {
	NodeId      int64
	IsInstalled bool
}) {
	// 创建日志
	defer this.CreateLogInfo(codes.Node_LogUpdateNodeInstallationStatus, params.NodeId)

	_, err := this.RPC().NodeRPC().UpdateNodeIsInstalled(this.AdminContext(), &pb.UpdateNodeIsInstalledRequest{
		NodeId:      params.NodeId,
		IsInstalled: params.IsInstalled,
	})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Success()
}
