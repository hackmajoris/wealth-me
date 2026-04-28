package main

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/hackmajoris/wealth-me/pkg/assets"
	"github.com/hackmajoris/wealth-me/pkg/crypto"
	"github.com/hackmajoris/wealth-me/pkg/debts"
	"github.com/hackmajoris/wealth-me/pkg/entries"
	"github.com/hackmajoris/wealth-me/pkg/savings"
	"github.com/hackmajoris/wealth-me/pkg/settings"
	"github.com/hackmajoris/wealth-me/pkg/stocks"
	"github.com/hackmajoris/wealth-me/pkg/upload"
	"github.com/hackmajoris/wealth-me/pkg/web"
	_ "github.com/mutecomm/go-sqlcipher/v4"
)

func main() {
	if err := run(os.Args[1:], os.Stdout); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func run(args []string, out io.Writer) error {
	// DB_PATH env var overrides default. Falls back to iCloud Drive on macOS.
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return fmt.Errorf("get home dir: %w", err)
		}
		dbDir := filepath.Join(home, "Library", "Mobile Documents", "com~apple~CloudDocs", "WealthMe")
		if err := os.MkdirAll(dbDir, 0o755); err != nil {
			return fmt.Errorf("create db dir: %w", err)
		}
		dbPath = filepath.Join(dbDir, "wealth.db")
	} else {
		if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
			return fmt.Errorf("create db dir: %w", err)
		}
	}

	// DB_KEY enables SQLCipher AES-256 encryption. When set on an existing
	// plaintext database it is migrated in-place on first startup.
	dbKey := os.Getenv("DB_KEY")
	if dbKey != "" {
		if err := maybeEncryptExisting(dbPath, dbKey, out); err != nil {
			return fmt.Errorf("encrypt existing db: %w", err)
		}
	}

	db, err := sql.Open("sqlite3", buildDSN(dbPath, dbKey))
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		return fmt.Errorf("ping database (wrong DB_KEY?): %w", err)
	}

	if err := migrate(db); err != nil {
		return err
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

	uploadHandler := upload.NewHandler(entriesStore, savingsStore, assetsStore, debtsStore)
	stocksHandler := stocks.NewHandler(entriesStore)
	cryptoHandler := crypto.NewHandler(entriesStore)

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
	mux.HandleFunc("POST /api/settings/exchange-rates", settingsHandler.SetExchangeRates)

	mux.HandleFunc("GET /api/upload/csv/template", uploadHandler.HandleCSVTemplate)
	mux.HandleFunc("POST /api/upload/csv", uploadHandler.HandleCSV)
	mux.HandleFunc("GET /api/upload/savings-csv/template", uploadHandler.HandleSavingsCSVTemplate)
	mux.HandleFunc("POST /api/upload/savings-csv", uploadHandler.HandleSavingsCSV)
	mux.HandleFunc("GET /api/upload/asset-history-csv/template", uploadHandler.HandleAssetHistoryCSVTemplate)
	mux.HandleFunc("POST /api/upload/asset-history-csv", uploadHandler.HandleAssetHistoryCSV)
	mux.HandleFunc("GET /api/upload/debt-history-csv/template", uploadHandler.HandleDebtHistoryCSVTemplate)
	mux.HandleFunc("POST /api/upload/debt-history-csv", uploadHandler.HandleDebtHistoryCSV)

	mux.HandleFunc("GET /api/stocks", stocksHandler.Get)
	mux.HandleFunc("GET /api/crypto", cryptoHandler.Get)

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

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	listener, err := net.Listen("tcp", ":"+port)
	if err != nil {
		return fmt.Errorf("listen: %w", err)
	}

	fmt.Fprintf(out, "Server running on http://localhost:%d\n", listener.Addr().(*net.TCPAddr).Port)
	return http.Serve(listener, mux)
}

