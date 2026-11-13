// Copyright 2021 GoEdge CDN goedge.cdn@gmail.com. All rights reserved.

package logs

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/helpers"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type FixAllAction struct {
	actionutils.ParentAction
}

func (this *FixAllAction) RunPost(params struct {
}) {
	defer this.CreateLogInfo(codes.NodeLog_LogFixAllLogs)

	_, err := this.RPC().NodeLogRPC().FixAllNodeLogs(this.AdminContext(), &pb.FixAllNodeLogsRequest{})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	// 通知左侧数字Badge更新
	helpers.NotifyNodeLogsCountChange()

	this.Success()
}
