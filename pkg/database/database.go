package database

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"net/url"
	"os"
	"strings"

	_ "github.com/mutecomm/go-sqlcipher/v4"
)

// Open opens the database, encrypting it first if DBKey is set and the file is plaintext.
func Open(path, key string, log *slog.Logger) (*sql.DB, error) {
	if key != "" {
		if err := maybeEncryptExisting(path, key, log); err != nil {
			return nil, fmt.Errorf("encrypt existing db: %w", err)
		}
	}
	db, err := sql.Open("sqlite3", buildDSN(path, key))
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping database (wrong DB_KEY?): %w", err)
	}
	return db, nil
}

// Migrate runs schema migrations. Each statement is idempotent.
func Migrate(db *sql.DB) error {
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
		{"benchmark_cache", `CREATE TABLE IF NOT EXISTS benchmark_cache (
			symbol TEXT    NOT NULL,
			year   INTEGER NOT NULL,
			month  INTEGER NOT NULL,
			close  REAL    NOT NULL DEFAULT 0,
			PRIMARY KEY (symbol, year, month)
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
func maybeEncryptExisting(dbPath, key string, log *slog.Logger) error {
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		return nil
	}

	// Already encrypted with this key?
	enc, err := sql.Open("sqlite3", buildDSN(dbPath, key))
	if err != nil {
		return err
	}
	pingErr := enc.Ping()
	_ = enc.Close()
	if pingErr == nil {
		return nil
	}

	// Valid plaintext?
	plain, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return err
	}
	if err := plain.Ping(); err != nil {
		_ = plain.Close()
		return fmt.Errorf("db is neither plaintext nor decryptable with the given DB_KEY: %w", err)
	}

	log.Info("migrating database to encrypted format")

	encPath := dbPath + ".enc"
	plain.SetMaxOpenConns(1)

	ctx := context.Background()
	conn, err := plain.Conn(ctx)
	if err != nil {
		_ = plain.Close()
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
	_ = conn.Close()
	_ = plain.Close()

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

	log.Info("migration done", "backup", dbPath+".bak")
	return nil
}
