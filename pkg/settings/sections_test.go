package settings_test

import (
	"database/sql"
	"errors"
	"io"
	"log/slog"
	"path/filepath"
	"testing"

	"github.com/hackmajoris/wealth-me/pkg/database"
	"github.com/hackmajoris/wealth-me/pkg/settings"
)

func openDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := database.Open(filepath.Join(t.TempDir(), "test.db"), "", slog.New(slog.NewTextHandler(io.Discard, nil)))
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	if err := database.Migrate(db); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

func TestSetSectionEnabled(t *testing.T) {
	tests := []struct {
		name    string
		seed    string
		id      string
		enabled bool
		wantErr error
	}{
		{name: "disable empty section", id: "debts"},
		{name: "re-enable section", id: "crypto", enabled: true},
		{name: "unknown section", id: "pets", wantErr: settings.ErrUnknownSection},
		{
			name:    "disable section with entries",
			seed:    `INSERT INTO debts (name, balance) VALUES ('Mortgage', 1000)`,
			id:      "debts",
			wantErr: settings.ErrSectionHasEntries,
		},
		{
			name: "zero-value rows do not count",
			seed: `INSERT INTO entries (month, month_full, yr, mo, stocks_invested) VALUES ('Jan 26', 'January 2026', 2026, 'Jan', 500)`,
			id:   "crypto",
		},
		{
			name:    "stocks values block stocks",
			seed:    `INSERT INTO entries (month, month_full, yr, mo, stocks_invested) VALUES ('Jan 26', 'January 2026', 2026, 'Jan', 500)`,
			id:      "stocks",
			wantErr: settings.ErrSectionHasEntries,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db := openDB(t)
			if tt.seed != "" {
				if _, err := db.Exec(tt.seed); err != nil {
					t.Fatalf("seed: %v", err)
				}
			}
			store := settings.New(db)

			_, err := store.SetSectionEnabled(tt.id, tt.enabled)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("err = %v, want %v", err, tt.wantErr)
			}
			if tt.wantErr != nil {
				return
			}

			// state must survive a fresh read
			got, err := store.Sections()
			if err != nil {
				t.Fatalf("sections: %v", err)
			}
			for _, s := range got {
				want := s.ID != tt.id || tt.enabled
				if s.Enabled != want {
					t.Errorf("%s enabled = %v, want %v", s.ID, s.Enabled, want)
				}
			}
		})
	}
}
