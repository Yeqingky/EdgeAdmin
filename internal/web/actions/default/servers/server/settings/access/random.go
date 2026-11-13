// Copyright 2022 GoEdge CDN goedge.cdn@gmail.com. All rights reserved. Official site: https://goedge.cloud .

package access

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"github.com/iwind/TeaGo/rands"
)

type RandomAction struct {
	actionutils.ParentAction
}

func (this *RandomAction) RunPost(params struct{}) {
	this.Data["random"] = rands.HexString(32)

	this.Success()
}
