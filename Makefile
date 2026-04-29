.PHONY: build serve dev test lint fmt clean generate \
        web-dev web-build electron-dev electron-build \
        up down logs

APP := server
BIN := .bin/$(APP)

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

test:
	go test -race -cover ./...

lint:
	golangci-lint run ./...

fmt:
	find . -name "*.go" -not -path "*/vendor/*" | xargs gofmt -w
	find . -name "*.go" -not -path "*/vendor/*" | xargs goimports -w

clean:
	rm -rf .bin/ web/dist/ pkg/web/dist/ electron/dist/

generate:
	go generate ./...

web-dev:
	cd web && npm run dev

web-build:
	cd web && npm ci && npm run build
	@mkdir -p pkg/web/dist
	cp -r web/dist/. pkg/web/dist/

electron-dev: build
	cd electron && npm run dev

electron-build: build
	cd electron && npm ci && npm run dist

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f
