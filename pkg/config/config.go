package config

import (
	"fmt"
	"os"
	"path/filepath"
)

type Config struct {
	DBPath string
	DBKey  string
	Port   string
}

func Load() (*Config, error) {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return nil, fmt.Errorf("get home dir: %w", err)
		}
		dbDir := filepath.Join(home, "Library", "Mobile Documents", "com~apple~CloudDocs", "WealthMe")
		if err := os.MkdirAll(dbDir, 0o755); err != nil {
			return nil, fmt.Errorf("create db dir: %w", err)
		}
		dbPath = filepath.Join(dbDir, "wealth.db")
	} else {
		if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
			return nil, fmt.Errorf("create db dir: %w", err)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	return &Config{
		DBPath: dbPath,
		DBKey:  os.Getenv("DB_KEY"),
		Port:   port,
	}, nil
}
