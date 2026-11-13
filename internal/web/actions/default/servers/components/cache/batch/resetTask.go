package cache

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type ResetTaskAction struct {
	actionutils.ParentAction
}

func (this *ResetTaskAction) RunPost(params struct {
	TaskId int64
}) {
	this.CreateLogInfo(codes.HTTPCacheTask_LogResetHTTPCacheTask, params.TaskId)

	_, err := this.RPC().HTTPCacheTaskRPC().ResetHTTPCacheTask(this.AdminContext(), &pb.ResetHTTPCacheTaskRequest{HttpCacheTaskId: params.TaskId})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Success()
}
