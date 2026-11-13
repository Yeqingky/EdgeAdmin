package database

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/configloaders"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/default/settings/settingutils"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/helpers"
	"github.com/iwind/TeaGo"
)

func init() {
	TeaGo.BeforeStart(func(server *TeaGo.Server) {
		server.
			Helper(helpers.NewUserMustAuth(configloaders.AdminModuleCodeSetting)).
			Helper(settingutils.NewAdvancedHelper("database")).
			Prefix("/settings/database").
			Get("", new(IndexAction)).
			GetPost("/clean", new(CleanAction)).
			GetPost("/cleanSetting", new(CleanSettingAction)).
			GetPost("/truncateTable", new(TruncateTableAction)).
			GetPost("/deleteTable", new(DeleteTableAction)).
			EndAll()
	})
}
