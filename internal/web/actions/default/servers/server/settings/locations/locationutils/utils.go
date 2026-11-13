package locationutils

import (
	"context"
	"encoding/json"
	"errors"

	"git.ovh.im/yeqing/EdgeAdmin/internal/utils"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
	"git.ovh.im/yeqing/EdgeCommon/pkg/serverconfigs"
	"github.com/iwind/TeaGo/types"
)

// FindLocationConfig 查找路由规则配置
func FindLocationConfig(parentAction *actionutils.ParentAction, locationId int64) (locationConfig *serverconfigs.HTTPLocationConfig, isOk bool) {
	locationConfigResp, err := parentAction.RPC().HTTPLocationRPC().FindEnabledHTTPLocationConfig(parentAction.AdminContext(), &pb.FindEnabledHTTPLocationConfigRequest{LocationId: locationId})
	if err != nil {
		parentAction.ErrorPage(err)
		return
	}

	if utils.JSONIsNull(locationConfigResp.LocationJSON) {
		parentAction.ErrorPage(errors.New("location '" + types.String(locationId) + "' not found"))
		return
	}

	locationConfig = &serverconfigs.HTTPLocationConfig{}
	err = json.Unmarshal(locationConfigResp.LocationJSON, locationConfig)
	if err != nil {
		parentAction.ErrorPage(err)
		return
	}

	err = locationConfig.Init(context.TODO())
	if err != nil {
		parentAction.ErrorPage(err)
		return
	}

	isOk = true
	return
}
