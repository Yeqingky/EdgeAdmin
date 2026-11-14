package frp

import (
	"encoding/json"

	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/nodeconfigs"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type IndexAction struct {
	actionutils.ParentAction
}

func (this *IndexAction) Init() {
	this.Nav("", "setting", "")
	this.SecondMenu("frp")
}

func (this *IndexAction) RunGet(params struct {
	ClusterId int64
}) {
	resp, err := this.RPC().NodeClusterRPC().FindNodeClusterFRP(this.AdminContext(), &pb.FindNodeClusterFRPRequest{
		NodeClusterId: params.ClusterId,
	})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	var config = nodeconfigs.NewFRPConfig()
	if len(resp.FrpJSON) > 0 {
		err = json.Unmarshal(resp.FrpJSON, config)
		if err != nil {
			this.ErrorPage(err)
			return
		}
	}

	this.Data["frpConfig"] = config
	this.Show()
}

func (this *IndexAction) RunPost(params struct {
	ClusterId int64
	FrpJSON   []byte
}) {
	var config = nodeconfigs.NewFRPConfig()
	err := json.Unmarshal(params.FrpJSON, config)
	if err != nil {
		this.Fail("解析配置失败: " + err.Error())
		return
	}

	_, err = this.RPC().NodeClusterRPC().UpdateNodeClusterFRP(this.AdminContext(), &pb.UpdateNodeClusterFRPRequest{
		NodeClusterId: params.ClusterId,
		FrpJSON:       params.FrpJSON,
	})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	this.Success()
}
