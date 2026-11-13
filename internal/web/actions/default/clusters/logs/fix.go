package logs

import (
	"strings"

	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/helpers"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
	"github.com/iwind/TeaGo/types"
)

type FixAction struct {
	actionutils.ParentAction
}

func (this *FixAction) RunPost(params struct {
	LogIds []int64
}) {
	var logIdStrings = []string{}
	for _, logId := range params.LogIds {
		logIdStrings = append(logIdStrings, types.String(logId))
	}

	defer this.CreateLogInfo(codes.NodeLog_LogFixNodeLogs, strings.Join(logIdStrings, ", "))

	_, err := this.RPC().NodeLogRPC().FixNodeLogs(this.AdminContext(), &pb.FixNodeLogsRequest{NodeLogIds: params.LogIds})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	// 通知左侧数字Badge更新
	helpers.NotifyNodeLogsCountChange()

	this.Success()
}
