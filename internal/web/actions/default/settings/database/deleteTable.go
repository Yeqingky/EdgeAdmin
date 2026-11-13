package database

import (
	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/langs/codes"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type DeleteTableAction struct {
	actionutils.ParentAction
}

func (this *DeleteTableAction) RunPost(params struct {
	Table string
}) {
	defer this.CreateLogInfo(codes.Database_LogDeleteTable, params.Table)

	_, err := this.RPC().DBRPC().DeleteDBTable(this.AdminContext(), &pb.DeleteDBTableRequest{DbTable: params.Table})
	if err != nil {
		this.ErrorPage(err)
		return
	}
	this.Success()
}
