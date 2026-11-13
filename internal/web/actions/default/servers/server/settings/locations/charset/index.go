package charset

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/configutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/dao"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
	"github.com/iwind/TeaGo/actions"
)

type IndexAction struct {
	actionutils.ParentAction
}

func (this *IndexAction) Init() {
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
	this.Data["charsetConfig"] = webConfig.Charset

	this.Data["usualCharsets"] = configutils.UsualCharsets
	this.Data["allCharsets"] = configutils.AllCharsets

	this.Show()
}

func (this *IndexAction) RunPost(params struct {
	WebId       int64
	CharsetJSON []byte

	Must *actions.Must
}) {
	defer this.CreateLogInfo(codes.ServerCharset_LogUpdateCharsetSetting, params.WebId)

	_, err := this.RPC().HTTPWebRPC().UpdateHTTPWebCharset(this.AdminContext(), &pb.UpdateHTTPWebCharsetRequest{
		HttpWebId:   params.WebId,
		CharsetJSON: params.CharsetJSON,
	})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Success()
}
