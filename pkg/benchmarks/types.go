package benchmarks

// BenchmarkData holds monthly cumulative ROI for S&P 500 and Nasdaq,
// aligned to the same month labels used by the portfolio entries.
type BenchmarkData struct {
	Months    []string   `json:"months"`
	SPXRoi    []*float64 `json:"spxRoi"`
	NasdaqRoi []*float64 `json:"nasdaqRoi"`
}
