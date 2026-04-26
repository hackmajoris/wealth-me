package settings

import (
	"encoding/json"
	"errors"
	"net/http"
)

// Handler handles HTTP requests for settings.
type Handler struct {
	store *Store
}

// NewHandler creates a new Handler.
func NewHandler(store *Store) *Handler {
	return &Handler{store: store}
}

// GetTarget returns the current savings target setting.
func (h *Handler) GetTarget(w http.ResponseWriter, r *http.Request) {
	setting, err := h.store.Get("savings_target")
	if errors.Is(err, ErrNotFound) {
		// Return default if not set
		writeJSON(w, http.StatusOK, Setting{Key: "savings_target", Value: 30})
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, setting)
}

// SetTarget updates the savings target setting.
func (h *Handler) SetTarget(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Value float64 `json:"value"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	setting, err := h.store.Set("savings_target", body.Value)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, setting)
}

// GetCurrency returns the current currency setting.
func (h *Handler) GetCurrency(w http.ResponseWriter, r *http.Request) {
	setting, err := h.store.GetString("currency")
	if errors.Is(err, ErrNotFound) {
		// Return default if not set
		writeJSON(w, http.StatusOK, StringSetting{Key: "currency", Value: "RON"})
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, setting)
}

// SetCurrency updates the currency setting.
func (h *Handler) SetCurrency(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Value string `json:"value"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	setting, err := h.store.SetString("currency", body.Value)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, setting)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v) //nolint:errcheck
}
