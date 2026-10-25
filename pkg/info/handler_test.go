package info_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hackmajoris/wealth-me/pkg/info"
)

func TestHandlerGet(t *testing.T) {
	tests := []struct {
		name string
		opts []info.Option
		want string
	}{
		{name: "no path", want: ""},
		{name: "with path", opts: []info.Option{info.WithDBPath("/data/wealth.db")}, want: "/data/wealth.db"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			info.NewHandler(tt.opts...).Get(rec, httptest.NewRequest(http.MethodGet, "/api/info", nil))

			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
			}
			var got info.Info
			if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
				t.Fatalf("decode: %v", err)
			}
			if got.DBPath != tt.want {
				t.Errorf("DBPath = %q, want %q", got.DBPath, tt.want)
			}
		})
	}
}
