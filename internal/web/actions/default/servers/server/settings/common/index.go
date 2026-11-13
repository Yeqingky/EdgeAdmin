package common

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/dao"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
	"github.com/iwind/TeaGo/actions"
	"github.com/iwind/TeaGo/maps"
)

type IndexAction struct {
	actionutils.ParentAction
}

func (this *IndexAction) Init() {
	this.Nav("", "setting", "index")
	this.SecondMenu("common")
}

func (this *IndexAction) RunGet(params struct {
	ServerId int64
}) {
	// 只有HTTP服务才支持
	if this.FilterHTTPFamily() {
		return
	}

	this.Data["hasGroupConfig"] = false

	webConfig, err := dao.SharedHTTPWebDAO.FindWebConfigWithServerId(this.AdminContext(), params.ServerId)
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Data["webId"] = webConfig.Id

	this.Data["commonConfig"] = maps.Map{
		"mergeSlashes": webConfig.MergeSlashes,
	}

	this.Show()
}

func (this *IndexAction) RunPost(params struct {
	WebId        int64
	MergeSlashes bool

	Must *actions.Must
	CSRF *actionutils.CSRF
}) {
	defer this.CreateLogInfo(codes.ServerCommon_LogUpdateCommonSettings, params.WebId)

	_, err := this.RPC().HTTPWebRPC().UpdateHTTPWebCommon(this.AdminContext(), &pb.UpdateHTTPWebCommonRequest{
		HttpWebId:    params.WebId,
		MergeSlashes: params.MergeSlashes,
	})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Success()
}
