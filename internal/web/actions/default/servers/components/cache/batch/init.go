package cache

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/configloaders"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/helpers"
	"github.com/iwind/TeaGo"
)

func init() {
	TeaGo.BeforeStart(func(server *TeaGo.Server) {
		server.
			Helper(helpers.NewUserMustAuth(configloaders.AdminModuleCodeServer)).
			Data("teaMenu", "servers").
			Data("teaSubMenu", "cacheBatch").
			Prefix("/servers/components/cache/batch").
			GetPost("", new(IndexAction)).
			GetPost("/fetch", new(FetchAction)).
			Get("/tasks", new(TasksAction)).
			GetPost("/task", new(TaskAction)).
			Post("/deleteTask", new(DeleteTaskAction)).
			Post("/resetTask", new(ResetTaskAction)).
			EndAll()
	})
}
