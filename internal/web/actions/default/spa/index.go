package spa

import (
	"os"

	"github.com/iwind/TeaGo/Tea"
	"github.com/iwind/TeaGo/actions"
)

type IndexAction actions.Action

func (this *IndexAction) RunGet() {
	filename := Tea.PublicFile("spa" + Tea.DS + "index.html")
	content, err := os.ReadFile(filename)
	if err != nil {
		this.WriteString("SPA not found")
		return
	}
	this.AddHeader("Content-Type", "text/html; charset=utf-8")
	this.Write(content)
}
