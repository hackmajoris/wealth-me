package assets

import (
	"database/sql"
	"fmt"
	"time"
)

// Store handles database operations for assets.
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

func scanAsset(s scanner) (*Asset, error) {
	a := &Asset{}
	err := s.Scan(
		&a.ID, &a.Name, &a.Category,
		&a.Value, &a.PurchasePrice, &a.PurchaseDate,
		&a.Note, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return a, nil
}

const selectSQL = `SELECT id, name, category, value, purchase_price, purchase_date,
	note, created_at, updated_at FROM assets`

// List returns all assets ordered by value descending.
func (s *Store) List() ([]Asset, error) {
	rows, err := s.db.Query(selectSQL + ` ORDER BY value DESC`)
	if err != nil {
		return nil, fmt.Errorf("list assets: %w", err)
	}
	defer rows.Close()

	var out []Asset
	for rows.Next() {
		a, err := scanAsset(rows)
		if err != nil {
			return nil, fmt.Errorf("scan asset: %w", err)
		}
		out = append(out, *a)
	}
	return out, rows.Err()
}

// Get returns the asset with the given id.
func (s *Store) Get(id int64) (*Asset, error) {
	a, err := scanAsset(s.db.QueryRow(selectSQL+` WHERE id = ?`, id))
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get asset: %w", err)
	}
	return a, nil
}

// Create inserts a new asset and returns it with its assigned id.
func (s *Store) Create(a Asset) (*Asset, error) {
	res, err := s.db.Exec(`
		INSERT INTO assets (name, category, value, purchase_price, purchase_date, note)
		VALUES (?, ?, ?, ?, ?, ?)`,
		a.Name, a.Category, a.Value, a.PurchasePrice, a.PurchaseDate, a.Note)
	if err != nil {
		return nil, fmt.Errorf("create asset: %w", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("last insert id: %w", err)
	}
	return s.Get(id)
}

// Update replaces all fields of an existing asset.
func (s *Store) Update(id int64, patch Asset) (*Asset, error) {
	res, err := s.db.Exec(`
		UPDATE assets SET
			name=?, category=?, value=?, purchase_price=?, purchase_date=?, note=?,
			updated_at=datetime('now')
		WHERE id=?`,
		patch.Name, patch.Category, patch.Value, patch.PurchasePrice, patch.PurchaseDate, patch.Note,
		id)
	if err != nil {
		return nil, fmt.Errorf("update asset: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrNotFound
	}
	return s.Get(id)
}

// Delete removes the asset with the given id.
func (s *Store) Delete(id int64) error {
	res, err := s.db.Exec(`DELETE FROM assets WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete asset: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// RecordSnapshot is a no-op; history is now derived from asset_entries.
func (s *Store) RecordSnapshot(label string) error {
	return nil
}

// UpsertHistory is a no-op; history is now derived from asset_entries.
func (s *Store) UpsertHistory(label string, totalValue float64) error {
	return nil
}

// dateSortKey converts "Jan 2024" or ISO "2026-04-27" into comparable "YYYY-MM-DD".
const dateSortKey = `CASE WHEN SUBSTR(date,5,1)='-'
	THEN date
	ELSE TRIM(SUBSTR(date,5))||'-'||CASE SUBSTR(date,1,3)
		WHEN 'Jan' THEN '01' WHEN 'Feb' THEN '02' WHEN 'Mar' THEN '03'
		WHEN 'Apr' THEN '04' WHEN 'May' THEN '05' WHEN 'Jun' THEN '06'
		WHEN 'Jul' THEN '07' WHEN 'Aug' THEN '08' WHEN 'Sep' THEN '09'
		WHEN 'Oct' THEN '10' WHEN 'Nov' THEN '11' WHEN 'Dec' THEN '12'
		ELSE '00' END||'-01'
END`

// GetHistory returns monthly totals aggregated from asset_entries, ordered chronologically.
func (s *Store) GetHistory() ([]HistoryPoint, error) {
	rows, err := s.db.Query(`
		SELECT date, SUM(amount) as total_value
		FROM asset_entries
		GROUP BY date
		ORDER BY ` + dateSortKey + ` ASC`)
	if err != nil {
		return nil, fmt.Errorf("get asset history: %w", err)
	}
	defer rows.Close()
	var out []HistoryPoint
	for rows.Next() {
		var p HistoryPoint
		if err := rows.Scan(&p.Date, &p.TotalValue); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// ListEntries returns all asset entries ordered newest-first. Pass date="" for all months.
func (s *Store) ListEntries(date string) ([]AssetEntry, error) {
	q := `SELECT id, date, name, category, amount, note, created_at FROM asset_entries`
	var args []any
	if date != "" {
		q += ` WHERE date = ?`
		args = append(args, date)
	}
	q += ` ORDER BY ` + dateSortKey + ` DESC, id ASC`
	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, fmt.Errorf("list asset entries: %w", err)
	}
	defer rows.Close()
	var out []AssetEntry
	for rows.Next() {
		var e AssetEntry
		if err := rows.Scan(&e.ID, &e.Date, &e.Name, &e.Category, &e.Amount, &e.Note, &e.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// CreateEntry inserts a new asset entry and returns it.
func (s *Store) CreateEntry(e AssetEntry) (*AssetEntry, error) {
	res, err := s.db.Exec(`
		INSERT INTO asset_entries (date, name, category, amount, note) VALUES (?, ?, ?, ?, ?)`,
		e.Date, e.Name, e.Category, e.Amount, e.Note)
	if err != nil {
		return nil, fmt.Errorf("create asset entry: %w", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	e.ID = id
	e.CreatedAt = time.Now().Format(time.RFC3339)
	return &e, nil
}

// UpdateEntry updates an existing asset entry by id.
func (s *Store) UpdateEntry(id int64, e AssetEntry) error {
	res, err := s.db.Exec(`
		UPDATE asset_entries SET date=?, name=?, category=?, amount=?, note=?
		WHERE id=?`,
		e.Date, e.Name, e.Category, e.Amount, e.Note, id)
	if err != nil {
		return fmt.Errorf("update asset entry: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// UpsertEntry inserts or updates an asset entry by (date, name).
func (s *Store) UpsertEntry(e AssetEntry) error {
	_, err := s.db.Exec(`
		INSERT INTO asset_entries (date, name, category, amount, note) VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(date, name) DO UPDATE SET amount = excluded.amount, category = excluded.category, note = excluded.note`,
		e.Date, e.Name, e.Category, e.Amount, e.Note)
	return err
}

// DeleteEntry removes an asset entry by id.
func (s *Store) DeleteEntry(id int64) error {
	res, err := s.db.Exec(`DELETE FROM asset_entries WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete asset entry: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}
