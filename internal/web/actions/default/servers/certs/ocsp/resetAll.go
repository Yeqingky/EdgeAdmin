// Copyright 2022 GoEdge CDN goedge.cdn@gmail.com. All rights reserved.

package ocsp

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type ResetAllAction struct {
	actionutils.ParentAction
}

func (this *ResetAllAction) RunPost(params struct{}) {
	defer this.CreateLogInfo(codes.SSLCert_LogOCSPResetAllOCSPStatus)

	_, err := this.RPC().SSLCertRPC().ResetAllSSLCertsWithOCSPError(this.AdminContext(), &pb.ResetAllSSLCertsWithOCSPErrorRequest{})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Success()
}
