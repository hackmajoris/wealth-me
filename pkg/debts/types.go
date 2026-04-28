package debts

import "errors"

var ErrNotFound = errors.New("not found")

// HistoryPoint is a monthly total aggregated from DebtEntry records.
type HistoryPoint struct {
	Date      string  `json:"date"`
	TotalDebt float64 `json:"totalDebt"`
}

// DebtEntry is a single debt line item for a given month.
type DebtEntry struct {
	ID        int64   `json:"id"`
	Date      string  `json:"date"`
	Name      string  `json:"name"`
	Category  string  `json:"category"`
	Amount    float64 `json:"amount"`
	Currency  string  `json:"currency"`
	Note      string  `json:"note"`
	CreatedAt string  `json:"createdAt"`
}

// Debt represents a financial liability (credit card, loan, etc.).
type Debt struct {
	ID             int64   `json:"id"`
	Name           string  `json:"name"`
	Category       string  `json:"category"`
	Balance        float64 `json:"balance"`
	Limit          float64 `json:"limit"`
	InterestRate   float64 `json:"interestRate"`
	MinimumPayment float64 `json:"minimumPayment"`
	Note           string  `json:"note"`
	CreatedAt      string  `json:"createdAt"`
	UpdatedAt      string  `json:"updatedAt"`
}
