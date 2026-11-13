package spa

import "github.com/iwind/TeaGo"

func init() {
	TeaGo.BeforeStart(func(server *TeaGo.Server) {
		server.
			Prefix("/spa").
			Get("", new(IndexAction)).
			Get("/", new(IndexAction)).
			Get("/index.html", new(IndexAction)).
			EndAll()
	})
}
