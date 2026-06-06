package savings

import (
	"database/sql"
	"fmt"
)

// Store handles database operations for savings entries.
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
		&e.NetIncome, &e.TotalExpenses, &e.Savings, &e.SavingRate, &e.Target,
		&e.Note, &e.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return e, nil
}

const selectSQL = `SELECT id, month, month_full, yr, mo,
	net_income, total_expenses, savings, saving_rate, target, note, updated_at
	FROM savings`

// List returns all savings entries ordered by date descending.
func (s *Store) List() ([]Entry, error) {
	rows, err := s.db.Query(selectSQL + ` ORDER BY yr DESC, mo DESC`)
	if err != nil {
		return nil, fmt.Errorf("list savings: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var out []Entry
	for rows.Next() {
		e, err := scanEntry(rows)
		if err != nil {
			return nil, fmt.Errorf("scan savings entry: %w", err)
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
		return nil, fmt.Errorf("get savings entry: %w", err)
	}
	return e, nil
}

// Create inserts a new savings entry and returns it with its assigned id.
func (s *Store) Create(e Entry) (*Entry, error) {
	res, err := s.db.Exec(`
		INSERT INTO savings
			(month, month_full, yr, mo, net_income, total_expenses, savings, saving_rate, target, note)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		e.Month, e.MonthFull, e.Yr, e.Mo,
		e.NetIncome, e.TotalExpenses, e.Savings, e.SavingRate, e.Target, e.Note)
	if err != nil {
		return nil, fmt.Errorf("create savings entry: %w", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("last insert id: %w", err)
	}
	return s.Get(id)
}

// Update replaces all fields of an existing savings entry and refreshes updated_at.
func (s *Store) Update(id int64, patch Entry) (*Entry, error) {
	res, err := s.db.Exec(`
		UPDATE savings SET
			month=?, month_full=?, yr=?, mo=?,
			net_income=?, total_expenses=?, savings=?, saving_rate=?, target=?, note=?,
			updated_at=datetime('now')
		WHERE id=?`,
		patch.Month, patch.MonthFull, patch.Yr, patch.Mo,
		patch.NetIncome, patch.TotalExpenses, patch.Savings, patch.SavingRate, patch.Target, patch.Note,
		id)
	if err != nil {
		return nil, fmt.Errorf("update savings entry: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrNotFound
	}
	return s.Get(id)
}

// Delete removes the entry with the given id.
func (s *Store) Delete(id int64) error {
	res, err := s.db.Exec(`DELETE FROM savings WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete savings entry: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// Upsert inserts or updates a savings entry matched by (yr, mo).
func (s *Store) Upsert(e Entry) (*Entry, error) {
	_, err := s.db.Exec(`
		INSERT INTO savings
			(month, month_full, yr, mo, net_income, total_expenses, savings, saving_rate, target, note)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(yr, mo) DO UPDATE SET
			net_income     = excluded.net_income,
			total_expenses = excluded.total_expenses,
			note           = excluded.note`,
		e.Month, e.MonthFull, e.Yr, e.Mo,
		e.NetIncome, e.TotalExpenses, e.Savings, e.SavingRate, e.Target, e.Note)
	if err != nil {
		return nil, fmt.Errorf("upsert savings entry: %w", err)
	}

	fetched, err := scanEntry(s.db.QueryRow(
		selectSQL+` WHERE yr = ? AND mo = ?`, e.Yr, e.Mo))
	if err != nil {
		return nil, fmt.Errorf("fetch upserted savings entry: %w", err)
	}
	return fetched, nil
}
