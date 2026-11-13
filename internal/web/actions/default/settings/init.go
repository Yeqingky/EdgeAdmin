package settings

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/configloaders"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/helpers"
	"github.com/iwind/TeaGo"
)

func init() {
	TeaGo.BeforeStart(func(server *TeaGo.Server) {
		server.
			Helper(helpers.NewUserMustAuth(configloaders.AdminModuleCodeSetting)).
			Helper(NewHelper()).
			Prefix("/settings").
			Get("", new(IndexAction)).
			Get("/advanced", new(AdvancedAction)).
			EndAll()
	})
}
