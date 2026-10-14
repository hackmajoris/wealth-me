package benchmarks

// BenchmarkData holds monthly cumulative ROI and per-year returns for S&P 500, Nasdaq and VWCE.
type BenchmarkData struct {
	Months           []string                   `json:"months"`
	SPXRoi           []*float64                 `json:"spxRoi"`
	NasdaqRoi        []*float64                 `json:"nasdaqRoi"`
	VWCERoi          []*float64                 `json:"vwceRoi"`
	YearlyBenchmarks map[string]YearlyBenchmark `json:"yearlyBenchmarks"`
}

// YearlyBenchmark holds the annual return for a single year (Dec→Dec, or Dec→latest for current year).
type YearlyBenchmark struct {
	SPXReturn    *float64 `json:"spxReturn"`
	NasdaqReturn *float64 `json:"nasdaqReturn"`
	VWCEReturn   *float64 `json:"vwceReturn"`
}
