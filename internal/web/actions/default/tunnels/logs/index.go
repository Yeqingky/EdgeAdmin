package logs

import (
	"time"

	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
	"github.com/iwind/TeaGo/maps"
)

type IndexAction struct {
	actionutils.ParentAction
}

func (this *IndexAction) Init() {
	this.Nav("", "tunnel", "logs")
}

func (this *IndexAction) RunGet(params struct {
	TunnelNodeId int64
	Page         int64
}) {
	if params.Page <= 0 {
		params.Page = 1
	}
	size := int64(100)

	nodesResp, err := this.RPC().TunnelNodeRPC().ListTunnelNodes(this.AdminContext(), &pb.ListTunnelNodesRequest{
		Offset: 0,
		Size:   1000,
	})
	if err != nil {
		this.ErrorPage(err)
		return
	}
	if params.TunnelNodeId <= 0 && len(nodesResp.TunnelNodes) > 0 {
		params.TunnelNodeId = nodesResp.TunnelNodes[0].Id
	}

	nodes := []maps.Map{}
	for _, node := range nodesResp.TunnelNodes {
		nodes = append(nodes, maps.Map{"id": node.Id, "name": node.Name})
	}

	logs := []maps.Map{}
	if params.TunnelNodeId > 0 {
		logsResp, err := this.RPC().TunnelNodeRPC().ListTunnelLogs(this.AdminContext(), &pb.ListTunnelLogsRequest{
			TunnelNodeId: params.TunnelNodeId,
			Offset:       (params.Page - 1) * size,
			Size:         size,
		})
		if err != nil {
			this.ErrorPage(err)
			return
		}
		for _, log := range logsResp.Logs {
			logs = append(logs, maps.Map{
				"id":        log.Id,
				"level":     log.Level,
				"message":   log.Message,
				"createdAt": time.Unix(log.CreatedAt, 0).Format("2006-01-02 15:04:05"),
			})
		}
	}

	this.Data["nodes"] = nodes
	this.Data["tunnelNodeId"] = params.TunnelNodeId
	this.Data["logs"] = logs
	this.Data["page"] = params.Page
	this.Show()
}
