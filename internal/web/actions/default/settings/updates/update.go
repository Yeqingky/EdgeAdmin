// Copyright 2021 GoEdge CDN goedge.cdn@gmail.com. All rights reserved.

package updates

import (
	"encoding/json"

	teaconst "git.ovh.im/yeqing/EdgeAdmin/internal/const"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
	"git.ovh.im/yeqing/EdgeCommon/pkg/systemconfigs"
)

type UpdateAction struct {
	actionutils.ParentAction
}

func (this *UpdateAction) RunPost(params struct {
	AutoCheck bool
}) {
	defer this.CreateLogInfo(codes.AdminUpdate_LogUpdateCheckSettings)

	// 读取当前设置
	valueResp, err := this.RPC().SysSettingRPC().ReadSysSetting(this.AdminContext(), &pb.ReadSysSettingRequest{Code: systemconfigs.SettingCodeCheckUpdates})
	if err != nil {
		this.ErrorPage(err)
		return
	}
	var valueJSON = valueResp.ValueJSON
	var config = systemconfigs.NewCheckUpdatesConfig()
	if len(valueJSON) > 0 {
		err = json.Unmarshal(valueJSON, config)
		if err != nil {
			this.ErrorPage(err)
			return
		}
	}

	config.AutoCheck = params.AutoCheck

	configJSON, err := json.Marshal(config)
	if err != nil {
		this.ErrorPage(err)
		return
	}

	// 修改设置
	_, err = this.RPC().SysSettingRPC().UpdateSysSetting(this.AdminContext(), &pb.UpdateSysSettingRequest{
		Code:      systemconfigs.SettingCodeCheckUpdates,
		ValueJSON: configJSON,
	})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	// 重置状态
	if !config.AutoCheck {
		teaconst.NewVersionCode = ""
		teaconst.NewVersionDownloadURL = ""
	}

	this.Success()
}
