package headers

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/configloaders"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/default/servers/serverutils"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/helpers"
	"github.com/iwind/TeaGo"
)

func init() {
	TeaGo.BeforeStart(func(server *TeaGo.Server) {
		server.
			Helper(helpers.NewUserMustAuth(configloaders.AdminModuleCodeServer)).
			Helper(serverutils.NewServerHelper()).
			Prefix("/servers/server/settings/headers").
			Get("", new(IndexAction)).
			GetPost("/createSetPopup", new(CreateSetPopupAction)).
			GetPost("/updateSetPopup", new(UpdateSetPopupAction)).
			GetPost("/createDeletePopup", new(CreateDeletePopupAction)).
			Post("/deleteDeletingHeader", new(DeleteDeletingHeaderAction)).
			GetPost("/createNonStandardPopup", new(CreateNonStandardPopupAction)).
			Post("/deleteNonStandardHeader", new(DeleteNonStandardHeaderAction)).
			Post("/delete", new(DeleteAction)).
			GetPost("/updateCORSPopup", new(UpdateCORSPopupAction)).
			EndAll()
	})
}
