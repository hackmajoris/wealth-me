package stocks

import (
	"encoding/json"
	"net/http"

	"github.com/hackmajoris/wealth-me/pkg/entries"
)

// Handler handles HTTP requests for stocks data.
type Handler struct {
	store *entries.Store
}

// NewHandler creates a new stocks handler.
func NewHandler(store *entries.Store) *Handler {
	return &Handler{store: store}
}

// Get returns aggregated stocks performance data.
func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	list, err := h.store.List()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	data := aggregateData(list)
	if data == nil {
		data = &StockData{
			Months:     []string{},
			Invested:   []float64{},
			Return:     []float64{},
			Gain:       []float64{},
			ROI:        []*float64{},
			Allocation: []float64{},
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(data) //nolint:errcheck
}

func aggregateData(list []entries.Entry) *StockData {
	if len(list) == 0 {
		return nil
	}

	// Return all entries (stocks data is part of full portfolio)
	filtered := list

	if len(filtered) == 0 {
		return nil
	}

	var months []string
	var invested []float64
	var ret []float64
	var gain []float64
	var roi []*float64

	totalValue := 0.0

	for _, e := range filtered {
		months = append(months, e.Month)
		invested = append(invested, e.StocksInvested)
		ret = append(ret, e.StocksReturn)

		g := e.StocksReturn - e.StocksInvested
		gain = append(gain, g)

		if e.StocksInvested > 0 {
			r := (g / e.StocksInvested) * 100
			roi = append(roi, &r)
		} else {
			roi = append(roi, nil)
		}

		totalValue = e.StocksReturn
	}

	// Calculate allocation (percentage of total portfolio value at each point)
	allocation := calculateAllocation(filtered)

	var totalRoi *float64
	if len(filtered) > 0 && filtered[len(filtered)-1].StocksInvested > 0 {
		lastEntry := filtered[len(filtered)-1]
		totalG := lastEntry.StocksReturn - lastEntry.StocksInvested
		r := (totalG / lastEntry.StocksInvested) * 100
		totalRoi = &r
	}

	return &StockData{
		Months:       months,
		Invested:     invested,
		Return:       ret,
		Gain:         gain,
		ROI:          roi,
		Allocation:   allocation,
		CurrentValue: totalValue,
		TotalROI:     totalRoi,
	}
}

func calculateAllocation(list []entries.Entry) []float64 {
	if len(list) == 0 {
		return []float64{}
	}

	allocation := make([]float64, len(list))
	for i, e := range list {
		total := e.StocksReturn + e.CryptoReturn
		if total > 0 {
			allocation[i] = (e.StocksReturn / total) * 100
		}
	}
	return allocation
}
