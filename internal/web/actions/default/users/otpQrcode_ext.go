//go:build !plus

package users

import "git.ovh.im/yeqing/EdgeAdmin/internal/configloaders"

func (this *OtpQrcodeAction) findProductName() (string, error) {
	uiConfig, err := configloaders.LoadAdminUIConfig()
	if err != nil {
		return "", err
	}
	var productName = uiConfig.ProductName
	if len(productName) == 0 {
		productName = "GoEdge用户"
	}
	return productName, nil
}
