package entries

import (
	"database/sql"
	"fmt"
)

// Store handles database operations for entries.
type Store struct {
	db *sql.DB
}

// Option is a functional option for Store.
type Option func(*Store)

// New creates a new Store.
func New(db *sql.DB, opts ...Option) *Store {
	s := &Store{db: db}
	for _, opt := range opts {
		opt(s)
	}
	return s
}

type scanner interface {
	Scan(dest ...any) error
}

func scanEntry(s scanner) (*Entry, error) {
	e := &Entry{}
	err := s.Scan(
		&e.ID, &e.Month, &e.MonthFull, &e.Yr, &e.Mo,
		&e.CryptoInvested, &e.CryptoReturn,
		&e.StocksInvested, &e.StocksReturn,
		&e.Note, &e.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return e, nil
}

const selectSQL = `SELECT id, month, month_full, yr, mo,
	crypto_invested, crypto_return, stocks_invested, stocks_return, note, created_at
	FROM entries`

// List returns all entries ordered by date ascending (oldest first).
func (s *Store) List() ([]Entry, error) {
	rows, err := s.db.Query(selectSQL + ` ORDER BY yr ASC, CASE mo
		WHEN 'Jan' THEN 1 WHEN 'Feb' THEN 2 WHEN 'Mar' THEN 3 WHEN 'Apr' THEN 4
		WHEN 'May' THEN 5 WHEN 'Jun' THEN 6 WHEN 'Jul' THEN 7 WHEN 'Aug' THEN 8
		WHEN 'Sep' THEN 9 WHEN 'Oct' THEN 10 WHEN 'Nov' THEN 11 WHEN 'Dec' THEN 12
		ELSE 0 END ASC`)
	if err != nil {
		return nil, fmt.Errorf("list entries: %w", err)
	}
	defer rows.Close()

	var out []Entry
	for rows.Next() {
		e, err := scanEntry(rows)
		if err != nil {
			return nil, fmt.Errorf("scan entry: %w", err)
		}
		out = append(out, *e)
	}
	return out, rows.Err()
}

// Get returns the entry with the given id.
func (s *Store) Get(id int64) (*Entry, error) {
	e, err := scanEntry(s.db.QueryRow(selectSQL+` WHERE id = ?`, id))
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get entry: %w", err)
	}
	return e, nil
}

// Create inserts a new entry and returns it with its assigned id.
func (s *Store) Create(e Entry) (*Entry, error) {
	res, err := s.db.Exec(`
		INSERT INTO entries
			(month, month_full, yr, mo, crypto_invested, crypto_return, stocks_invested, stocks_return, note)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		e.Month, e.MonthFull, e.Yr, e.Mo,
		e.CryptoInvested, e.CryptoReturn, e.StocksInvested, e.StocksReturn, e.Note)
	if err != nil {
		return nil, fmt.Errorf("create entry: %w", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("last insert id: %w", err)
	}
	return s.Get(id)
}

// Update replaces all fields of an existing entry.
func (s *Store) Update(id int64, patch Entry) (*Entry, error) {
	res, err := s.db.Exec(`
		UPDATE entries SET
			month=?, month_full=?, yr=?, mo=?,
			crypto_invested=?, crypto_return=?, stocks_invested=?, stocks_return=?, note=?
		WHERE id=?`,
		patch.Month, patch.MonthFull, patch.Yr, patch.Mo,
		patch.CryptoInvested, patch.CryptoReturn, patch.StocksInvested, patch.StocksReturn, patch.Note,
		id)
	if err != nil {
		return nil, fmt.Errorf("update entry: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrNotFound
	}
	return s.Get(id)
}

// Delete removes the entry with the given id.
func (s *Store) Delete(id int64) error {
	res, err := s.db.Exec(`DELETE FROM entries WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete entry: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// Upsert inserts or updates an entry matched by (yr, mo), only touching
// stocks fields on conflict (preserves existing crypto data).
func (s *Store) Upsert(e Entry) (*Entry, error) {
	_, err := s.db.Exec(`
		INSERT INTO entries
			(month, month_full, yr, mo, crypto_invested, crypto_return, stocks_invested, stocks_return, note)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(yr, mo) DO UPDATE SET
			stocks_invested = excluded.stocks_invested,
			stocks_return   = excluded.stocks_return,
			note            = excluded.note`,
		e.Month, e.MonthFull, e.Yr, e.Mo,
		e.CryptoInvested, e.CryptoReturn, e.StocksInvested, e.StocksReturn, e.Note)
	if err != nil {
		return nil, fmt.Errorf("upsert entry: %w", err)
	}

	fetched, err := scanEntry(s.db.QueryRow(
		selectSQL+` WHERE yr = ? AND mo = ?`, e.Yr, e.Mo))
	if err != nil {
		return nil, fmt.Errorf("fetch upserted entry: %w", err)
	}
	return fetched, nil
}
