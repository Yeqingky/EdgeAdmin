package accessLog

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/default/servers/groups/group/servergrouputils"
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
	this.SecondMenu("accessLog")
}

func (this *IndexAction) RunGet(params struct {
	GroupId int64
}) {
	_, err := servergrouputils.InitGroup(this.Parent(), params.GroupId, "accessLog")
	if err != nil {
		this.ErrorPage(err)
		return
	}

	// 获取配置
	webConfig, err := dao.SharedHTTPWebDAO.FindWebConfigWithServerGroupId(this.AdminContext(), params.GroupId)
	if err != nil {
		this.ErrorPage(err)
		return
	}
	this.Data["webId"] = webConfig.Id
	this.Data["accessLogConfig"] = webConfig.AccessLogRef

	// 通用变量
	this.Data["fields"] = serverconfigs.HTTPAccessLogFields
	this.Data["defaultFieldCodes"] = serverconfigs.HTTPAccessLogDefaultFieldsCodes

	this.Show()
}

func (this *IndexAction) RunPost(params struct {
	WebId         int64
	AccessLogJSON []byte

	Must *actions.Must
}) {
	// 日志
	defer this.CreateLogInfo(codes.ServerAccessLog_LogUpdateAccessLogSetting, params.WebId)

	// TODO 检查参数

	_, err := this.RPC().HTTPWebRPC().UpdateHTTPWebAccessLog(this.AdminContext(), &pb.UpdateHTTPWebAccessLogRequest{
		HttpWebId:     params.WebId,
		AccessLogJSON: params.AccessLogJSON,
	})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Success()
}
