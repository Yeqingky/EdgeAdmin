package accounts

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type DeleteAction struct {
	actionutils.ParentAction
}

func (this *DeleteAction) RunPost(params struct {
	AccountId int64
}) {
	defer this.CreateLogInfo(codes.ACMEProviderAccount_LogDeleteACMEProviderAccount, params.AccountId)

	_, err := this.RPC().ACMEProviderAccountRPC().DeleteACMEProviderAccount(this.AdminContext(), &pb.DeleteACMEProviderAccountRequest{AcmeProviderAccountId: params.AccountId})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Success()
}
