package helpers

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/configloaders"
	teaconst "git.ovh.im/yeqing/EdgeAdmin/internal/const"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs"
	"github.com/iwind/TeaGo/actions"
)

type LangHelper struct {
}

func (this *LangHelper) Lang(actionPtr actions.ActionWrapper, messageCode langs.MessageCode, args ...any) string {
	var langCode = configloaders.FindAdminLang(actionPtr.Object().Session().GetInt64(teaconst.SessionAdminId))
	if len(langCode) == 0 {
		langCode = langs.ParseLangFromAction(actionPtr)
	}
	return langs.Message(langCode, messageCode, args...)
}
