// Copyright 2021 GoEdge CDN goedge.cdn@gmail.com. All rights reserved.

package charts

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/default/servers/metrics/charts/chartutils"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/default/servers/metrics/metricutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
	"git.ovh.im/yeqing/EdgeCommon/pkg/serverconfigs"
	"github.com/iwind/TeaGo/actions"
)

type UpdateAction struct {
	actionutils.ParentAction
}

func (this *UpdateAction) Init() {
	this.Nav("", "", "chart,chartUpdate")
}

func (this *UpdateAction) RunGet(params struct {
	ChartId int64
}) {
	chart, err := chartutils.InitChart(this.Parent(), params.ChartId)
	if err != nil {
		this.ErrorPage(err)
		return
	}

	_, err = metricutils.InitItem(this.Parent(), chart.MetricItem.Id)
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Data["types"] = serverconfigs.FindAllMetricChartTypes()

	this.Show()
}

func (this *UpdateAction) RunPost(params struct {
	ChartId         int64
	Name            string
	Type            string
	WidthDiv        int32
	MaxItems        int32
	IsOn            bool
	IgnoreEmptyKeys bool
	IgnoredKeys     []string

	Must *actions.Must
	CSRF *actionutils.CSRF
}) {
	defer this.CreateLogInfo(codes.MetricChart_LogUpdateMetricChart, params.ChartId)

	params.Must.
		Field("name", params.Name).
		Require("请输入图表名称").
		Field("type", params.Type).
		Require("请选择图表类型")

	_, err := this.RPC().MetricChartRPC().UpdateMetricChart(this.AdminContext(), &pb.UpdateMetricChartRequest{
		MetricChartId:   params.ChartId,
		Name:            params.Name,
		Type:            params.Type,
		WidthDiv:        params.WidthDiv,
		MaxItems:        params.MaxItems,
		ParamsJSON:      nil,
		IgnoreEmptyKeys: params.IgnoreEmptyKeys,
		IgnoredKeys:     params.IgnoredKeys,
		IsOn:            params.IsOn,
	})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Success()
}
