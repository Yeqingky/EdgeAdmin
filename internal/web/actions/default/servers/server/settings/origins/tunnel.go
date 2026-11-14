package origins

import (
	"errors"

	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

func validateTunnelForServer(action *actionutils.ParentAction, serverId, tunnelId int64) error {
	if tunnelId == 0 {
		return nil
	}
	if serverId <= 0 || tunnelId < 0 {
		return errors.New("请选择网站和隧道节点")
	}
	serverResp, err := action.RPC().ServerRPC().FindEnabledServer(action.AdminContext(), &pb.FindEnabledServerRequest{ServerId: serverId})
	if err != nil {
		return err
	}
	tunnelResp, err := action.RPC().TunnelNodeRPC().FindTunnelNode(action.AdminContext(), &pb.FindTunnelNodeRequest{TunnelNodeId: tunnelId})
	if err != nil {
		return err
	}
	server, tunnel := serverResp.Server, tunnelResp.TunnelNode
	if server == nil || server.NodeCluster == nil || tunnel == nil || !tunnel.IsOn ||
		server.NodeCluster.Id != tunnel.ClusterId || (server.UserId > 0 && server.UserId != tunnel.UserId) {
		return errors.New("隧道与网站的集群或所属用户不匹配")
	}
	return nil
}
