package upload

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/hackmajoris/wealth-me/pkg/assets"
	"github.com/hackmajoris/wealth-me/pkg/debts"
	"github.com/hackmajoris/wealth-me/pkg/entries"
	"github.com/hackmajoris/wealth-me/pkg/savings"
)

var monthMap = map[string]string{
	"January":   "Jan",
	"February":  "Feb",
	"March":     "Mar",
	"April":     "Apr",
	"May":       "May",
	"June":      "Jun",
	"July":      "Jul",
	"August":    "Aug",
	"September": "Sep",
	"October":   "Oct",
	"November":  "Nov",
	"December":  "Dec",
}

// Handler handles CSV upload requests.
type Handler struct {
	entries *entries.Store
	savings *savings.Store
	assets  *assets.Store
	debts   *debts.Store
}

// NewHandler creates a new Handler.
func NewHandler(entriesStore *entries.Store, savingsStore *savings.Store, assetsStore *assets.Store, debtsStore *debts.Store) *Handler {
	return &Handler{entries: entriesStore, savings: savingsStore, assets: assetsStore, debts: debtsStore}
}

// HandleCSVTemplate responds with a downloadable CSV template.
func (h *Handler) HandleCSVTemplate(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", `attachment; filename="wealth-template.csv"`)
	wr := csv.NewWriter(w)
	_ = wr.Write([]string{"month", "year", "cryptoInvested", "cryptoReturn", "stockInvested", "stockReturn", "note"})
	_ = wr.Write([]string{"September", "2021", "2452", "1716", "0", "0", ""})
	wr.Flush()
}

// HandleCSV imports portfolio data from a multipart CSV upload.
// Expected columns: month, year, cryptoInvested, cryptoReturn, stockInvested, stockReturn, note
func (h *Handler) HandleCSV(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "invalid form", http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "missing file field", http.StatusBadRequest)
		return
	}
	defer func() { _ = file.Close() }()

	records, err := csv.NewReader(file).ReadAll()
	if err != nil {
		http.Error(w, fmt.Sprintf("invalid csv: %v", err), http.StatusBadRequest)
		return
	}
	if len(records) < 2 {
		http.Error(w, "csv must contain a header row and at least one data row", http.StatusBadRequest)
		return
	}

	// Build column index from header row.
	idx := make(map[string]int, len(records[0]))
	for i, h := range records[0] {
		idx[h] = i
	}
	required := []string{"month", "year", "cryptoInvested", "cryptoReturn", "stockInvested", "stockReturn"}
	for _, col := range required {
		if _, ok := idx[col]; !ok {
			http.Error(w, fmt.Sprintf("missing required column: %s", col), http.StatusBadRequest)
			return
		}
	}

	var imported []entries.Entry
	for i, rec := range records[1:] {
		monthName := strings.TrimSpace(field(rec, idx, "month"))
		yearStr := strings.TrimSpace(field(rec, idx, "year"))

		yr, err := strconv.Atoi(yearStr)
		if err != nil {
			http.Error(w, fmt.Sprintf("row %d: invalid year %q", i+2, yearStr), http.StatusBadRequest)
			return
		}

		mo, ok := monthMap[monthName]
		if !ok {
			http.Error(w, fmt.Sprintf("row %d: invalid month %q", i+2, monthName), http.StatusBadRequest)
			return
		}

		cryptoInv, err := strconv.ParseFloat(strings.ReplaceAll(strings.TrimSpace(field(rec, idx, "cryptoInvested")), ",", ""), 64)
		if err != nil {
			http.Error(w, fmt.Sprintf("row %d: invalid cryptoInvested", i+2), http.StatusBadRequest)
			return
		}
		cryptoRet, err := strconv.ParseFloat(strings.ReplaceAll(strings.TrimSpace(field(rec, idx, "cryptoReturn")), ",", ""), 64)
		if err != nil {
			http.Error(w, fmt.Sprintf("row %d: invalid cryptoReturn", i+2), http.StatusBadRequest)
			return
		}
		stockInv, err := strconv.ParseFloat(strings.ReplaceAll(strings.TrimSpace(field(rec, idx, "stockInvested")), ",", ""), 64)
		if err != nil {
			http.Error(w, fmt.Sprintf("row %d: invalid stockInvested", i+2), http.StatusBadRequest)
			return
		}
		stockRet, err := strconv.ParseFloat(strings.ReplaceAll(strings.TrimSpace(field(rec, idx, "stockReturn")), ",", ""), 64)
		if err != nil {
			http.Error(w, fmt.Sprintf("row %d: invalid stockReturn", i+2), http.StatusBadRequest)
			return
		}

		e, err := h.entries.Upsert(entries.Entry{
			Month:          mo + " " + yearStr,
			MonthFull:      monthName + " " + yearStr,
			Yr:             yr,
			Mo:             mo,
			CryptoInvested: cryptoInv,
			CryptoReturn:   cryptoRet,
			StocksInvested: stockInv,
			StocksReturn:   stockRet,
			Note:           strings.TrimSpace(field(rec, idx, "note")),
		})
		if err != nil {
			http.Error(w, fmt.Sprintf("row %d: %v", i+2, err), http.StatusInternalServerError)
			return
		}
		imported = append(imported, *e)
	}

	if imported == nil {
		imported = []entries.Entry{}
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(imported) //nolint:errcheck
}

