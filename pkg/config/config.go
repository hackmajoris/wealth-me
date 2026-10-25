package config

import (
	"fmt"
	"os"
	"path/filepath"
)

type Config struct {
	DBPath string
	// DBDisplayPath is the DB location shown to users. Differs from DBPath
	// when running in a container, where DBPath is the in-container path.
	DBDisplayPath string
	DBKey         string
	Port          string
}

func Load() (*Config, error) {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		// macOS: ~/Library/Application Support, Linux: ~/.config, Windows: %AppData%.
		configDir, err := os.UserConfigDir()
		if err != nil {
			return nil, fmt.Errorf("get config dir: %w", err)
		}
		dbDir := filepath.Join(configDir, "WealthMe")
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

	displayPath := os.Getenv("DB_DISPLAY_PATH")
	if displayPath == "" {
		displayPath = dbPath
	}

	return &Config{
		DBPath:        dbPath,
		DBDisplayPath: displayPath,
		DBKey:         os.Getenv("DB_KEY"),
		Port:          port,
	}, nil
}
