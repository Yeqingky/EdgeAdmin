package configs

import (
	"os"

	"github.com/iwind/TeaGo/Tea"
	"gopkg.in/yaml.v3"
)

const (
	EnvDBHost     = "EDGE_DB_HOST"
	EnvDBPort     = "EDGE_DB_PORT"
	EnvDBUser     = "EDGE_DB_USER"
	EnvDBPassword = "EDGE_DB_PASSWORD"
	EnvDBName     = "EDGE_DB_NAME"
)

// GenerateDBConfigFromEnv 从环境变量生成 configs/api_db.yaml
func GenerateDBConfigFromEnv() error {
	host, ok := os.LookupEnv(EnvDBHost)
	if !ok || len(host) == 0 {
		return nil
	}

	var port = lookupEnv(EnvDBPort, "3306")
	var config = &SimpleDBConfig{
		User:     lookupEnv(EnvDBUser, "root"),
		Password: lookupEnv(EnvDBPassword, "123456"),
		Database: lookupEnv(EnvDBName, "db_edge"),
		Host:     host + ":" + port,
	}

	data, err := yaml.Marshal(config)
	if err != nil {
		return err
	}

	return os.WriteFile(Tea.ConfigFile("api_db.yaml"), data, 0666)
}

func lookupEnv(name string, defaultValue string) string {
	value, ok := os.LookupEnv(name)
	if !ok || len(value) == 0 {
		return defaultValue
	}
	return value
}
