package db

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/utils/numberutils"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
	"github.com/iwind/TeaGo/maps"
)

type StatusAction struct {
	actionutils.ParentAction
}

func (this *StatusAction) RunPost(params struct {
	NodeId int64
}) {
	statusResp, err := this.RPC().DBNodeRPC().CheckDBNodeStatus(this.AdminContext(), &pb.CheckDBNodeStatusRequest{DbNodeId: params.NodeId})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	var status = statusResp.DbNodeStatus
	if status != nil {
		this.Data["status"] = maps.Map{
			"isOk":    status.IsOk,
			"error":   status.Error,
			"size":    numberutils.FormatBytes(status.Size),
			"version": status.Version,
		}
	} else {
		this.Data["status"] = nil
	}

	this.Success()
}
