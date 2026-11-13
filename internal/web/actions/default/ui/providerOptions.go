// Copyright 2022 GoEdge CDN goedge.cdn@gmail.com. All rights reserved. Official site: https://goedge.cloud .

package ui

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
	"github.com/iwind/TeaGo/maps"
)

type ProviderOptionsAction struct {
	actionutils.ParentAction
}

func (this *ProviderOptionsAction) RunPost(params struct{}) {
	providersResp, err := this.RPC().RegionProviderRPC().FindAllRegionProviders(this.AdminContext(), &pb.FindAllRegionProvidersRequest{})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	var providerMaps = []maps.Map{}
	for _, provider := range providersResp.RegionProviders {
		if provider.Codes == nil {
			provider.Codes = []string{}
		}
		providerMaps = append(providerMaps, maps.Map{
			"id":    provider.Id,
			"name":  provider.Name,
			"codes": provider.Codes,
		})
	}
	this.Data["providers"] = providerMaps

	this.Success()
}
