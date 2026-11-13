package access

import (
	"encoding/json"

	teaconst "git.ovh.im/yeqing/EdgeAdmin/internal/const"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/dao"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
	"git.ovh.im/yeqing/EdgeCommon/pkg/serverconfigs"
	"github.com/iwind/TeaGo/actions"
	"github.com/iwind/TeaGo/lists"
)

type IndexAction struct {
	actionutils.ParentAction
}

func (this *IndexAction) Init() {
	this.Nav("", "setting", "index")
	this.SecondMenu("access")
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

	// 移除不存在的鉴权方法
	var allTypes = []string{}
	for _, def := range serverconfigs.FindAllHTTPAuthTypes(teaconst.Role) {
		allTypes = append(allTypes, def.Code)
	}

	if webConfig.Auth != nil {
		var refs = webConfig.Auth.PolicyRefs
		var realRefs = []*serverconfigs.HTTPAuthPolicyRef{}
		for _, ref := range refs {
			if ref.AuthPolicy == nil {
				continue
			}
			if !lists.ContainsString(allTypes, ref.AuthPolicy.Type) {
				continue
			}
			realRefs = append(realRefs, ref)
		}
		webConfig.Auth.PolicyRefs = realRefs
	}

	this.Data["authConfig"] = webConfig.Auth

	this.Show()
}

func (this *IndexAction) RunPost(params struct {
	WebId    int64
	AuthJSON []byte

	Must *actions.Must
}) {
	defer this.CreateLogInfo(codes.ServerAuth_LogUpdateHTTPAuthSettings, params.WebId)

	var authConfig = &serverconfigs.HTTPAuthConfig{}
	err := json.Unmarshal(params.AuthJSON, authConfig)
	if err != nil {
		this.ErrorPage(err)
		return
	}
	err = authConfig.Init()
	if err != nil {
		this.Fail("配置校验失败:" + err.Error())
	}

	// 保存之前删除多于的配置信息
	for _, ref := range authConfig.PolicyRefs {
		ref.AuthPolicy = nil
	}

	configJSON, err := json.Marshal(authConfig)
	if err != nil {
		this.ErrorPage(err)
		return
	}
	_, err = this.RPC().HTTPWebRPC().UpdateHTTPWebAuth(this.AdminContext(), &pb.UpdateHTTPWebAuthRequest{
		HttpWebId: params.WebId,
		AuthJSON:  configJSON,
	})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Success()
}
