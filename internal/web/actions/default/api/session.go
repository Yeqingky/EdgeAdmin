package api

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
)

type SessionAction struct {
	actionutils.ParentAction
}

func (this *SessionAction) Init() {
	this.Nav("", "", "")
}

func (this *SessionAction) RunGet() {
	this.Data["isAuthenticated"] = true
	this.Show()
}
