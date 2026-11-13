package api

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/helpers"
	"github.com/iwind/TeaGo"
)

func init() {
	TeaGo.BeforeStart(func(server *TeaGo.Server) {
		server.
			Prefix("/api").
			Get("/login", new(LoginAction)).
			EndAll()

		server.
			Helper(helpers.NewUserMustAuth("")).
			Data("teaMenu", "").
			Prefix("/api").
			Get("/session", new(SessionAction)).
			EndAll()
	})
}
