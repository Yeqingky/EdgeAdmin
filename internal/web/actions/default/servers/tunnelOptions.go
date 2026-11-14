package servers

import (
	"errors"

	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
	"github.com/iwind/TeaGo/maps"
)

type TunnelOptionsAction struct {
	actionutils.ParentAction
}

func (this *TunnelOptionsAction) RunGet(params struct {
	ServerId  int64
	ClusterId int64
	UserId    int64
}) {
	if params.ServerId > 0 {
		resp, err := this.RPC().ServerRPC().FindEnabledServer(this.AdminContext(), &pb.FindEnabledServerRequest{ServerId: params.ServerId})
		if err != nil {
			this.ErrorPage(err)
			return
		}
		if resp.Server == nil {
			this.ErrorPage(errors.New("server not found"))
			return
		}
		params.UserId = resp.Server.UserId
		if resp.Server.NodeCluster != nil {
			params.ClusterId = resp.Server.NodeCluster.Id
		}
	}
	if params.ServerId == 0 && params.UserId > 0 {
		resp, err := this.RPC().UserRPC().FindUserNodeClusterId(this.AdminContext(), &pb.FindUserNodeClusterIdRequest{UserId: params.UserId})
		if err != nil {
			this.ErrorPage(err)
			return
		}
		params.ClusterId = resp.NodeClusterId
	}

	options := []maps.Map{}
	const size int64 = 200
	for offset := int64(0); ; offset += size {
		resp, err := this.RPC().TunnelNodeRPC().ListTunnelNodes(this.AdminContext(), &pb.ListTunnelNodesRequest{
			ClusterId: params.ClusterId,
			UserId:    params.UserId,
			Offset:    offset,
			Size:      size,
		})
		if err != nil {
			this.ErrorPage(err)
			return
		}
		for _, node := range resp.TunnelNodes {
			if node.IsOn {
				options = append(options, maps.Map{"id": node.Id, "name": node.Name})
			}
		}
		if int64(len(resp.TunnelNodes)) < size {
			break
		}
	}
	this.Data["tunnels"] = options
	this.Show()
}
