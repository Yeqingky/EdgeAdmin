package logs

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/helpers"
	"git.ovh.im/yeqing/EdgeCommon/pkg/nodeconfigs"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type ReadLogsAction struct {
	actionutils.ParentAction
}

func (this *ReadLogsAction) RunPost(params struct {
	LogIds []int64

	NodeId int64
}) {
	_, err := this.RPC().NodeLogRPC().UpdateNodeLogsRead(this.AdminContext(), &pb.UpdateNodeLogsReadRequest{
		NodeLogIds: params.LogIds,
		NodeId:     params.NodeId,
		Role:       nodeconfigs.NodeRoleNode,
	})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	// 通知左侧数字Badge更新
	helpers.NotifyNodeLogsCountChange()

	this.Success()
}
