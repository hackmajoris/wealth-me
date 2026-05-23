# wealth-me

A personal wealth tracking application for monitoring savings, investments, assets, debts, and portfolio performance. Built with Go and a web-based frontend, deployable via Docker.

## Features

- **Savings tracking** — monthly income, expenses, saving rate, and targets
- **Investment tracking** — stocks and crypto with invested amounts and returns
- **Asset management** — track assets with purchase price, current value, and history snapshots
- **Debt management** — track debts with balances, credit limits, interest rates, and minimum payments
- **CSV import/export** — bulk upload data via CSV templates
- **Exchange rates** — automatic EUR/USD to RON rates fetched from Yahoo Finance
- **Configurable currencies** — per-section currency settings
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

## Docker

```bash
make up               # docker compose up -d
make down             # docker compose down
make logs             # docker compose logs -f
```

The database is persisted in a Docker volume (`db-data`) at `/data/wealth.db`.

## Configuration

All configuration is done via environment variables:

| Variable  | Description                          | Default                                              |
|-----------|--------------------------------------|------------------------------------------------------|
| `DB_PATH` | Path to the SQLite database file     | `~/Library/Mobile Documents/.../WealthMe/wealth.db`  |
| `DB_KEY`  | Encryption key for SQLCipher AES-256 | _(empty — encryption disabled)_                      |
| `PORT`    | HTTP server port                     | `8080`                                               |

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
| GET            | `/api/crypto`                   | Get crypto data                |
| POST           | `/api/init-month`               | Seed current month's data      |
| GET/POST       | `/api/upload/csv`               | Template / import entries CSV  |
| GET/POST       | `/api/upload/savings-csv`       | Template / import savings CSV  |
| GET/POST       | `/api/upload/asset-history-csv` | Template / import asset CSV    |
| GET/POST       | `/api/upload/debt-history-csv`  | Template / import debt CSV     |

## License

MIT
