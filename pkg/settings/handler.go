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

// GetAssetsCurrency returns the current assets currency setting.
func (h *Handler) GetAssetsCurrency(w http.ResponseWriter, r *http.Request) {
	setting, err := h.store.GetString("assets_currency")
	if errors.Is(err, ErrNotFound) {
		writeJSON(w, http.StatusOK, StringSetting{Key: "assets_currency", Value: "RON"})
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, setting)
}

// SetAssetsCurrency updates the assets currency setting.
func (h *Handler) SetAssetsCurrency(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Value string `json:"value"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	setting, err := h.store.SetString("assets_currency", body.Value)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, setting)
}

// GetDebtsCurrency returns the current debts currency setting.
func (h *Handler) GetDebtsCurrency(w http.ResponseWriter, r *http.Request) {
	setting, err := h.store.GetString("debts_currency")
	if errors.Is(err, ErrNotFound) {
		writeJSON(w, http.StatusOK, StringSetting{Key: "debts_currency", Value: "RON"})
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, setting)
}

// SetDebtsCurrency updates the debts currency setting.
func (h *Handler) SetDebtsCurrency(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Value string `json:"value"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	setting, err := h.store.SetString("debts_currency", body.Value)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, setting)
}

// ExchangeRates represents currency exchange rates to RON.
type ExchangeRates struct {
	USDToRON float64 `json:"usdToRon"`
	EURToRON float64 `json:"eurToRon"`
}

// GetExchangeRates returns the current exchange rates.
func (h *Handler) GetExchangeRates(w http.ResponseWriter, r *http.Request) {
	usdToRon, err := h.store.Get("rate_usd_to_ron")
	eurToRon, err2 := h.store.Get("rate_eur_to_ron")

	rates := ExchangeRates{
		USDToRON: 4.35,
		EURToRON: 5.09,
	}

	if err == nil && usdToRon != nil {
		rates.USDToRON = usdToRon.Value
	}
	if err2 == nil && eurToRon != nil {
		rates.EURToRON = eurToRon.Value
	}

	writeJSON(w, http.StatusOK, rates)
}

// SetExchangeRates updates the exchange rates.
func (h *Handler) SetExchangeRates(w http.ResponseWriter, r *http.Request) {
	var body ExchangeRates
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	if _, err := h.store.Set("rate_usd_to_ron", body.USDToRON); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if _, err := h.store.Set("rate_eur_to_ron", body.EURToRON); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, body)
}

// GetSections returns the optional sections with their state and entry counts.
func (h *Handler) GetSections(w http.ResponseWriter, r *http.Request) {
	sections, err := h.store.Sections()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, sections)
}

// SetSection enables or disables one section.
func (h *Handler) SetSection(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID      string `json:"id"`
		Enabled bool   `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	sections, err := h.store.SetSectionEnabled(body.ID, body.Enabled)
	switch {
	case errors.Is(err, ErrUnknownSection):
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	case errors.Is(err, ErrSectionHasEntries):
		http.Error(w, "delete the section's entries before disabling it", http.StatusConflict)
		return
	case err != nil:
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, sections)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v) //nolint:errcheck
}
