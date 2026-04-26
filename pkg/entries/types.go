package entries

import "errors"

// ErrNotFound is returned when an entry is not found.
var ErrNotFound = errors.New("not found")

// Entry represents a monthly investment tracking entry.
type Entry struct {
	ID             int64   `json:"id"`
	Month          string  `json:"month"`
	MonthFull      string  `json:"monthFull"`
	Yr             int     `json:"yr"`
	Mo             string  `json:"mo"`
	CryptoInvested float64 `json:"cryptoInvested"`
	CryptoReturn   float64 `json:"cryptoReturn"`
	StocksInvested float64 `json:"stocksInvested"`
	StocksReturn   float64 `json:"stocksReturn"`
	Note           string  `json:"note"`
	CreatedAt      string  `json:"createdAt"`
}
