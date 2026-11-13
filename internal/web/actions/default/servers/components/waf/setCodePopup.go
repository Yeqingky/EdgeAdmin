package waf

import (
	"encoding/json"

	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
	"git.ovh.im/yeqing/EdgeCommon/pkg/serverconfigs/firewallconfigs"
)

type SetCodePopupAction struct {
	actionutils.ParentAction
}

func (this *SetCodePopupAction) Init() {
	this.Nav("", "", "")
}

func (this *SetCodePopupAction) RunGet(params struct {
	SetId int64
}) {
	setResp, err := this.RPC().HTTPFirewallRuleSetRPC().FindEnabledHTTPFirewallRuleSetConfig(this.AdminContext(), &pb.FindEnabledHTTPFirewallRuleSetConfigRequest{FirewallRuleSetId: params.SetId})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	if len(setResp.FirewallRuleSetJSON) == 0 {
		this.NotFound("httpFirewallRuleSet", params.SetId)
		return
	}

	var ruleSet = &firewallconfigs.HTTPFirewallRuleSet{}
	err = json.Unmarshal(setResp.FirewallRuleSetJSON, ruleSet)
	if err != nil {
		this.ErrorPage(err)
		return
	}
	ruleSet.RuleRefs = nil
	ruleSet.Id = 0
	for _, rule := range ruleSet.Rules {
		rule.Id = 0
	}

	this.Data["setName"] = ruleSet.Name

	codeJSON, err := json.MarshalIndent(ruleSet, "", "  ")
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Data["code"] = string(codeJSON)

	this.Show()
}
