package settings

import (
	"errors"
	"fmt"
	"slices"
	"strings"
)

// ErrUnknownSection is returned for a section id that does not exist.
var ErrUnknownSection = errors.New("unknown section")

// ErrSectionHasEntries is returned when disabling a section that still holds data.
var ErrSectionHasEntries = errors.New("section has entries")

const disabledSectionsKey = "disabled_sections"

// Section is an optional part of the app that can be hidden.
type Section struct {
	ID      string `json:"id"`
	Enabled bool   `json:"enabled"`
	Entries int    `json:"entries"`
	// CanDisable is false while the section holds entries.
	CanDisable bool `json:"canDisable"`
}

// sectionCounts lists the optional sections in display order, each with the
// query that counts its data. Zero rows are ignored because month.Init seeds
// an empty row for the current month.
var sectionCounts = []struct {
	id    string
	query string
}{
	{"stocks", `SELECT COUNT(*) FROM entries WHERE stocks_invested != 0 OR stocks_return != 0`},
	{"crypto", `SELECT COUNT(*) FROM entries WHERE crypto_invested != 0 OR crypto_return != 0`},
	{"savings", `SELECT COUNT(*) FROM savings WHERE net_income != 0 OR total_expenses != 0`},
	{"assets", `SELECT (SELECT COUNT(*) FROM assets)
		+ (SELECT COUNT(*) FROM asset_entries WHERE amount != 0)
		+ (SELECT COUNT(*) FROM asset_history WHERE total_value != 0)`},
	{"debts", `SELECT (SELECT COUNT(*) FROM debts)
		+ (SELECT COUNT(*) FROM debt_entries WHERE amount != 0)`},
}

// Sections returns every optional section with its state and entry count.
func (s *Store) Sections() ([]Section, error) {
	disabled, err := s.disabledSections()
	if err != nil {
		return nil, err
	}
	out := make([]Section, 0, len(sectionCounts))
	for _, sc := range sectionCounts {
		var n int
		if err := s.db.QueryRow(sc.query).Scan(&n); err != nil {
			return nil, fmt.Errorf("count %s entries: %w", sc.id, err)
		}
		out = append(out, Section{
			ID:         sc.id,
			Enabled:    !slices.Contains(disabled, sc.id),
			Entries:    n,
			CanDisable: n == 0,
		})
	}
	return out, nil
}

// SetSectionEnabled turns a section on or off. A section can only be
// turned off while it has no entries.
func (s *Store) SetSectionEnabled(id string, enabled bool) ([]Section, error) {
	sections, err := s.Sections()
	if err != nil {
		return nil, err
	}
	i := slices.IndexFunc(sections, func(sec Section) bool { return sec.ID == id })
	if i < 0 {
		return nil, fmt.Errorf("%w: %q", ErrUnknownSection, id)
	}
	if !enabled && !sections[i].CanDisable {
		return nil, fmt.Errorf("%w: %s has %d", ErrSectionHasEntries, id, sections[i].Entries)
	}

	var disabled []string
	for _, sec := range sections {
		off := !sec.Enabled
		if sec.ID == id {
			off = !enabled
		}
		if off {
			disabled = append(disabled, sec.ID)
		}
	}
	if _, err := s.SetString(disabledSectionsKey, strings.Join(disabled, ",")); err != nil {
		return nil, err
	}
	sections[i].Enabled = enabled
	return sections, nil
}

func (s *Store) disabledSections() ([]string, error) {
	setting, err := s.GetString(disabledSectionsKey)
	if errors.Is(err, ErrNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if setting.Value == "" {
		return nil, nil
	}
	return strings.Split(setting.Value, ","), nil
}
