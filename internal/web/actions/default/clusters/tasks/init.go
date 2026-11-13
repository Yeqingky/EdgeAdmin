package tasks

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/configloaders"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/default/clusters/clusterutils"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/helpers"
	"github.com/iwind/TeaGo"
)

func init() {
	TeaGo.BeforeStart(func(server *TeaGo.Server) {
		server.
			Helper(helpers.NewUserMustAuth(configloaders.AdminModuleCodeNode)).
			Helper(clusterutils.NewClustersHelper()).
			Prefix("/clusters/tasks").
			GetPost("/listPopup", new(ListPopupAction)).
			Post("/check", new(CheckAction)).
			Post("/delete", new(DeleteAction)).
			Post("/deleteBatch", new(DeleteBatchAction)).
			Post("/deleteAll", new(DeleteAllAction)).

			EndAll()
	})
}
