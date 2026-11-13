package tasks

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type DeleteAllAction struct {
	actionutils.ParentAction
}

func (this *DeleteAllAction) RunPost(params struct{}) {
	defer this.CreateLogInfo(codes.DNSTask_LogDeleteAllDNSTasks)

	_, err := this.RPC().DNSTaskRPC().DeleteAllDNSTasks(this.AdminContext(), &pb.DeleteAllDNSTasksRequest{})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Success()
}
