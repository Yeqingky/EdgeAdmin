package public

import (
	"context"
	"net/http"
	"strconv"

	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type ConfigAction struct {
	actionutils.ParentAction
}

func (this *ConfigAction) RunGet(params struct {
	Token string
}) {
	rpcClient := this.RPC()
	if rpcClient == nil {
		http.Error(this.ResponseWriter, "rpc unavailable", http.StatusServiceUnavailable)
		return
	}
	resp, err := rpcClient.TunnelNodeRPC().FindTunnelNodeConfigWithToken(context.Background(), &pb.FindTunnelNodeConfigWithTokenRequest{
		Token:   params.Token,
		BaseURL: this.baseURL(),
	})
	if err != nil {
		http.Error(this.ResponseWriter, err.Error(), http.StatusUnauthorized)
		return
	}
	this.ResponseWriter.Header().Set("Content-Type", "application/json; charset=utf-8")
	this.ResponseWriter.Header().Set("X-Tunnel-Config-Version", strconv.FormatInt(resp.ConfigVersion, 10))
	_, _ = this.ResponseWriter.Write(resp.ConfigJSON)
}

func (this *ConfigAction) baseURL() string {
	scheme := "http"
	if this.Request.TLS != nil {
		scheme = "https"
	}
	if proto := this.Request.Header.Get("X-Forwarded-Proto"); proto != "" {
		scheme = proto
	}
	return scheme + "://" + this.Request.Host
}
