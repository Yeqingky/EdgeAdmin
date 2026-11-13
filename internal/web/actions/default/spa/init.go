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

		server.
			Get("/login", new(IndexAction)).
			Get("/users/create", new(IndexAction)).
			Get("/admins/create", new(IndexAction)).
			Get("/db/create", new(IndexAction)).
			EndAll()
	})
}
