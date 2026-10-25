APP := server
BIN := .bin/$(APP)
DB_PATH ?= data/wealth.db

.PHONY: build serve dev clean generate \
        test lint fmt \
        web-dev web-build web-fmt web-fmt-check \
        up down logs \
        demo demo-dev site site-build

# ── Build ──────────────────────────────────────────────────────────────────────

build: web-build
	CGO_ENABLED=1 go build -ldflags="-s -w" -o $(BIN) ./cmd/$(APP)

serve: build
	$(BIN)

dev: build
	npx --prefix web concurrently \
		--names "server,web" \
		--prefix-colors "cyan.bold,green.bold" \
		--kill-others-on-fail \
		"DB_PATH=\"$(DB_PATH)\" DB_KEY=$$DB_KEY $(BIN)" \
		"cd web && npm run dev"

clean:
	rm -rf .bin/ web/dist/ web/dist-demo/ pkg/web/dist/ dist-site/

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

# ── Demo ──────────────────────────────────────────────────────────────────────

# Build the in-browser demo (mock API, sample data, no backend) and serve it.
demo:
	cd web && npm ci && npm run build:demo
	@echo "demo: http://localhost:8199/"
	cd web && npx vite preview --outDir dist-demo --port 8199 --strictPort

# Run the frontend against the mock API with hot reload.
demo-dev:
	cd web && npm run dev:demo

# ── GitHub Pages site ─────────────────────────────────────────────────────────

# Assemble the Pages site into dist-site/: landing page (site/) at the root,
# demo at /demo/. Same artifact that .github/workflows/pages.yml publishes.
site-build:
	cd web && npm ci && npm run build:demo
	rm -rf dist-site
	cp -R site dist-site
	cp -R web/dist-demo dist-site/demo

# Build the Pages site and serve it locally.
site: site-build
	@echo "site: http://localhost:8199/  demo: http://localhost:8199/demo/"
	cd web && npx vite preview --outDir ../dist-site --port 8199 --strictPort

web-build:
	cd web && npm ci && npm run build
	@mkdir -p pkg/web/dist
	cp -r web/dist/. pkg/web/dist/

# ── Docker ────────────────────────────────────────────────────────────────────

up: web-build
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f
