package clusters

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
	"github.com/iwind/TeaGo/maps"
)

type NodeOptionsAction struct {
	actionutils.ParentAction
}

func (this *NodeOptionsAction) RunPost(params struct {
	ClusterId int64
}) {
	resp, err := this.RPC().NodeRPC().FindAllEnabledNodesWithNodeClusterId(this.AdminContext(), &pb.FindAllEnabledNodesWithNodeClusterIdRequest{NodeClusterId: params.ClusterId})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	var nodeMaps = []maps.Map{}
	for _, node := range resp.Nodes {
		nodeMaps = append(nodeMaps, maps.Map{
			"id":   node.Id,
			"name": node.Name,
		})
	}
	this.Data["nodes"] = nodeMaps

	this.Success()
}
