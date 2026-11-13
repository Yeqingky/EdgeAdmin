package origins

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type UpdateIsOnAction struct {
	actionutils.ParentAction
}

func (this *UpdateIsOnAction) RunPost(params struct {
	OriginId int64
	IsOn     bool
}) {
	defer this.CreateLogInfo(codes.ServerOrigin_LogUpdateOriginIsOn, params.OriginId)

	_, err := this.RPC().OriginRPC().UpdateOriginIsOn(this.AdminContext(), &pb.UpdateOriginIsOnRequest{
		OriginId: params.OriginId,
		IsOn:     params.IsOn,
	})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Success()
}
