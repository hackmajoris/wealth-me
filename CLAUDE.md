# wealth-me

## Module
github.com/hackmajoris/wealth-me

## Structure
- `cmd/server/` — single binary entry point; keep thin, wire into `pkg/`
- `pkg/` — all business logic; each package independently testable
- `pkg/web/` — embeds `web/dist/` and exposes `http.Handler` for the SPA
- `web/` — frontend app; `npm run build` outputs to `web/dist/`
- `electron/` — Electron shell; spawns `.bin/server` and opens it in a BrowserWindow

## Adding a New Package
1. Create `pkg/<n>/`
2. Define the main type and a `New()` constructor with functional options
3. Add `mocks/` sub-package if the package exposes an interface used by others
4. Add `<n>_test.go` using the `_test` package suffix

## Adding a New API Endpoint
1. Add handler in `pkg/<feature>/handler.go`
2. Register route under `/api/` in `cmd/server/main.go`
3. Add corresponding `api.<method>()` call in `web/src/lib/api.ts`

## Testing
- Run: `go test -race ./...`
- Prefer table-driven tests
- Use `testdata/` for fixtures
- Mocks live in `pkg/<n>/mocks/`

## Conventions
- Functional options: `type Option func(*Client)`
- Sentinel errors: `var ErrNotFound = errors.New("not found")`
- Wrap errors: `fmt.Errorf("doing X: %w", err)`
- `main()` calls `run(args, out)` — keeps entry point testable