// HandleSavingsCSVTemplate responds with a downloadable CSV template for savings data.
func (h *Handler) HandleSavingsCSVTemplate(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", `attachment; filename="savings-template.csv"`)
	wr := csv.NewWriter(w)
	_ = wr.Write([]string{"month", "year", "netIncome", "totalExpenses", "note"})
	_ = wr.Write([]string{"September", "2021", "5000", "3500", ""})
	wr.Flush()
}

// HandleSavingsCSV imports savings data from a multipart CSV upload.
// Expected columns: month, year, netIncome, totalExpenses, note
// Savings and savingRate are calculated on rendering.
func (h *Handler) HandleSavingsCSV(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "invalid form", http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "missing file field", http.StatusBadRequest)
		return
	}
	defer func() { _ = file.Close() }()

	records, err := csv.NewReader(file).ReadAll()
	if err != nil {
		http.Error(w, fmt.Sprintf("invalid csv: %v", err), http.StatusBadRequest)
		return
	}
	if len(records) < 2 {
		http.Error(w, "csv must contain a header row and at least one data row", http.StatusBadRequest)
		return
	}

	// Build column index from header row.
	idx := make(map[string]int, len(records[0]))
	for i, h := range records[0] {
		idx[h] = i
	}
	required := []string{"month", "year", "netIncome", "totalExpenses"}
	for _, col := range required {
		if _, ok := idx[col]; !ok {
			http.Error(w, fmt.Sprintf("missing required column: %s", col), http.StatusBadRequest)
			return
		}
	}

	var imported []savings.Entry
	for i, rec := range records[1:] {
		monthName := strings.TrimSpace(field(rec, idx, "month"))
		yearStr := strings.TrimSpace(field(rec, idx, "year"))

		yr, err := strconv.Atoi(yearStr)
		if err != nil {
			http.Error(w, fmt.Sprintf("row %d: invalid year %q", i+2, yearStr), http.StatusBadRequest)
			return
		}

		mo, ok := monthMap[monthName]
		if !ok {
			http.Error(w, fmt.Sprintf("row %d: invalid month %q", i+2, monthName), http.StatusBadRequest)
			return
		}

		netIncome, err := strconv.ParseFloat(strings.ReplaceAll(strings.TrimSpace(field(rec, idx, "netIncome")), ",", ""), 64)
		if err != nil {
			http.Error(w, fmt.Sprintf("row %d: invalid netIncome", i+2), http.StatusBadRequest)
			return
		}
		totalExpenses, err := strconv.ParseFloat(strings.ReplaceAll(strings.TrimSpace(field(rec, idx, "totalExpenses")), ",", ""), 64)
		if err != nil {
			http.Error(w, fmt.Sprintf("row %d: invalid totalExpenses", i+2), http.StatusBadRequest)
			return
		}

		saved := netIncome - totalExpenses
		var rate float64
		if netIncome > 0 {
			rate = (saved / netIncome) * 100
		}
		e, err := h.savings.Upsert(savings.Entry{
			Month:         mo + " " + yearStr,
			MonthFull:     monthName + " " + yearStr,
			Yr:            yr,
			Mo:            mo,
			NetIncome:     netIncome,
			TotalExpenses: totalExpenses,
			Savings:       saved,
			SavingRate:    rate,
			Target:        0,
			Note:          strings.TrimSpace(field(rec, idx, "note")),
		})
		if err != nil {
			http.Error(w, fmt.Sprintf("row %d: %v", i+2, err), http.StatusInternalServerError)
			return
		}
		imported = append(imported, *e)
	}

	if imported == nil {
		imported = []savings.Entry{}
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(imported) //nolint:errcheck
}

// HandleAssetHistoryCSVTemplate responds with a downloadable CSV template for asset entries.
func (h *Handler) HandleAssetHistoryCSVTemplate(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", `attachment; filename="asset-entries-template.csv"`)
	wr := csv.NewWriter(w)
	_ = wr.Write([]string{"month", "year", "name", "type", "amount"})
	_ = wr.Write([]string{"September", "2021", "Primary House", "Real Estate", "150000"})
	_ = wr.Write([]string{"September", "2021", "Car", "Vehicle", "25000"})
	wr.Flush()
}

