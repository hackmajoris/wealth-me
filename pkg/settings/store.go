package settings

import (
	"database/sql"
	"fmt"
)

// Store handles database operations for settings.
type Store struct {
	db *sql.DB
}

// New creates a new Store.
func New(db *sql.DB) *Store {
	return &Store{db: db}
}

// Get returns the setting for the given key.
func (s *Store) Get(key string) (*Setting, error) {
	row := s.db.QueryRow(`SELECT key, value FROM settings WHERE key = ?`, key)
	setting := &Setting{}
	if err := row.Scan(&setting.Key, &setting.Value); err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get setting: %w", err)
	}
	return setting, nil
}

// Set creates or updates a setting.
func (s *Store) Set(key string, value float64) (*Setting, error) {
	_, err := s.db.Exec(`
		INSERT INTO settings (key, value) VALUES (?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
		key, value)
	if err != nil {
		return nil, fmt.Errorf("set setting: %w", err)
	}
	return s.Get(key)
}

// GetString returns the string setting for the given key.
func (s *Store) GetString(key string) (*StringSetting, error) {
	row := s.db.QueryRow(`SELECT key, value_string FROM settings WHERE key = ?`, key)
	setting := &StringSetting{}
	if err := row.Scan(&setting.Key, &setting.Value); err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get string setting: %w", err)
	}
	return setting, nil
}

// SetString creates or updates a string setting.
func (s *Store) SetString(key string, value string) (*StringSetting, error) {
	_, err := s.db.Exec(`
		INSERT INTO settings (key, value, value_string) VALUES (?, ?, ?)
		ON CONFLICT(key) DO UPDATE SET value_string = excluded.value_string`,
		key, 0, value)
	if err != nil {
		return nil, fmt.Errorf("set string setting: %w", err)
	}
	return s.GetString(key)
}
