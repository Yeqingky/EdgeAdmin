package rewrite

import (
	"encoding/json"

	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/dao"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
	"git.ovh.im/yeqing/EdgeCommon/pkg/serverconfigs"
)

type SortAction struct {
	actionutils.ParentAction
}

func (this *SortAction) RunPost(params struct {
	WebId          int64
	RewriteRuleIds []int64
}) {
	defer this.CreateLogInfo(codes.HTTPRewriteRule_LogSortRewriteRules, params.WebId)

	webConfig, err := dao.SharedHTTPWebDAO.FindWebConfigWithId(this.AdminContext(), params.WebId)
	if err != nil {
		this.ErrorPage(err)
		return
	}
	refsMap := map[int64]*serverconfigs.HTTPRewriteRef{}
	for _, ref := range webConfig.RewriteRefs {
		refsMap[ref.RewriteRuleId] = ref
	}
	newRefs := []*serverconfigs.HTTPRewriteRef{}
	for _, rewriteRuleId := range params.RewriteRuleIds {
		ref, ok := refsMap[rewriteRuleId]
		if ok {
			newRefs = append(newRefs, ref)
		}
	}
	refsJSON, err := json.Marshal(newRefs)
	if err != nil {
		this.ErrorPage(err)
		return
	}
	_, err = this.RPC().HTTPWebRPC().UpdateHTTPWebRewriteRules(this.AdminContext(), &pb.UpdateHTTPWebRewriteRulesRequest{
		HttpWebId:        params.WebId,
		RewriteRulesJSON: refsJSON,
	})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Success()
}
