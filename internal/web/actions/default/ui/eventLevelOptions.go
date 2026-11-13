package ui

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/serverconfigs/firewallconfigs"
)

type EventLevelOptionsAction struct {
	actionutils.ParentAction
}

func (this *EventLevelOptionsAction) RunPost(params struct{}) {
	this.Data["eventLevels"] = firewallconfigs.FindAllFirewallEventLevels()

	this.Success()
}
