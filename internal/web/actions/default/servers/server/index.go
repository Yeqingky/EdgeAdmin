package server

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
)

// IndexAction 网站概览, 由前端 SPA 渲染
type IndexAction struct {
	actionutils.ParentAction
}

func (this *IndexAction) Init() {
	this.Nav("", "index", "index")
	this.SecondMenu("index")
}

func (this *IndexAction) RunGet(params struct {
	ServerId int64
}) {
	this.Show()
}
