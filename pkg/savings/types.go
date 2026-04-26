package savings

import "errors"

// ErrNotFound is returned when a savings entry is not found.
var ErrNotFound = errors.New("not found")

// Entry represents a monthly savings tracking entry.
type Entry struct {
	ID            int64   `json:"id"`
	Month         string  `json:"month"`
	MonthFull     string  `json:"monthFull"`
	Yr            int     `json:"yr"`
	Mo            string  `json:"mo"`
	NetIncome     float64 `json:"netIncome"`
	TotalExpenses float64 `json:"totalExpenses"`
	Savings       float64 `json:"savings"`
	SavingRate    float64 `json:"savingRate"`
	Target        float64 `json:"target"`
	Note          string  `json:"note"`
	UpdatedAt     string  `json:"updatedAt"`
}
