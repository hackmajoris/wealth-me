.PHONY: build test lint fmt clean generate web-dev web-build electron-dev electron-build

APP := server
BIN := .bin/$(APP)

build: web-build
	go build -ldflags="-s -w" -o $(BIN) ./cmd/$(APP)

test:
	go test -race -cover ./...

lint:
	golangci-lint run ./...

fmt:
	gofmt -w .
	goimports -w .

clean:
	rm -rf .bin/ web/dist/ electron/dist/

generate:
	go generate ./...

web-dev:
	cd web && npm run dev

web-build:
	cd web && npm ci && npm run build

electron-dev: build
	cd electron && npm run dev

electron-build: build
	cd electron && npm ci && npm run dist
