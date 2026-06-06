package debts

import (
	"database/sql"
	"errors"
	"fmt"
)

// Store handles database operations for debts.
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

func scanDebt(s scanner) (*Debt, error) {
	d := &Debt{}
	err := s.Scan(
		&d.ID, &d.Name, &d.Category,
		&d.Balance, &d.Limit, &d.InterestRate, &d.MinimumPayment,
		&d.Note, &d.CreatedAt, &d.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return d, nil
}

const selectSQL = `SELECT id, name, category, balance, credit_limit, interest_rate, minimum_payment,
	note, created_at, updated_at FROM debts`

// List returns all debts ordered by balance descending.
func (s *Store) List() ([]Debt, error) {
	rows, err := s.db.Query(selectSQL + ` ORDER BY balance DESC`)

	if err != nil {
		return nil, fmt.Errorf("list debts: %w", err)
	}

	defer func() {
		_ = rows.Close()
	}()

	var out []Debt
	for rows.Next() {
		d, err := scanDebt(rows)
		if err != nil {
			return nil, fmt.Errorf("scan debt: %w", err)
		}
		out = append(out, *d)
	}
	return out, rows.Err()
}

// Get returns the debt with the given id.
func (s *Store) Get(id int64) (*Debt, error) {
	d, err := scanDebt(s.db.QueryRow(selectSQL+` WHERE id = ?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get debt: %w", err)
	}
	return d, nil
}

// Create inserts a new debt and returns it with its assigned id.
func (s *Store) Create(d Debt) (*Debt, error) {
	res, err := s.db.Exec(`
		INSERT INTO debts (name, category, balance, credit_limit, interest_rate, minimum_payment, note)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		d.Name, d.Category, d.Balance, d.Limit, d.InterestRate, d.MinimumPayment, d.Note)
	if err != nil {
		return nil, fmt.Errorf("create debt: %w", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("last insert id: %w", err)
	}
	return s.Get(id)
}

// Update replaces all fields of an existing debt.
func (s *Store) Update(id int64, patch Debt) (*Debt, error) {
	res, err := s.db.Exec(`
		UPDATE debts SET
			name=?, category=?, balance=?, credit_limit=?, interest_rate=?, minimum_payment=?, note=?,
			updated_at=datetime('now')
		WHERE id=?`,
		patch.Name, patch.Category, patch.Balance, patch.Limit, patch.InterestRate, patch.MinimumPayment, patch.Note,
		id)
	if err != nil {
		return nil, fmt.Errorf("update debt: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrNotFound
	}
	return s.Get(id)
}

// RecordSnapshot is a no-op. History is calculated from debt_entries.
func (s *Store) RecordSnapshot(label string) error {
	return nil
}

// UpsertHistory is a no-op. History is calculated from debt_entries.
func (s *Store) UpsertHistory(label string, totalDebt float64) error {
	return nil
}

// dateSortKey returns a SQL expression that converts both "Jan 2024" and
// ISO "2026-04-27" date strings into a comparable "YYYY-MM-DD" text value.
const dateSortKey = `CASE WHEN SUBSTR(date,5,1)='-'
	THEN date
	ELSE TRIM(SUBSTR(date,5))||'-'||CASE SUBSTR(date,1,3)
		WHEN 'Jan' THEN '01' WHEN 'Feb' THEN '02' WHEN 'Mar' THEN '03'
		WHEN 'Apr' THEN '04' WHEN 'May' THEN '05' WHEN 'Jun' THEN '06'
		WHEN 'Jul' THEN '07' WHEN 'Aug' THEN '08' WHEN 'Sep' THEN '09'
		WHEN 'Oct' THEN '10' WHEN 'Nov' THEN '11' WHEN 'Dec' THEN '12'
		ELSE '00' END||'-01'
END`

// GetHistory returns monthly totals aggregated from debt_entries, ordered chronologically.
func (s *Store) GetHistory() ([]HistoryPoint, error) {
	rows, err := s.db.Query(`
		SELECT date, SUM(amount) as total_debt
		FROM debt_entries
		GROUP BY date
		ORDER BY ` + dateSortKey + ` ASC`)
	if err != nil {
		return nil, fmt.Errorf("get debt history: %w", err)
	}
	defer func() { _ = rows.Close() }()
	var out []HistoryPoint
	for rows.Next() {
		var p HistoryPoint
		if err := rows.Scan(&p.Date, &p.TotalDebt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// ListEntries returns all debt entries. Pass date="" for all months.
func (s *Store) ListEntries(date string) ([]DebtEntry, error) {
	q := `SELECT id, date, name, category, amount, currency, note, created_at FROM debt_entries`
	var args []any
	if date != "" {
		q += ` WHERE date = ?`
		args = append(args, date)
	}
	q += ` ORDER BY ` + dateSortKey + ` DESC, id ASC`
	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, fmt.Errorf("list debt entries: %w", err)
	}
	defer func() { _ = rows.Close() }()
	var out []DebtEntry
	for rows.Next() {
		var e DebtEntry
		if err := rows.Scan(&e.ID, &e.Date, &e.Name, &e.Category, &e.Amount, &e.Currency, &e.Note, &e.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// CreateEntry inserts a new debt entry and returns it.
func (s *Store) CreateEntry(e DebtEntry) (*DebtEntry, error) {
	res, err := s.db.Exec(`
		INSERT INTO debt_entries (date, name, category, amount, currency, note) VALUES (?, ?, ?, ?, ?, ?)`,
		e.Date, e.Name, e.Category, e.Amount, e.Currency, e.Note)
	if err != nil {
		return nil, fmt.Errorf("create debt entry: %w", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	e.ID = id
	return &e, nil
}

// UpdateEntry updates an existing debt entry by id.
func (s *Store) UpdateEntry(id int64, e DebtEntry) error {
	res, err := s.db.Exec(`
		UPDATE debt_entries SET date=?, name=?, category=?, amount=?, currency=?, note=?
		WHERE id=?`,
		e.Date, e.Name, e.Category, e.Amount, e.Currency, e.Note, id)
	if err != nil {
		return fmt.Errorf("update debt entry: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// UpsertEntry inserts or updates a debt entry by (date, name).
func (s *Store) UpsertEntry(e DebtEntry) error {
	_, err := s.db.Exec(`
		INSERT INTO debt_entries (date, name, category, amount, currency, note) VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(date, name) DO UPDATE SET amount = excluded.amount, currency = excluded.currency, category = excluded.category, note = excluded.note`,
		e.Date, e.Name, e.Category, e.Amount, e.Currency, e.Note)
	return err
}

// DeleteEntry removes a debt entry by id.
func (s *Store) DeleteEntry(id int64) error {
	res, err := s.db.Exec(`DELETE FROM debt_entries WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete debt entry: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// Delete removes the debt with the given id.
func (s *Store) Delete(id int64) error {
	res, err := s.db.Exec(`DELETE FROM debts WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete debt: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}
