package settings

import "errors"

// ErrNotFound is returned when a setting is not found.
var ErrNotFound = errors.New("setting not found")

// Setting represents a configuration setting.
type Setting struct {
	Key   string  `json:"key"`
	Value float64 `json:"value"`
}

// StringSetting represents a string configuration setting.
type StringSetting struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}
