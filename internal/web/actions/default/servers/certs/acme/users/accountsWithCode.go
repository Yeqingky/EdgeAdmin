package users

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
	"github.com/iwind/TeaGo/maps"
)

type AccountsWithCodeAction struct {
	actionutils.ParentAction
}

func (this *AccountsWithCodeAction) RunPost(params struct {
	Code string
}) {
	accountsResp, err := this.RPC().ACMEProviderAccountRPC().FindAllACMEProviderAccountsWithProviderCode(this.AdminContext(), &pb.FindAllACMEProviderAccountsWithProviderCodeRequest{AcmeProviderCode: params.Code})
	if err != nil {
		this.ErrorPage(err)
		return
	}
	var accountMaps = []maps.Map{}
	for _, account := range accountsResp.AcmeProviderAccounts {
		accountMaps = append(accountMaps, maps.Map{
			"id":   account.Id,
			"name": account.Name,
		})
	}
	this.Data["accounts"] = accountMaps

	this.Success()
}
