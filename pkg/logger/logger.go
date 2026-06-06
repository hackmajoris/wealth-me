package logger

import (
	"log/slog"
	"os"
)

// New returns a slog.Logger configured from environment variables.
// LOG_FORMAT=json enables JSON output (default: text).
// LOG_LEVEL=debug enables debug output (default: info).
func New() *slog.Logger {
	level := slog.LevelInfo
	if os.Getenv("LOG_LEVEL") == "debug" {
		level = slog.LevelDebug
	}
	opts := &slog.HandlerOptions{Level: level}
	var h slog.Handler
	if os.Getenv("LOG_FORMAT") == "json" {
		h = slog.NewJSONHandler(os.Stderr, opts)
	} else {
		h = slog.NewTextHandler(os.Stderr, opts)
	}
	return slog.New(h)
}
