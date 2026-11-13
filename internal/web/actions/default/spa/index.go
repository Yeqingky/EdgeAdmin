package spa

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"github.com/iwind/TeaGo/actions"
)

type IndexAction actions.Action

func (this *IndexAction) RunGet() {
	actionutils.ServeSPA(&this.ActionObject)
}
