package messages

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/configloaders"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/helpers"
	"github.com/iwind/TeaGo"
)

func init() {
	TeaGo.BeforeStart(func(server *TeaGo.Server) {
		server.
			Helper(helpers.NewUserMustAuth(configloaders.AdminModuleCodeCommon)).
			Helper(new(Helper)).
			Prefix("/messages").
			GetPost("", new(IndexAction)).
			Post("/badge", new(BadgeAction)).
			Post("/readAll", new(ReadAllAction)).
			Post("/readPage", new(ReadPageAction)).
			EndAll()
	})
}
