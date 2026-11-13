package admins

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/configloaders"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/default/admins/accesskeys"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/helpers"
	"github.com/iwind/TeaGo"
)

func init() {
	TeaGo.BeforeStart(func(server *TeaGo.Server) {
		server.
			Helper(helpers.NewUserMustAuth(configloaders.AdminModuleCodeAdmin)).
			Data("teaMenu", "admins").
			Prefix("/admins").
			Get("", new(IndexAction)).
			GetPost("/createPopup", new(CreatePopupAction)).
			GetPost("/update", new(UpdateAction)).
			Post("/delete", new(DeleteAction)).
			Get("/admin", new(AdminAction)).
			Get("/otpQrcode", new(OtpQrcodeAction)).
			Post("/options", new(OptionsAction)).

			// AccessKeys
			Prefix("/admins/accesskeys").
			Get("", new(accesskeys.IndexAction)).
			GetPost("/createPopup", new(accesskeys.CreatePopupAction)).
			Post("/delete", new(accesskeys.DeleteAction)).
			Post("/updateIsOn", new(accesskeys.UpdateIsOnAction)).


			EndAll()
	})
}
