package security

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/helpers"
)

type DismissXFFPromptAction struct {
	actionutils.ParentAction
}

func (this *DismissXFFPromptAction) RunPost(params struct{}) {
	helpers.DisableXFFPrompt()

	this.Success()
}
