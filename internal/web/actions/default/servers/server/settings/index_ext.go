//go:build !plus

package settings

import (
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
	"github.com/iwind/TeaGo/maps"
)

func (this *IndexAction) initUserPlan(server *pb.Server) {
	var userPlanMap = maps.Map{"id": server.UserPlanId, "dayTo": "", "plan": maps.Map{}}
	this.Data["userPlan"] = userPlanMap
}