// migrate runs schema migrations. Each statement is idempotent.
func migrate(db *sql.DB) error {
	steps := []struct {
		name string
		sql  string
	}{
		{"entries", `CREATE TABLE IF NOT EXISTS entries (
			id              INTEGER PRIMARY KEY AUTOINCREMENT,
			month           TEXT    NOT NULL,
			month_full      TEXT    NOT NULL,
			yr              INTEGER NOT NULL,
			mo              TEXT    NOT NULL,
			crypto_invested REAL    NOT NULL DEFAULT 0,
			crypto_return   REAL    NOT NULL DEFAULT 0,
			stocks_invested REAL    NOT NULL DEFAULT 0,
			stocks_return   REAL    NOT NULL DEFAULT 0,
			note            TEXT    NOT NULL DEFAULT '',
			created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
			UNIQUE(yr, mo)
		)`},
		{"savings", `CREATE TABLE IF NOT EXISTS savings (
			id             INTEGER PRIMARY KEY AUTOINCREMENT,
			month          TEXT    NOT NULL,
			month_full     TEXT    NOT NULL,
			yr             INTEGER NOT NULL,
			mo             TEXT    NOT NULL,
			net_income     REAL    NOT NULL DEFAULT 0,
			total_expenses REAL    NOT NULL DEFAULT 0,
			savings        REAL    NOT NULL DEFAULT 0,
			saving_rate    REAL    NOT NULL DEFAULT 0,
			target         REAL    NOT NULL DEFAULT 0,
			note           TEXT    NOT NULL DEFAULT '',
			updated_at     TEXT    NOT NULL DEFAULT (datetime('now')),
			UNIQUE(yr, mo)
		)`},
		{"settings", `CREATE TABLE IF NOT EXISTS settings (
			key          TEXT PRIMARY KEY,
			value        REAL,
			value_string TEXT
		)`},
		{"settings_add_value_string", `ALTER TABLE settings ADD COLUMN value_string TEXT`},
		{"assets", `CREATE TABLE IF NOT EXISTS assets (
			id             INTEGER PRIMARY KEY AUTOINCREMENT,
			name           TEXT    NOT NULL,
			category       TEXT    NOT NULL DEFAULT '',
			value          REAL    NOT NULL DEFAULT 0,
			purchase_price REAL    NOT NULL DEFAULT 0,
			purchase_date  TEXT    NOT NULL DEFAULT '',
			note           TEXT    NOT NULL DEFAULT '',
			created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
			updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
		)`},
		{"asset_history", `CREATE TABLE IF NOT EXISTS asset_history (
			date        TEXT PRIMARY KEY,
			total_value REAL NOT NULL DEFAULT 0
		)`},
		{"debts", `CREATE TABLE IF NOT EXISTS debts (
			id              INTEGER PRIMARY KEY AUTOINCREMENT,
			name            TEXT    NOT NULL,
			category        TEXT    NOT NULL DEFAULT '',
			balance         REAL    NOT NULL DEFAULT 0,
			credit_limit    REAL    NOT NULL DEFAULT 0,
			interest_rate   REAL    NOT NULL DEFAULT 0,
			minimum_payment REAL    NOT NULL DEFAULT 0,
			note            TEXT    NOT NULL DEFAULT '',
			created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
			updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
		)`},
		{"debt_entries", `CREATE TABLE IF NOT EXISTS debt_entries (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			date       TEXT    NOT NULL,
			name       TEXT    NOT NULL DEFAULT '',
			category   TEXT    NOT NULL DEFAULT '',
			amount     REAL    NOT NULL DEFAULT 0,
			currency   TEXT    NOT NULL DEFAULT 'RON',
			note       TEXT    NOT NULL DEFAULT '',
			created_at TEXT    NOT NULL DEFAULT (datetime('now')),
			UNIQUE(date, name)
		)`},
		{"debt_entries_add_currency", `ALTER TABLE debt_entries ADD COLUMN currency TEXT NOT NULL DEFAULT 'RON'`},
		{"asset_entries", `CREATE TABLE IF NOT EXISTS asset_entries (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			date       TEXT    NOT NULL,
			name       TEXT    NOT NULL DEFAULT '',
			category   TEXT    NOT NULL DEFAULT '',
			amount     REAL    NOT NULL DEFAULT 0,
			note       TEXT    NOT NULL DEFAULT '',
			created_at TEXT    NOT NULL DEFAULT (datetime('now')),
			UNIQUE(date, name)
		)`},
	}
	for _, s := range steps {
		if _, err := db.Exec(s.sql); err != nil {
			if strings.Contains(err.Error(), "duplicate column name") {
				continue
			}
			return fmt.Errorf("migrate %s: %w", s.name, err)
		}
	}
	return nil
}

// buildDSN returns a SQLite/SQLCipher DSN. Without a key it opens unencrypted.
func buildDSN(dbPath, key string) string {
	if key == "" {
		return dbPath
	}
	return "file:" + url.PathEscape(dbPath) +
		"?_pragma_key=" + url.QueryEscape(key) +
		"&_pragma_cipher_page_size=4096"
}

func sqlLiteral(s string) string {
	return strings.ReplaceAll(s, "'", "''")
}

// maybeEncryptExisting migrates a plaintext database to SQLCipher in-place.
// It is a no-op when the file does not exist or is already encrypted.
func maybeEncryptExisting(dbPath, key string, out io.Writer) error {
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		return nil
	}

	// Already encrypted with this key?
	enc, err := sql.Open("sqlite3", buildDSN(dbPath, key))
	if err != nil {
		return err
	}
	pingErr := enc.Ping()
	enc.Close()
	if pingErr == nil {
		return nil
	}

	// Valid plaintext?
	plain, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return err
	}
	if err := plain.Ping(); err != nil {
		plain.Close()
		return fmt.Errorf("db is neither plaintext nor decryptable with the given DB_KEY: %w", err)
	}

	fmt.Fprintln(out, "info: migrating database to encrypted format...")

	encPath := dbPath + ".enc"
	plain.SetMaxOpenConns(1)

	ctx := context.Background()
	conn, err := plain.Conn(ctx)
	if err != nil {
		plain.Close()
		return fmt.Errorf("acquire db connection: %w", err)
	}

	attachSQL := fmt.Sprintf(`ATTACH DATABASE '%s' AS enc KEY '%s'`, sqlLiteral(encPath), sqlLiteral(key))
	_, err = conn.ExecContext(ctx, attachSQL)
	if err == nil {
		_, err = conn.ExecContext(ctx, `SELECT sqlcipher_export('enc')`)
	}
	if err == nil {
		_, err = conn.ExecContext(ctx, `DETACH DATABASE enc`)
	}
	conn.Close()
	plain.Close()

	if err != nil {
		_ = os.Remove(encPath)
		return fmt.Errorf("export to encrypted db: %w", err)
	}

	if err = os.Rename(dbPath, dbPath+".bak"); err != nil {
		_ = os.Remove(encPath)
		return fmt.Errorf("backup original db: %w", err)
	}
	if err = os.Rename(encPath, dbPath); err != nil {
		_ = os.Rename(dbPath+".bak", dbPath)
		return fmt.Errorf("replace with encrypted db: %w", err)
	}

	fmt.Fprintf(out, "info: migration done; original backed up at %s.bak\n", dbPath)
	return nil
}
