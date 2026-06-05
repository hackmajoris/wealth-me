APP := server
BIN := .bin/$(APP)

.PHONY: build serve dev clean generate \
        test lint fmt \
        web-dev web-build web-fmt web-fmt-check \
        up down logs

# ── Build ──────────────────────────────────────────────────────────────────────

build: web-build
	CGO_ENABLED=1 go build -ldflags="-s -w" -o $(BIN) ./cmd/$(APP)

serve: build
	$(BIN)

dev: build
	@mkdir -p data
	npx --prefix web concurrently \
		--names "server,web" \
		--prefix-colors "cyan.bold,green.bold" \
		--kill-others-on-fail \
		"DB_PATH=data/wealth.db $(BIN)" \
		"cd web && npm run dev"

clean:
	rm -rf .bin/ web/dist/ pkg/web/dist/ electron/dist/

generate:
	go generate ./...

# ── Quality ────────────────────────────────────────────────────────────────────

test:
	go test -race -cover ./...

lint:
	golangci-lint run ./...

fmt:
	find . -name "*.go" -not -path "*/vendor/*" | xargs gofmt -w
	find . -name "*.go" -not -path "*/vendor/*" | xargs goimports -w
	cd web && npm run format

# ── Web ────────────────────────────────────────────────────────────────────────

web-dev:
	cd web && npm run dev

web-fmt:
	cd web && npm run format

web-fmt-check:
	cd web && npm run format:check

web-build:
	cd web && npm ci && npm run build
	@mkdir -p pkg/web/dist
	cp -r web/dist/. pkg/web/dist/

# ── Docker ────────────────────────────────────────────────────────────────────

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f
