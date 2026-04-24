package example_test

import (
	"testing"

	"github.com/hackmajoris/wealth-me/pkg/example"
)

func TestNew(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		client, err := example.New()
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if client == nil {
			t.Fatal("expected non-nil client")
		}
	})
}
