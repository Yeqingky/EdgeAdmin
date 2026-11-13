// Copyright 2022 GoEdge CDN goedge.cdn@gmail.com. All rights reserved. Official site: https://goedge.cloud .

package headers

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/serverconfigs"
)

type OptionsAction struct {
	actionutils.ParentAction
}

func (this *OptionsAction) RunPost(params struct {
	Type string
}) {
	if params.Type == "request" {
		this.Data["headers"] = serverconfigs.AllHTTPCommonRequestHeaders
	} else if params.Type == "response" {
		this.Data["headers"] = serverconfigs.AllHTTPCommonResponseHeaders
	} else {
		this.Data["headers"] = []string{}
	}

	this.Success()
}
