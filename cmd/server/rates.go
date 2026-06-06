package main

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/hackmajoris/go-finance/pkg/yahoo"
)

// fetchExchangeRates fetches current exchange rates and stores them in the database.
// Uses FetchFXRates (v8 endpoint, no crumb) so it works in Docker.
func fetchExchangeRates(db *sql.DB) error {
	client, err := yahoo.New()
	if err != nil {
		return fmt.Errorf("create yahoo client: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rates, err := client.FetchFXRates(ctx, []string{"EUR", "USD"}, "RON")
	if err != nil {
		return fmt.Errorf("fetch FX rates: %w", err)
	}

	eurRate, ok := rates["EUR"]
	if !ok {
		return fmt.Errorf("EUR rate missing from response")
	}
	usdRate, ok := rates["USD"]
	if !ok {
		return fmt.Errorf("USD rate missing from response")
	}

	if _, err := db.Exec(`
		INSERT INTO settings (key, value) VALUES (?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
		"rate_eur_to_ron", eurRate); err != nil {
		return fmt.Errorf("store EUR-RON rate: %w", err)
	}

	if _, err := db.Exec(`
		INSERT INTO settings (key, value) VALUES (?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
		"rate_usd_to_ron", usdRate); err != nil {
		return fmt.Errorf("store USD-RON rate: %w", err)
	}

	return nil
}
