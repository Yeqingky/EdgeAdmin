package tasks

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type DeleteBatchAction struct {
	actionutils.ParentAction
}

func (this *DeleteBatchAction) RunPost(params struct {
	TaskIds []int64
}) {
	defer this.CreateLogInfo(codes.NodeTask_LogDeleteNodeTasksBatch)

	_, err := this.RPC().NodeTaskRPC().DeleteNodeTasks(this.AdminContext(), &pb.DeleteNodeTasksRequest{NodeTaskIds: params.TaskIds})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Success()
}
