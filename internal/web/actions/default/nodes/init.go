package nodes

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/configloaders"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/default/nodes/ipAddresses"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/helpers"
	"github.com/iwind/TeaGo"
)

func init() {
	TeaGo.BeforeStart(func(server *TeaGo.Server) {
		server.
			Helper(helpers.NewUserMustAuth(configloaders.AdminModuleCodeNode)).
			Helper(new(Helper)).
			Prefix("/nodes").
			Post("/delete", new(DeleteAction)).

			// IP地址
			GetPost("/ipAddresses/createPopup", new(ipAddresses.CreatePopupAction)).
			GetPost("/ipAddresses/updatePopup", new(ipAddresses.UpdatePopupAction)).

			EndAll()
	})
}
