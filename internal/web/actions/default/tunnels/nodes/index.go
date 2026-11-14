package nodes

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
	this.Nav("", "tunnel", "nodes")
}

func (this *IndexAction) RunGet(params struct {
	Page      int64
	Keyword   string
	ClusterId int64
	UserId    int64
}) {
	if params.Page <= 0 {
		params.Page = 1
	}
	size := int64(20)
	listResp, err := this.RPC().TunnelNodeRPC().ListTunnelNodes(this.AdminContext(), &pb.ListTunnelNodesRequest{
		Offset:    (params.Page - 1) * size,
		Size:      size,
		Keyword:   params.Keyword,
		ClusterId: params.ClusterId,
		UserId:    params.UserId,
	})
	if err != nil {
		this.ErrorPage(err)
		return
	}
	countResp, err := this.RPC().TunnelNodeRPC().CountTunnelNodes(this.AdminContext(), &pb.CountTunnelNodesRequest{
		Keyword:   params.Keyword,
		ClusterId: params.ClusterId,
		UserId:    params.UserId,
	})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	clustersResp, err := this.RPC().NodeClusterRPC().FindAllEnabledNodeClusters(this.AdminContext(), &pb.FindAllEnabledNodeClustersRequest{})
	if err != nil {
		this.ErrorPage(err)
		return
	}
	clusterNames := map[int64]string{}
	for _, cluster := range clustersResp.NodeClusters {
		clusterNames[cluster.Id] = cluster.Name
	}

	usersResp, err := this.RPC().UserRPC().ListEnabledUsers(this.AdminContext(), &pb.ListEnabledUsersRequest{Size: 1000})
	if err != nil {
		this.ErrorPage(err)
		return
	}
	userNames := map[int64]string{}
	for _, user := range usersResp.Users {
		userNames[user.Id] = user.Username
	}

	nodes := []maps.Map{}
	for _, node := range listResp.TunnelNodes {
		nodes = append(nodes, maps.Map{
			"id":            node.Id,
			"name":          node.Name,
			"token":         node.Token,
			"clusterId":     node.ClusterId,
			"clusterName":   clusterNames[node.ClusterId],
			"userId":        node.UserId,
			"userName":      userNames[node.UserId],
			"serverAddr":    node.ServerAddr,
			"serverPort":    node.ServerPort,
			"os":            node.Os,
			"arch":          node.Arch,
			"isOn":          node.IsOn,
			"isInstalled":   node.IsInstalled,
			"createdAt":     node.CreatedAt,
			"createdAtText": time.Unix(node.CreatedAt, 0).Format("2006-01-02 15:04:05"),
		})
	}

	this.Data["nodes"] = nodes
	this.Data["count"] = countResp.Count
	this.Data["page"] = params.Page
	this.Data["size"] = size
	this.Data["keyword"] = params.Keyword
	this.Data["clusterId"] = params.ClusterId
	this.Data["userId"] = params.UserId
	this.Show()
}
