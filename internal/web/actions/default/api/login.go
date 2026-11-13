package api

import (
	"fmt"
	"time"

	"git.ovh.im/yeqing/EdgeAdmin/internal/configloaders"
	teaconst "git.ovh.im/yeqing/EdgeAdmin/internal/const"
	"git.ovh.im/yeqing/EdgeAdmin/internal/setup"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/default/index"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/helpers"
	stringutil "github.com/iwind/TeaGo/utils/string"
)

type LoginAction struct {
	actionutils.ParentAction
}

func (this *LoginAction) Init() {
	this.Nav("", "", "")
}

func (this *LoginAction) RunGet(params struct {
	Auth *helpers.UserShouldAuth
}) {
	this.Data["isConfigured"] = setup.IsConfigured()
	this.Data["isNewInstalled"] = setup.IsNewInstalled()
	this.Data["isDemo"] = teaconst.IsDemoMode
	this.Data["isUser"] = params.Auth.IsUser()

	var timestamp = fmt.Sprintf("%d", time.Now().Unix())
	this.Data["token"] = stringutil.Md5(index.TokenKey+timestamp) + timestamp

	uiConfig, err := configloaders.LoadAdminUIConfig()
	if err != nil {
		this.Data["systemName"] = "GoEdge"
		this.Data["showVersion"] = true
		this.Data["version"] = teaconst.Version
	} else {
		this.Data["systemName"] = uiConfig.AdminSystemName
		this.Data["showVersion"] = uiConfig.ShowVersion
		if len(uiConfig.Version) > 0 {
			this.Data["version"] = uiConfig.Version
		} else {
			this.Data["version"] = teaconst.Version
		}
	}
	this.Show()
}
