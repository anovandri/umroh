# ============================================================
# Multi-stage Dockerfile for Crawlee Scraping Service
# Build context: repo root
#   docker build -f apps/crawlee-scraping-service/Dockerfile .
# ============================================================

# ── Stage 1: Install ALL dependencies (dev+prod for tsc) ────
FROM node:lts-alpine AS deps

WORKDIR /app

COPY apps/crawlee-scraping-service/package.json ./package.json
RUN npm install

# ── Stage 2: Compile TypeScript ──────────────────────────────
FROM deps AS builder

WORKDIR /app

# Source code
COPY apps/crawlee-scraping-service/src ./src

# App-level tsconfigs
COPY apps/crawlee-scraping-service/tsconfig.json ./tsconfig.json
COPY apps/crawlee-scraping-service/tsconfig.app.json ./tsconfig.app.json

# Root base config (placed at the same level so relative extends works)
COPY tsconfig.base.json ./tsconfig.base.json

RUN npx tsc -p tsconfig.app.json

# ── Stage 3: Lean production image ───────────────────────────
FROM node:lts-alpine AS production

# Playwright / Chromium runtime deps (Alpine packages)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-cjk \
    udev \
    xvfb \
    # needed by Playwright to locate the binary
    && true

# Non-root user for security
RUN addgroup -S scraper && adduser -S scraper -G scraper

WORKDIR /app

# Copy only production node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Copy compiled output
COPY --from=builder /app/dist ./dist

# Writable storage and logs directories
RUN mkdir -p crawlee-storage logs && chown -R scraper:scraper /app

USER scraper

# Point Playwright to the system Chromium installed above
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3100/health || exit 1

CMD ["node", "dist/index.js"]
