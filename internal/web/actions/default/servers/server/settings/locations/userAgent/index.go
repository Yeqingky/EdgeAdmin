// Copyright 2021 GoEdge CDN goedge.cdn@gmail.com. All rights reserved.

package userAgent

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
	this.SecondMenu("userAgent")
}

func (this *IndexAction) RunGet(params struct {
	LocationId int64
}) {
	webConfig, err := dao.SharedHTTPWebDAO.FindWebConfigWithLocationId(this.AdminContext(), params.LocationId)
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Data["webId"] = webConfig.Id

	var userAgentConfig = webConfig.UserAgent
	if userAgentConfig == nil {
		userAgentConfig = serverconfigs.NewUserAgentConfig()
	}

	this.Data["userAgentConfig"] = userAgentConfig

	this.Show()
}

func (this *IndexAction) RunPost(params struct {
	WebId         int64
	UserAgentJSON []byte

	Must *actions.Must
	CSRF *actionutils.CSRF
}) {
	defer this.CreateLogInfo(codes.ServerUserAgent_LogUpdateUserAgents, params.WebId)

	_, err := this.RPC().HTTPWebRPC().UpdateHTTPWebUserAgent(this.AdminContext(), &pb.UpdateHTTPWebUserAgentRequest{
		HttpWebId:     params.WebId,
		UserAgentJSON: params.UserAgentJSON,
	})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Success()
}
