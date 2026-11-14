package tunnels

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/configloaders"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/default/tunnels/logs"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/default/tunnels/nodes"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/default/tunnels/public"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/helpers"
	"github.com/iwind/TeaGo"
)

func init() {
	TeaGo.BeforeStart(func(server *TeaGo.Server) {
		server.
			Prefix("/tunnels").
			Get("/config", new(public.ConfigAction)).
			Get("/download", new(public.DownloadAction)).
			Get("/install", new(nodes.InstallAction)).
			Post("/logs", new(public.LogsAction)).
			EndAll()

		server.
			Helper(helpers.NewUserMustAuth(configloaders.AdminModuleCodeNode)).
			Prefix("/tunnels/nodes").
			Data("teaSubMenu", "tunnel").
			Get("", new(nodes.IndexAction)).
			GetPost("/create", new(nodes.CreateAction)).
			Post("/delete", new(nodes.DeleteAction)).
			Post("/updateInstalled", new(nodes.UpdateInstalledAction)).
			Get("/install", new(nodes.InstallAction)).
			Prefix("/tunnels/logs").
			Get("", new(logs.IndexAction))
	})
}
