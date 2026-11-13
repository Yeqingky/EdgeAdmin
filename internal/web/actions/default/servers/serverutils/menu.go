//go:build !plus

package serverutils

import (
	"git.ovh.im/yeqing/EdgeCommon/pkg/serverconfigs"
	"github.com/iwind/TeaGo/actions"
	"github.com/iwind/TeaGo/maps"
)

func (this *ServerHelper) filterMenuItems(serverConfig *serverconfigs.ServerConfig, menuItems []maps.Map, serverIdString string, secondMenuItem string, actionPtr actions.ActionWrapper) []maps.Map {
	return menuItems
}

func (this *ServerHelper) filterMenuItems2(serverConfig *serverconfigs.ServerConfig, menuItems []maps.Map, serverIdString string, secondMenuItem string, actionPtr actions.ActionWrapper) []maps.Map {
	return menuItems
}

func (this *ServerHelper) filterMenuItems3(serverConfig *serverconfigs.ServerConfig, menuItems []maps.Map, serverIdString string, secondMenuItem string, actionPtr actions.ActionWrapper) []maps.Map {
	return menuItems
}
