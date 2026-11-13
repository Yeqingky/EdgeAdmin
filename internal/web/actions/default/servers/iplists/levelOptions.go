// Copyright 2021 GoEdge CDN goedge.cdn@gmail.com. All rights reserved.

package iplists

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/serverconfigs/firewallconfigs"
)

type LevelOptionsAction struct {
	actionutils.ParentAction
}

func (this *LevelOptionsAction) RunPost(params struct{}) {
	this.Data["levels"] = firewallconfigs.FindAllFirewallEventLevels()

	this.Success()
}
