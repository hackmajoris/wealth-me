package assets

import "errors"

var ErrNotFound = errors.New("not found")

// HistoryPoint is a monthly total aggregated from AssetEntry records.
type HistoryPoint struct {
	Date       string  `json:"date"`
	TotalValue float64 `json:"totalValue"`
}

// AssetEntry is a single asset line item for a given month.
type AssetEntry struct {
	ID        int64   `json:"id"`
	Date      string  `json:"date"`
	Name      string  `json:"name"`
	Category  string  `json:"category"`
	Amount    float64 `json:"amount"`
	Note      string  `json:"note"`
	CreatedAt string  `json:"createdAt"`
}

// Asset is kept for backward compatibility with existing DB rows.
type Asset struct {
	ID            int64   `json:"id"`
	Name          string  `json:"name"`
	Category      string  `json:"category"`
	Value         float64 `json:"value"`
	PurchasePrice float64 `json:"purchasePrice"`
	PurchaseDate  string  `json:"purchaseDate"`
	Note          string  `json:"note"`
	CreatedAt     string  `json:"createdAt"`
	UpdatedAt     string  `json:"updatedAt"`
}
