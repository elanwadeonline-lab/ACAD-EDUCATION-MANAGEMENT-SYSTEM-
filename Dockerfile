# syntax=docker/dockerfile:1
FROM oven/bun:1.2-debian AS runner
WORKDIR /app

# Install curl and ca-certificates for health checks
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy dependency configuration files
COPY package.json bun.lock* ./
COPY frontend/package.json frontend/bun.lock* ./frontend/

# Install dependencies (cached layers)
RUN bun install
RUN cd frontend && bun install

# Copy application source code
COPY . .

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=10000

# Build Next.js static production export
RUN cd frontend && bun run build

# Mirror frontend/dist to root dist for static file discovery
RUN mkdir -p dist && cp -r frontend/dist/* dist/

# Ensure persistent mount directories exist
RUN mkdir -p /app/data /app/frontend/public/uploads

# Expose Render standard port
EXPOSE 10000

# Start the Bun production server
CMD ["bun", "server.ts"]
