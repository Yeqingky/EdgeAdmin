package db

import (
	"net/http"

	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/helpers"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"github.com/iwind/TeaGo/actions"
)

type Helper struct {
	helpers.LangHelper
}

func (this *Helper) BeforeAction(action *actions.ActionObject) {
	if action.Request.Method != http.MethodGet {
		return
	}

	action.Data["teaMenu"] = "db"

	var selectedTabbar = action.Data["mainTab"]

	var tabbar = actionutils.NewTabbar()
	tabbar.Add(this.Lang(action, codes.DBNode_TabNodes), "", "/db", "", selectedTabbar == "db")
	actionutils.SetTabbar(action, tabbar)
}
