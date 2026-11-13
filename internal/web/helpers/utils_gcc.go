//go:build gcc

package helpers

import (
	"net/http"

	"git.ovh.im/yeqing/EdgeAdmin/internal/waf/injectionutils"
)

// filter request
func safeFilterRequest(req *http.Request) bool {
	return !injectionutils.DetectXSS(req.RequestURI, false) && !injectionutils.DetectSQLInjection(req.RequestURI, false)
}
