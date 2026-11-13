package groups

import (	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type SortAction struct {
	actionutils.ParentAction
}

func (this *SortAction) RunPost(params struct {
	GroupIds []int64
}) {
	// 创建日志
	defer this.CreateLogInfo(codes.ServerGroup_LogSortServerGroups)

	_, err := this.RPC().ServerGroupRPC().UpdateServerGroupOrders(this.AdminContext(), &pb.UpdateServerGroupOrdersRequest{ServerGroupIds: params.GroupIds})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Success()
}
