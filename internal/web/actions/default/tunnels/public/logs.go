package public

import (
	"bufio"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type LogsAction struct {
	actionutils.ParentAction
}

func (this *LogsAction) RunPost(params struct {
	Token string
}) {
	scanner := bufio.NewScanner(io.LimitReader(this.Request.Body, 4<<20))
	scanner.Buffer(make([]byte, 4096), 64*1024)
	var logs []*pb.TunnelLog
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		var entry struct {
			Level   string `json:"level"`
			Message string `json:"message"`
		}
		if err := json.Unmarshal([]byte(line), &entry); err != nil {
			continue
		}
		level := entry.Level
		if level == "" {
			level = "info"
		}
		message := entry.Message
		if len(message) > 16384 {
			message = message[:16384]
		}
		logs = append(logs, &pb.TunnelLog{Level: level, Message: message})
		if len(logs) >= 1000 {
			break
		}
	}
	if len(logs) > 0 {
		_, err := this.RPC().TunnelNodeRPC().CreateTunnelLog(context.Background(), &pb.CreateTunnelLogRequest{
			Token: params.Token,
			Logs:  logs,
		})
		if err != nil {
			http.Error(this.ResponseWriter, err.Error(), http.StatusUnauthorized)
			return
		}
	}
	this.ResponseWriter.WriteHeader(http.StatusNoContent)
}
