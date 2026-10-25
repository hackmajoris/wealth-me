package info

import (
	"encoding/json"
	"net/http"
)

// Info describes the running server instance.
type Info struct {
	DBPath string `json:"dbPath"`
}

// Handler serves read-only information about the server.
type Handler struct {
	info Info
}

// Option configures a Handler.
type Option func(*Handler)

// WithDBPath sets the database path reported to clients.
func WithDBPath(path string) Option {
	return func(h *Handler) { h.info.DBPath = path }
}

// NewHandler creates a new Handler.
func NewHandler(opts ...Option) *Handler {
	h := &Handler{}
	for _, opt := range opts {
		opt(h)
	}
	return h
}

// Get returns the server info.
func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(h.info) //nolint:errcheck
}
