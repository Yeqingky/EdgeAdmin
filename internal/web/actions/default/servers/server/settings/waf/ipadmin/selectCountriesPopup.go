package ipadmin

import (
	"strings"

	"git.ovh.im/yeqing/EdgeAdmin/internal/utils"
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
	"github.com/iwind/TeaGo/lists"
	"github.com/iwind/TeaGo/maps"
)

type SelectCountriesPopupAction struct {
	actionutils.ParentAction
}

func (this *SelectCountriesPopupAction) Init() {
	this.Nav("", "", "")
}

func (this *SelectCountriesPopupAction) RunGet(params struct {
	Type               string
	SelectedCountryIds string
}) {
	this.Data["type"] = params.Type

	var selectedCountryIds = utils.SplitNumbers(params.SelectedCountryIds)

	countriesResp, err := this.RPC().RegionCountryRPC().FindAllRegionCountries(this.AdminContext(), &pb.FindAllRegionCountriesRequest{})
	if err != nil {
		this.ErrorPage(err)
		return
	}

	// special regions

	var countryMaps = []maps.Map{}
	for _, country := range countriesResp.RegionCountries {
		countryMaps = append(countryMaps, maps.Map{
			"id":        country.Id,
			"name":      country.DisplayName,
			"letter":    strings.ToUpper(string(country.Pinyin[0][0])),
			"pinyin":    country.Pinyin,
			"codes":     country.Codes,
			"isCommon":  country.IsCommon,
			"isChecked": lists.ContainsInt64(selectedCountryIds, country.Id),
		})
	}
	this.Data["countries"] = countryMaps

	this.Show()
}
