package public

import (
	"context"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
	"github.com/iwind/TeaGo/Tea"
)

type DownloadAction struct {
	actionutils.ParentAction
}

func (this *DownloadAction) RunGet(params struct {
	Token string
	OS    string
	Arch  string
}) {
	rpcClient := this.RPC()
	nodeResp, err := rpcClient.TunnelNodeRPC().FindTunnelNodeWithToken(context.Background(), &pb.FindTunnelNodeWithTokenRequest{Token: params.Token})
	if err != nil || nodeResp.TunnelNode == nil || !nodeResp.TunnelNode.IsOn {
		http.Error(this.ResponseWriter, "invalid token", http.StatusUnauthorized)
		return
	}
	osName := params.OS
	if osName == "" {
		osName = nodeResp.TunnelNode.Os
	}
	arch := params.Arch
	if arch == "" {
		arch = nodeResp.TunnelNode.Arch
	}
	if osName != "linux" && osName != "windows" {
		http.Error(this.ResponseWriter, "unsupported os", http.StatusBadRequest)
		return
	}
	if arch != "amd64" && arch != "arm64" {
		http.Error(this.ResponseWriter, "unsupported arch", http.StatusBadRequest)
		return
	}
	name := "frpc-" + osName + "-" + arch
	if osName == "windows" {
		name += ".exe"
	}
	path := filepath.Join(Tea.Root, "edge-api", "deploy", name)
	file, err := os.Open(path)
	if err != nil {
		http.Error(this.ResponseWriter, "binary not found", http.StatusNotFound)
		return
	}
	defer file.Close()
	stat, err := file.Stat()
	if err != nil {
		http.Error(this.ResponseWriter, "binary not found", http.StatusNotFound)
		return
	}
	this.ResponseWriter.Header().Set("Content-Type", "application/octet-stream")
	this.ResponseWriter.Header().Set("Content-Length", strconv.FormatInt(stat.Size(), 10))
	this.ResponseWriter.Header().Set("Content-Disposition", "attachment; filename=\""+name+"\"")
	_, _ = io.Copy(this.ResponseWriter, file)
}
