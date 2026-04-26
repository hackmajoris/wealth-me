package stocks

// StockData contains aggregated stock performance data.
type StockData struct {
	Months       []string   `json:"months"`
	Invested     []float64  `json:"invested"`
	Return       []float64  `json:"return"`
	Gain         []float64  `json:"gain"`
	ROI          []*float64 `json:"roi"`
	Allocation   []float64  `json:"allocation"`
	CurrentValue float64    `json:"currentValue"`
	TotalROI     *float64   `json:"totalRoi"`
}
