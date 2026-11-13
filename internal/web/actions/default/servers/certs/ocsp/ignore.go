// Copyright 2022 GoEdge CDN goedge.cdn@gmail.com. All rights reserved.

package ocsp

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type IgnoreAction struct {
	actionutils.ParentAction
}

func (this *IgnoreAction) RunPost(params struct {
	CertIds []int64
}) {
	defer this.CreateLogInfo(codes.SSLCert_LogOCSPIgnoreOCSPStatus)

	_, err := this.RPC().SSLCertRPC().IgnoreSSLCertsWithOCSPError(this.AdminContext(), &pb.IgnoreSSLCertsWithOCSPErrorRequest{SslCertIds: params.CertIds})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Success()
}
