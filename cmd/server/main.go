package main

import (
	"fmt"
	"io"
	"net"
	"net/http"
	"os"

	"github.com/hackmajoris/wealth-me/pkg/assets"
	"github.com/hackmajoris/wealth-me/pkg/benchmarks"
	"github.com/hackmajoris/wealth-me/pkg/config"
	"github.com/hackmajoris/wealth-me/pkg/crypto"
	"github.com/hackmajoris/wealth-me/pkg/database"
	"github.com/hackmajoris/wealth-me/pkg/debts"
	"github.com/hackmajoris/wealth-me/pkg/entries"
	"github.com/hackmajoris/wealth-me/pkg/info"
	"github.com/hackmajoris/wealth-me/pkg/logger"
	"github.com/hackmajoris/wealth-me/pkg/middleware"
	"github.com/hackmajoris/wealth-me/pkg/month"
	"github.com/hackmajoris/wealth-me/pkg/savings"
	"github.com/hackmajoris/wealth-me/pkg/settings"
	"github.com/hackmajoris/wealth-me/pkg/stocks"
	"github.com/hackmajoris/wealth-me/pkg/upload"
	"github.com/hackmajoris/wealth-me/pkg/web"
)

func main() {
	if err := run(os.Args[1:], os.Stdout); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func run(_ []string, out io.Writer) error {
	log := logger.New()

	cfg, err := config.Load()
	if err != nil {
		return err
	}

	db, err := database.Open(cfg.DBPath, cfg.DBKey, log)
	if err != nil {
		return err
	}
	defer func() { _ = db.Close() }()

	if err := database.Migrate(db); err != nil {
		return err
	}

	if err := fetchExchangeRates(db); err != nil {
		log.Warn("fetch exchange rates", "err", err)
	}

	if err := month.Init(db); err != nil {
		log.Warn("init month", "err", err)
	}

	// Wire services
	entriesStore := entries.New(db)
	entriesHandler := entries.NewHandler(entriesStore)

	savingsStore := savings.New(db)
	savingsHandler := savings.NewHandler(savingsStore)

	settingsStore := settings.New(db)
	settingsHandler := settings.NewHandler(settingsStore)

	assetsStore := assets.New(db)
	assetsHandler := assets.NewHandler(assetsStore)

	debtsStore := debts.New(db)
	debtsHandler := debts.NewHandler(debtsStore)

	uploadHandler := upload.NewHandler(entriesStore, savingsStore, assetsStore, debtsStore, log)
	stocksHandler := stocks.NewHandler(entriesStore)
	cryptoHandler := crypto.NewHandler(entriesStore)
	benchmarksHandler := benchmarks.NewHandler(db, entriesStore, log)
	infoHandler := info.NewHandler(info.WithDBPath(cfg.DBDisplayPath))

	// Register routes (Go 1.22 method+pattern routing)
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/entries", entriesHandler.List)
	mux.HandleFunc("POST /api/entries", entriesHandler.Create)
	mux.HandleFunc("GET /api/entries/{id}", entriesHandler.GetByID)
	mux.HandleFunc("PUT /api/entries/{id}", entriesHandler.Update)
	mux.HandleFunc("DELETE /api/entries/{id}", entriesHandler.Delete)

	mux.HandleFunc("GET /api/savings", savingsHandler.List)
	mux.HandleFunc("POST /api/savings", savingsHandler.Create)
	mux.HandleFunc("GET /api/savings/{id}", savingsHandler.GetByID)
	mux.HandleFunc("PUT /api/savings/{id}", savingsHandler.Update)
	mux.HandleFunc("DELETE /api/savings/{id}", savingsHandler.Delete)

	mux.HandleFunc("GET /api/settings/savings-target", settingsHandler.GetTarget)
	mux.HandleFunc("POST /api/settings/savings-target", settingsHandler.SetTarget)
	mux.HandleFunc("GET /api/settings/currency", settingsHandler.GetCurrency)
	mux.HandleFunc("POST /api/settings/currency", settingsHandler.SetCurrency)
	mux.HandleFunc("GET /api/settings/assets-currency", settingsHandler.GetAssetsCurrency)
	mux.HandleFunc("POST /api/settings/assets-currency", settingsHandler.SetAssetsCurrency)
	mux.HandleFunc("GET /api/settings/debts-currency", settingsHandler.GetDebtsCurrency)
	mux.HandleFunc("POST /api/settings/debts-currency", settingsHandler.SetDebtsCurrency)
	mux.HandleFunc("GET /api/settings/exchange-rates", settingsHandler.GetExchangeRates)

	mux.HandleFunc("GET /api/upload/csv/template", uploadHandler.HandleCSVTemplate)
	mux.HandleFunc("POST /api/upload/csv", uploadHandler.HandleCSV)
	mux.HandleFunc("GET /api/upload/savings-csv/template", uploadHandler.HandleSavingsCSVTemplate)
	mux.HandleFunc("POST /api/upload/savings-csv", uploadHandler.HandleSavingsCSV)
	mux.HandleFunc("GET /api/upload/asset-history-csv/template", uploadHandler.HandleAssetHistoryCSVTemplate)
	mux.HandleFunc("POST /api/upload/asset-history-csv", uploadHandler.HandleAssetHistoryCSV)
	mux.HandleFunc("GET /api/upload/debt-history-csv/template", uploadHandler.HandleDebtHistoryCSVTemplate)
	mux.HandleFunc("POST /api/upload/debt-history-csv", uploadHandler.HandleDebtHistoryCSV)

	mux.HandleFunc("POST /api/init-month", func(w http.ResponseWriter, r *http.Request) {
		if err := month.Init(db); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})

	mux.HandleFunc("GET /api/info", infoHandler.Get)

	mux.HandleFunc("GET /api/stocks", stocksHandler.Get)
	mux.HandleFunc("GET /api/crypto", cryptoHandler.Get)
	mux.HandleFunc("GET /api/benchmarks", benchmarksHandler.Get)

	mux.HandleFunc("GET /api/assets", assetsHandler.List)
	mux.HandleFunc("POST /api/assets", assetsHandler.Create)
	mux.HandleFunc("GET /api/assets/history", assetsHandler.History)
	mux.HandleFunc("POST /api/assets/snapshot", assetsHandler.Snapshot)
	mux.HandleFunc("GET /api/assets/{id}", assetsHandler.GetByID)
	mux.HandleFunc("PUT /api/assets/{id}", assetsHandler.Update)
	mux.HandleFunc("DELETE /api/assets/{id}", assetsHandler.Delete)

	mux.HandleFunc("GET /api/debts", debtsHandler.List)
	mux.HandleFunc("POST /api/debts", debtsHandler.Create)
	mux.HandleFunc("GET /api/debts/history", debtsHandler.History)
	mux.HandleFunc("POST /api/debts/snapshot", debtsHandler.Snapshot)
	mux.HandleFunc("GET /api/debts/{id}", debtsHandler.GetByID)
	mux.HandleFunc("PUT /api/debts/{id}", debtsHandler.Update)
	mux.HandleFunc("DELETE /api/debts/{id}", debtsHandler.Delete)
	mux.HandleFunc("GET /api/debt-entries", debtsHandler.ListEntries)
	mux.HandleFunc("POST /api/debt-entries", debtsHandler.CreateEntry)
	mux.HandleFunc("PUT /api/debt-entries/{id}", debtsHandler.UpdateEntry)
	mux.HandleFunc("DELETE /api/debt-entries/{id}", debtsHandler.DeleteEntry)

	mux.HandleFunc("GET /api/asset-entries", assetsHandler.ListEntries)
	mux.HandleFunc("POST /api/asset-entries", assetsHandler.CreateEntry)
	mux.HandleFunc("PUT /api/asset-entries/{id}", assetsHandler.UpdateEntry)
	mux.HandleFunc("DELETE /api/asset-entries/{id}", assetsHandler.DeleteEntry)

	mux.Handle("/", web.Handler())

	listener, err := net.Listen("tcp", ":"+cfg.Port)
	if err != nil {
		return fmt.Errorf("listen: %w", err)
	}

	actualPort := listener.Addr().(*net.TCPAddr).Port
	_, _ = fmt.Fprintf(out, "Server running on http://localhost:%d\n", actualPort)
	return http.Serve(listener, middleware.RequestLogger(log, mux))
}
