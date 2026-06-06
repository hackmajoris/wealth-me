package benchmarks

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"sort"
	"sync"
	"time"

	"github.com/hackmajoris/go-finance/pkg/yahoo"
	"github.com/hackmajoris/wealth-me/pkg/entries"
)

var moMap = map[string]int{
	"Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4,
	"May": 5, "Jun": 6, "Jul": 7, "Aug": 8,
	"Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}
var moNames = [...]string{"", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}

// Handler handles HTTP requests for benchmark data.
type Handler struct {
	db    *sql.DB
	store *entries.Store
	log   *slog.Logger
}

// NewHandler creates a new benchmarks handler.
func NewHandler(db *sql.DB, store *entries.Store, log *slog.Logger) *Handler {
	return &Handler{db: db, store: store, log: log}
}

type ym struct{ yr, mo int }
type cacheKey struct {
	symbol string
	yr, mo int
}

// Get returns cumulative benchmark ROI for all months present in portfolio entries.
func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	list, err := h.store.List()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	empty := &BenchmarkData{Months: []string{}, SPXRoi: []*float64{}, NasdaqRoi: []*float64{}}

	if len(list) == 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(empty) //nolint:errcheck
		return
	}

	// Build sorted, deduplicated (yr, mo) list from entries.
	seen := map[ym]bool{}
	var yms []ym
	for _, e := range list {
		moNum := moMap[e.Mo]
		if moNum == 0 {
			continue
		}
		k := ym{e.Yr, moNum}
		if !seen[k] {
			seen[k] = true
			yms = append(yms, k)
		}
	}
	sort.Slice(yms, func(i, j int) bool {
		if yms[i].yr != yms[j].yr {
			return yms[i].yr < yms[j].yr
		}
		return yms[i].mo < yms[j].mo
	})

	// Load cached closes from DB. Close cursor before any writes.
	cached := map[cacheKey]float64{}
	if rows, qErr := h.db.QueryContext(r.Context(), `SELECT symbol, year, month, close FROM benchmark_cache`); qErr == nil {
		for rows.Next() {
			var sym string
			var yr, mo int
			var cls float64
			if rows.Scan(&sym, &yr, &mo, &cls) == nil {
				cached[cacheKey{sym, yr, mo}] = cls
			}
		}
		_ = rows.Close()
	}

	// Determine which (symbol, month) pairs need fetching.
	// Current month is always refreshed; past months only if missing from cache.
	now := time.Now()
	curYr, curMo := now.Year(), int(now.Month())

	symbols := []string{"^GSPC", "^IXIC"}
	type fetchJob struct {
		sym    string
		yr, mo int
	}
	var missing []fetchJob
	for _, k := range yms {
		for _, sym := range symbols {
			_, inCache := cached[cacheKey{sym, k.yr, k.mo}]
			if !inCache || (k.yr == curYr && k.mo == curMo) {
				missing = append(missing, fetchJob{sym, k.yr, k.mo})
			}
		}
	}

	// Also ensure December closes for year boundaries:
	// Dec of each past year (for Dec→Dec annual returns) and Dec of (firstYear-1) as baseline.
	firstYr := yms[0].yr
	uniqueYears := map[int]bool{}
	for _, k := range yms {
		uniqueYears[k.yr] = true
	}
	decBoundaries := map[int]bool{firstYr - 1: true}
	for yr := range uniqueYears {
		if yr < curYr {
			decBoundaries[yr] = true
		}
	}
	for yr := range decBoundaries {
		for _, sym := range symbols {
			if _, ok := cached[cacheKey{sym, yr, 12}]; !ok {
				missing = append(missing, fetchJob{sym, yr, 12})
			}
		}
	}

	// Fetch via FetchMonthlyBar (v8 endpoint, no crumb, works in Docker).
	if len(missing) > 0 {
		h.log.Debug("fetching benchmark data from yahoo", "missing", len(missing))
		client, clientErr := yahoo.New()
		if clientErr == nil {
			ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
			defer cancel()

			type result struct {
				job   fetchJob
				close float64
				err   error
			}
			ch := make(chan result, len(missing))
			var wg sync.WaitGroup
			for _, job := range missing {
				wg.Add(1)
				go func(j fetchJob) {
					defer wg.Done()
					cls, fetchErr := client.FetchMonthlyBar(ctx, j.sym, j.yr, j.mo)
					ch <- result{j, cls, fetchErr}
				}(job)
			}
			wg.Wait()
			close(ch)

			// Persist successful fetches; fall back to cached value on failure.
			for res := range ch {
				if res.err != nil {
					h.log.Warn("benchmark fetch failed", "symbol", res.job.sym, "yr", res.job.yr, "mo", res.job.mo, "err", res.err)
					continue
				}
				if res.close == 0 {
					continue
				}
				cached[cacheKey{res.job.sym, res.job.yr, res.job.mo}] = res.close
				h.db.ExecContext(r.Context(), //nolint:errcheck
					`INSERT OR REPLACE INTO benchmark_cache (symbol, year, month, close) VALUES (?,?,?,?)`,
					res.job.sym, res.job.yr, res.job.mo, res.close)
			}
		}
	}

	// Build monthly response: cumulative ROI from first month's close (used by line charts).
	months := make([]string, len(yms))
	spxRoi := make([]*float64, len(yms))
	nasdaqRoi := make([]*float64, len(yms))

	var spxBase, nasdaqBase float64
	for i, k := range yms {
		months[i] = fmt.Sprintf("%s %d", moNames[k.mo], k.yr)

		spxClose := cached[cacheKey{"^GSPC", k.yr, k.mo}]
		nasdaqClose := cached[cacheKey{"^IXIC", k.yr, k.mo}]

		if i == 0 {
			spxBase = spxClose
			nasdaqBase = nasdaqClose
		}

		if spxClose > 0 && spxBase > 0 {
			v := (spxClose - spxBase) / spxBase * 100
			spxRoi[i] = &v
		}
		if nasdaqClose > 0 && nasdaqBase > 0 {
			v := (nasdaqClose - nasdaqBase) / nasdaqBase * 100
			nasdaqRoi[i] = &v
		}
	}

	// Build per-year benchmark returns: Dec(Y-1)→Dec(Y) for complete years,
	// Dec(Y-1)→latest for current year.
	yearlyBenchmarks := make(map[string]YearlyBenchmark, len(uniqueYears))
	for yr := range uniqueYears {
		prevDecSPX := cached[cacheKey{"^GSPC", yr - 1, 12}]
		prevDecNasdaq := cached[cacheKey{"^IXIC", yr - 1, 12}]

		var endSPX, endNasdaq float64
		if yr < curYr {
			endSPX = cached[cacheKey{"^GSPC", yr, 12}]
			endNasdaq = cached[cacheKey{"^IXIC", yr, 12}]
		} else {
			// Current year: walk back from current month to find latest cached close.
			for mo := curMo; mo >= 1; mo-- {
				if c := cached[cacheKey{"^GSPC", yr, mo}]; c > 0 {
					endSPX = c
					break
				}
			}
			for mo := curMo; mo >= 1; mo-- {
				if c := cached[cacheKey{"^IXIC", yr, mo}]; c > 0 {
					endNasdaq = c
					break
				}
			}
		}

		yb := YearlyBenchmark{}
		if endSPX > 0 && prevDecSPX > 0 {
			v := (endSPX/prevDecSPX - 1) * 100
			yb.SPXReturn = &v
		}
		if endNasdaq > 0 && prevDecNasdaq > 0 {
			v := (endNasdaq/prevDecNasdaq - 1) * 100
			yb.NasdaqReturn = &v
		}
		yearlyBenchmarks[fmt.Sprintf("%d", yr)] = yb
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(&BenchmarkData{ //nolint:errcheck
		Months:           months,
		SPXRoi:           spxRoi,
		NasdaqRoi:        nasdaqRoi,
		YearlyBenchmarks: yearlyBenchmarks,
	})
}
