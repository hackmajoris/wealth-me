# wealth-me

A personal wealth tracking application for monitoring savings, investments, assets, debts, and portfolio performance. Built with Go and a web-based frontend, deployable via Docker.

**[Website](https://hackmajoris.github.io/wealth-me/) · [Live demo](https://hackmajoris.github.io/wealth-me/demo/)** (runs in your browser with sample data)

## Features

- **Savings tracking** — monthly income, expenses, saving rate, and targets
- **Investment tracking** — stocks and crypto with invested amounts and returns
- **Asset management** — track assets with purchase price, current value, and history snapshots
- **Debt management** — track debts with balances, credit limits, interest rates, and minimum payments
- **CSV import/export** — bulk upload data via CSV templates
- **Exchange rates** — automatic EUR/USD to RON rates fetched from Yahoo Finance
- **Configurable currencies** — per-section currency settings (RON, EUR, USD; RON is the base currency for conversions)
- **Database encryption** — AES-256 encryption at rest via SQLCipher

## Prerequisites

- Go 1.22+
- Node 20+
- [golangci-lint](https://golangci-lint.run/)
- Docker (for containerised deployment)

## Development

```bash
make build            # build frontend + Go binary
make serve            # build and run the server
make dev              # run Go server + frontend dev server concurrently
make test             # run tests with race detector
make lint             # run linter
make fmt              # format Go source files
make web-dev          # frontend dev server only
make web-build        # build frontend only
make clean            # remove build artifacts
```

The dev server listens on `http://localhost:8080` by default.

## Demo

The demo runs entirely in the browser: an in-memory mock API (`web/src/lib/demo/`)
replaces the Go backend and serves generated sample data from Jan 2021 to the current month. Nothing is
persisted; changes reset on reload.

```bash
make demo             # build the demo and serve it at http://localhost:8199
make demo-dev         # same, with the Vite dev server and hot reload
```

`npm run build:demo` (in `web/`) outputs a static site to `web/dist-demo/` with
relative asset paths, so it can be hosted under any subpath.

## Website

The project page lives in `site/` (plain HTML, screenshots in `site/img/`).
On GitHub Pages it is served at the root with the demo under `/demo/`.

```bash
make site             # assemble dist-site/ (landing + demo) and serve at http://localhost:8199/
make site-build       # assemble dist-site/ only
```

The `Deploy site to GitHub Pages` workflow runs `make site-build` and publishes
`dist-site/` to the `gh-pages` branch on every `v*` tag or manual run.

The mock mirrors the server handlers; when an endpoint changes in `pkg/`,
update `web/src/lib/demo/mockApi.ts` to match. Benchmark index prices in the
demo are synthetic.

## Docker

```bash
make up               # docker compose up -d
make down             # docker compose down
make logs             # docker compose logs -f
```

The database is persisted on the host in `DATA_DIR` (default `./data`), bind-mounted to `/data/wealth.db` in the container.
Override compose settings in a `.env` file next to `docker-compose.yml`:

```
DATA_DIR=${HOME}/Library/Application Support/WealthMe
HOST_PORT=8080
DB_KEY=your-secret-encryption-key
```

Compose publishes the app on `127.0.0.1` only. For machine-specific additions (e.g. an external reverse-proxy network), use a gitignored `docker-compose.override.yml`; Compose merges it automatically.

## Configuration

All configuration is done via environment variables:

| Variable  | Description                          | Default                                              |
|-----------|--------------------------------------|------------------------------------------------------|
| `DB_PATH` | Path to the SQLite database file     | `<user config dir>/WealthMe/wealth.db` (macOS: `~/Library/Application Support`, Linux: `~/.config`) |
| `DB_DISPLAY_PATH` | DB path shown in Settings → About (host path when containerized) | value of `DB_PATH` |
| `DB_KEY`  | Encryption key for SQLCipher AES-256 | _(empty — encryption disabled)_                      |
| `PORT`    | HTTP server port                     | `8080`                                               |
| `LOG_LEVEL` | `debug` for verbose logs            | _(info)_                                             |
| `LOG_FORMAT` | `json` for JSON logs               | _(text)_                                             |

## Security and privacy

- **No authentication.** The server has no login and listens on all interfaces
  (`:PORT`). Run it on localhost, or put it behind a reverse proxy that adds
  authentication (and TLS) before exposing it to a network.
- **Outbound requests.** The server calls Yahoo Finance for EUR/USD → RON
  exchange rates and benchmark index prices (S&P 500, Nasdaq, VWCE). No
  personal data is sent; everything else stays in the local SQLite file.

## Database Encryption

The database is encrypted at rest using [SQLCipher](https://www.zetetic.net/sqlcipher/) (AES-256) when `DB_KEY` is set.

### Setting `DB_KEY` with Docker Compose

1. Create a `.env` file next to `docker-compose.yml`:

   ```
   DB_KEY=your-secret-encryption-key
   ```

2. Start the app:

   ```bash
   docker compose up -d
   ```

   Docker Compose automatically reads `.env` and injects `DB_KEY` into the container.

> **Important:** Add `.env` to your `.gitignore` to avoid committing secrets.

### Generating a strong key

```bash
openssl rand -base64 32
```

Use the output as your `DB_KEY` value.

### Migrating an existing plaintext database

If you set `DB_KEY` on a database that was previously unencrypted, the app automatically migrates it to encrypted format on startup. The original file is kept as a `.bak` backup.

### Changing or removing the key

- **Changing:** there is no built-in key rotation. Export your data, delete the DB, set the new key, and re-import.
- **Removing:** stop the app, restore the `.bak` file (if available), and unset `DB_KEY`.

## API

All endpoints are served under `/api/`. The frontend SPA is served at `/`.

| Method         | Path                            | Description                    |
|----------------|---------------------------------|--------------------------------|
| GET/POST       | `/api/entries`                  | List / create investment entry |
| GET/PUT/DELETE | `/api/entries/{id}`             | Get / update / delete entry    |
| GET/POST       | `/api/savings`                  | List / create savings entry    |
| GET/PUT/DELETE | `/api/savings/{id}`             | Get / update / delete savings  |
| GET/POST       | `/api/assets`                   | List / create asset            |
| GET/PUT/DELETE | `/api/assets/{id}`              | Get / update / delete asset    |
| GET            | `/api/assets/history`           | Asset value history            |
| POST           | `/api/assets/snapshot`          | Take asset snapshot            |
| GET/POST       | `/api/asset-entries`            | List / create asset entries    |
| PUT/DELETE     | `/api/asset-entries/{id}`       | Update / delete asset entry    |
| GET/POST       | `/api/debts`                    | List / create debt             |
| GET/PUT/DELETE | `/api/debts/{id}`               | Get / update / delete debt     |
| GET            | `/api/debts/history`            | Debt history                   |
| POST           | `/api/debts/snapshot`           | Take debt snapshot             |
| GET/POST       | `/api/debt-entries`             | List / create debt entries     |
| PUT/DELETE     | `/api/debt-entries/{id}`        | Update / delete debt entry     |
| GET/POST       | `/api/settings/savings-target`  | Get / set savings target       |
| GET/POST       | `/api/settings/currency`        | Get / set currency             |
| GET/POST       | `/api/settings/assets-currency` | Get / set assets currency      |
| GET/POST       | `/api/settings/debts-currency`  | Get / set debts currency       |
| GET            | `/api/settings/exchange-rates`  | Get exchange rates             |
| GET            | `/api/stocks`                   | Get stock data                 |
| GET            | `/api/crypto` | Get crypto data |
| GET            | `/api/benchmarks` | Portfolio vs. index benchmarks |
| GET            | `/api/info` | Server info (DB path) |
| POST           | `/api/init-month` | Seed current month's data |
| POST           | `/api/upload/csv` | Import entries CSV |
| GET            | `/api/upload/csv/template` | Entries CSV template |
| POST           | `/api/upload/savings-csv` | Import savings CSV |
| GET            | `/api/upload/savings-csv/template` | Savings CSV template |
| POST           | `/api/upload/asset-history-csv` | Import asset CSV |
| GET            | `/api/upload/asset-history-csv/template` | Asset CSV template |
| POST           | `/api/upload/debt-history-csv` | Import debt CSV |
| GET            | `/api/upload/debt-history-csv/template` | Debt CSV template |

## License

MIT
