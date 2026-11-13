package domains

import (	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type RecoverAction struct {
	actionutils.ParentAction
}

func (this *RecoverAction) RunPost(params struct {
	DomainId int64
}) {
	// 记录日志
	defer this.CreateLogInfo(codes.DNS_LogRecoverDomain, params.DomainId)

	// 执行恢复
	_, err := this.RPC().DNSDomainRPC().RecoverDNSDomain(this.AdminContext(), &pb.RecoverDNSDomainRequest{DnsDomainId: params.DomainId})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Success()
}
