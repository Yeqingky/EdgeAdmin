package nodes

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
	"github.com/iwind/TeaGo/maps"
)

type CreateAction struct {
	actionutils.ParentAction
}

func (this *CreateAction) Init() {
	this.Nav("", "tunnel", "create")
}

func (this *CreateAction) RunGet(params struct{}) {
	clustersResp, err := this.RPC().NodeClusterRPC().FindAllEnabledNodeClusters(this.AdminContext(), &pb.FindAllEnabledNodeClustersRequest{})
	if err != nil {
		this.ErrorPage(err)
		return
	}
	clusters := []maps.Map{}
	for _, cluster := range clustersResp.NodeClusters {
		clusters = append(clusters, maps.Map{
			"id":   cluster.Id,
			"name": cluster.Name,
		})
	}

	usersResp, err := this.RPC().UserRPC().ListEnabledUsers(this.AdminContext(), &pb.ListEnabledUsersRequest{Size: 1000})
	if err != nil {
		this.ErrorPage(err)
		return
	}
	users := []maps.Map{}
	for _, user := range usersResp.Users {
		users = append(users, maps.Map{
			"id":       user.Id,
			"username": user.Username,
			"fullname": user.Fullname,
		})
	}

	var currentUserId int64
	adminResp, err := this.RPC().AdminRPC().FindEnabledAdmin(this.AdminContext(), &pb.FindEnabledAdminRequest{AdminId: this.AdminId()})
	if err == nil && adminResp.Admin != nil {
		currentUserId = adminResp.Admin.UserId
	}

	this.Data["clusters"] = clusters
	this.Data["users"] = users
	this.Data["currentUserId"] = currentUserId
	this.Show()
}

func (this *CreateAction) RunPost(params struct {
	Name       string
	ClusterId  int64
	UserId     int64
	ServerAddr string
	ServerPort int32
	OS         string
	Arch       string
}) {
	resp, err := this.RPC().TunnelNodeRPC().CreateTunnelNode(this.AdminContext(), &pb.CreateTunnelNodeRequest{
		Name:       params.Name,
		ClusterId:  params.ClusterId,
		UserId:     params.UserId,
		ServerAddr: params.ServerAddr,
		ServerPort: params.ServerPort,
		Os:         params.OS,
		Arch:       params.Arch,
	})
	if err != nil {
		this.Fail(err.Error())
		return
	}

	nodeResp, err := this.RPC().TunnelNodeRPC().FindTunnelNode(this.AdminContext(), &pb.FindTunnelNodeRequest{TunnelNodeId: resp.TunnelNodeId})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Data["node"] = maps.Map{
		"id":    resp.TunnelNodeId,
		"name":  params.Name,
		"token": resp.Token,
		"node":  nodeResp.TunnelNode,
	}
	this.Success()
}
