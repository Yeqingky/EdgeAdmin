// Copyright 2021 GoEdge CDN goedge.cdn@gmail.com. All rights reserved.

package charts

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type DeleteAction struct {
	actionutils.ParentAction
}

func (this *DeleteAction) RunPost(params struct {
	ChartId int64
}) {
	defer this.CreateLogInfo(codes.MetricChart_LogDeleteMetricChart, params.ChartId)

	_, err := this.RPC().MetricChartRPC().DeleteMetricChart(this.AdminContext(), &pb.DeleteMetricChartRequest{MetricChartId: params.ChartId})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Success()
}
