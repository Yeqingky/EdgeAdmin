package iplistutils

import "regexp"

var ipListCodeRegexp = regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)

// ValidateIPListCode 校验IP名单代号格式
func ValidateIPListCode(code string) bool {
	return ipListCodeRegexp.MatchString(code)
}
