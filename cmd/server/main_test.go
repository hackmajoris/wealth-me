package main

import (
	"bufio"
	"io"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestRun(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("DB_PATH", filepath.Join(dir, "test.db"))
	t.Setenv("PORT", "0") // let OS pick a free port

	pr, pw := io.Pipe()

	// Capture the first output line in a goroutine so there is no shared
	// buffer between the writer (run) and the reader (test).
	linec := make(chan string, 1)
	go func() {
		sc := bufio.NewScanner(pr)
		if sc.Scan() {
			linec <- sc.Text()
		}
	}()

	errc := make(chan error, 1)
	go func() {
		errc <- run(nil, pw)
	}()

	select {
	case err := <-errc:
		t.Fatalf("run exited unexpectedly: %v", err)
	case line := <-linec:
		if !strings.Contains(line, "Server running") {
			t.Errorf("expected startup message, got: %q", line)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("timeout waiting for server to start")
	}
}
