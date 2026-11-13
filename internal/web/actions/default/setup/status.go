// Copyright 2021 GoEdge CDN goedge.cdn@gmail.com. All rights reserved.

package setup

import "git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"

var currentStatusText = ""

type StatusAction struct {
	actionutils.ParentAction
}

func (this *StatusAction) RunPost(params struct{}) {
	this.Data["statusText"] = currentStatusText
	this.Success()
}
