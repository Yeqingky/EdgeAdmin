package servers

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

// DeleteServersAction 删除一组网站
type DeleteServersAction struct {
	actionutils.ParentAction
}

func (this *DeleteServersAction) RunPost(params struct {
	ServerIds []int64
}) {
	defer this.CreateLogInfo(codes.Server_LogDeleteServers)

	_, err := this.RPC().ServerRPC().DeleteServers(this.AdminContext(), &pb.DeleteServersRequest{ServerIds: params.ServerIds})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Success()
}
