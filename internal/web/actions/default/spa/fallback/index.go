package fallback

import (
	"net/http"
	"strings"

	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
)

type IndexAction struct {
	actionutils.ParentAction
}

func (this *IndexAction) RunGet() {
	var path = this.Request.URL.Path
	if len(path) > 1 && strings.HasSuffix(path, "/") {
		var target = strings.TrimRight(path, "/")
		var query = this.Request.URL.Query()
		query.Del("path")
		if encodedQuery := query.Encode(); len(encodedQuery) > 0 {
			target += "?" + encodedQuery
		}
		http.Redirect(this.ResponseWriter, this.Request, target, http.StatusFound)
		return
	}
	actionutils.ServeSPA(&this.ActionObject)
}
