package fallback

import "github.com/iwind/TeaGo"

func init() {
	TeaGo.BeforeStart(func(server *TeaGo.Server) {
		for _, prefix := range []string{
			"/about",
			"/admins",
			"/clusters",
			"/dashboard",
			"/db",
			"/dns",
			"/log",
			"/messages",
			"/nodes",
			"/origins",
			"/recover",
			"/servers",
			"/settings",
			"/ui",
			"/users",
		} {
			server.
				Prefix(prefix).
				Get("/:path(.*)", new(IndexAction)).
				EndAll()
		}
	})
}
