# Stage 1: Build frontend
FROM node:20-alpine AS frontend
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ .
RUN npm run build

# Stage 2: Build Go binary (CGO required for go-sqlcipher)
FROM golang:1.22 AS builder
RUN apt-get update \
    && apt-get install -y --no-install-recommends libssl-dev \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend /app/web/dist pkg/web/dist
RUN CGO_ENABLED=1 GOOS=linux \
    go build -ldflags="-s -w" -o .bin/server ./cmd/server

# Stage 3: Minimal runtime (glibc required for CGO)
FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libssl3 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/.bin/server ./server
ENV DB_PATH=/data/wealth.db
EXPOSE 8080
VOLUME /data
ENTRYPOINT ["./server"]
