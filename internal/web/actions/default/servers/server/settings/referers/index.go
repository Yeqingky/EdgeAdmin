package referers

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/dao"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
	"git.ovh.im/yeqing/EdgeCommon/pkg/serverconfigs"
	"github.com/iwind/TeaGo/actions"
)

type IndexAction struct {
	actionutils.ParentAction
}

func (this *IndexAction) Init() {
	this.Nav("", "setting", "index")
	this.SecondMenu("referer")
}

func (this *IndexAction) RunGet(params struct {
	ServerId int64
}) {
	// 只有HTTP服务才支持
	if this.FilterHTTPFamily() {
		return
	}

	this.Data["serverId"] = params.ServerId

	webConfig, err := dao.SharedHTTPWebDAO.FindWebConfigWithServerId(this.AdminContext(), params.ServerId)
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Data["webId"] = webConfig.Id

	var referersConfig = webConfig.Referers
	if referersConfig == nil {
		referersConfig = &serverconfigs.ReferersConfig{
			IsPrior:         false,
			IsOn:            false,
			AllowEmpty:      true,
			AllowSameDomain: true,
			AllowDomains:    nil,
			CheckOrigin:     true,
		}
	}

	this.Data["referersConfig"] = referersConfig

	this.Show()
}

func (this *IndexAction) RunPost(params struct {
	WebId        int64
	ReferersJSON []byte

	Must *actions.Must
	CSRF *actionutils.CSRF
}) {
	defer this.CreateLogInfo(codes.ServerReferer_LogUpdateReferers, params.WebId)

	_, err := this.RPC().HTTPWebRPC().UpdateHTTPWebReferers(this.AdminContext(), &pb.UpdateHTTPWebReferersRequest{
		HttpWebId:    params.WebId,
		ReferersJSON: params.ReferersJSON,
	})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Success()
}