// HandleAssetHistoryCSV imports asset entries from a multipart CSV upload.
// Expected columns: month, year, name, type, amount
func (h *Handler) HandleAssetHistoryCSV(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "invalid form", http.StatusBadRequest)
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "missing file field", http.StatusBadRequest)
		return
	}
	defer func() { _ = file.Close() }()

	records, err := csv.NewReader(file).ReadAll()
	if err != nil {
		http.Error(w, fmt.Sprintf("invalid csv: %v", err), http.StatusBadRequest)
		return
	}
	if len(records) < 2 {
		http.Error(w, "csv must contain a header row and at least one data row", http.StatusBadRequest)
		return
	}

	idx := make(map[string]int, len(records[0]))
	for i, col := range records[0] {
		idx[col] = i
	}
	for _, col := range []string{"month", "year", "name", "type", "amount"} {
		if _, ok := idx[col]; !ok {
			http.Error(w, fmt.Sprintf("missing required column: %s", col), http.StatusBadRequest)
			return
		}
	}

	count := 0
	for i, rec := range records[1:] {
		monthName := strings.TrimSpace(field(rec, idx, "month"))
		yearStr := strings.TrimSpace(field(rec, idx, "year"))
		mo, ok := monthMap[monthName]
		if !ok {
			http.Error(w, fmt.Sprintf("row %d: invalid month %q", i+2, monthName), http.StatusBadRequest)
			return
		}
		name := strings.TrimSpace(field(rec, idx, "name"))
		if name == "" {
			http.Error(w, fmt.Sprintf("row %d: name is required", i+2), http.StatusBadRequest)
			return
		}
		category := strings.TrimSpace(field(rec, idx, "type"))
		amount, err := strconv.ParseFloat(strings.ReplaceAll(strings.TrimSpace(field(rec, idx, "amount")), ",", ""), 64)
		if err != nil {
			http.Error(w, fmt.Sprintf("row %d: invalid amount", i+2), http.StatusBadRequest)
			return
		}
		label := mo + " " + yearStr
		if err := h.assets.UpsertEntry(assets.AssetEntry{Date: label, Name: name, Category: category, Amount: amount}); err != nil {
			http.Error(w, fmt.Sprintf("row %d: %v", i+2, err), http.StatusInternalServerError)
			return
		}
		count++
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]int{"imported": count}) //nolint:errcheck
}

// HandleDebtHistoryCSVTemplate responds with a downloadable CSV template for debt history.
func (h *Handler) HandleDebtHistoryCSVTemplate(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", `attachment; filename="debt-history-template.csv"`)
	wr := csv.NewWriter(w)
	_ = wr.Write([]string{"month", "year", "totalDebt"})
	_ = wr.Write([]string{"September", "2021", "25000"})
	wr.Flush()
}

// HandleDebtHistoryCSV imports debt history from a multipart CSV upload.
// Expected columns: month, year, totalDebt
func (h *Handler) HandleDebtHistoryCSV(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "invalid form", http.StatusBadRequest)
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "missing file field", http.StatusBadRequest)
		return
	}
	defer func() { _ = file.Close() }()

	records, err := csv.NewReader(file).ReadAll()
	if err != nil {
		http.Error(w, fmt.Sprintf("invalid csv: %v", err), http.StatusBadRequest)
		return
	}
	if len(records) < 2 {
		http.Error(w, "csv must contain a header row and at least one data row", http.StatusBadRequest)
		return
	}

	idx := make(map[string]int, len(records[0]))
	for i, col := range records[0] {
		idx[col] = i
	}
	for _, col := range []string{"month", "year", "totalDebt"} {
		if _, ok := idx[col]; !ok {
			http.Error(w, fmt.Sprintf("missing required column: %s", col), http.StatusBadRequest)
			return
		}
	}

	count := 0
	for i, rec := range records[1:] {
		monthName := strings.TrimSpace(field(rec, idx, "month"))
		yearStr := strings.TrimSpace(field(rec, idx, "year"))
		mo, ok := monthMap[monthName]
		if !ok {
			http.Error(w, fmt.Sprintf("row %d: invalid month %q", i+2, monthName), http.StatusBadRequest)
			return
		}
		totalDebt, err := strconv.ParseFloat(strings.ReplaceAll(strings.TrimSpace(field(rec, idx, "totalDebt")), ",", ""), 64)
		if err != nil {
			http.Error(w, fmt.Sprintf("row %d: invalid totalDebt", i+2), http.StatusBadRequest)
			return
		}
		label := mo + " " + yearStr
		if err := h.debts.UpsertEntry(debts.DebtEntry{Date: label, Name: "Historical", Category: "Historical", Amount: totalDebt}); err != nil {
			http.Error(w, fmt.Sprintf("row %d: %v", i+2, err), http.StatusInternalServerError)
			return
		}
		count++
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]int{"imported": count}) //nolint:errcheck
}

// field returns the value at the named column, or "" if the column or index is missing.
func field(rec []string, idx map[string]int, col string) string {
	i, ok := idx[col]
	if !ok || i >= len(rec) {
		return ""
	}
	return rec[i]
}
