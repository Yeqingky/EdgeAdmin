package lang

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/configloaders"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type SwitchAction struct {
	actionutils.ParentAction
}

func (this *SwitchAction) Init() {
	this.Nav("", "", "")
}

func (this *SwitchAction) RunPost(params struct{}) {
	var langCode = this.LangCode()
	if len(langCode) == 0 || langCode == "zh-cn" {
		langCode = "en-us"
	} else {
		langCode = "zh-cn"
	}

	configloaders.UpdateAdminLang(this.AdminId(), langCode)

	_, err := this.RPC().AdminRPC().UpdateAdminLang(this.AdminContext(), &pb.UpdateAdminLangRequest{LangCode: langCode})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Success()
}
