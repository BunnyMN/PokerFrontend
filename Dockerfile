FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for build)
# Use npm install if package-lock.json is missing or out of sync
RUN if [ -f package-lock.json ]; then \
      npm ci --legacy-peer-deps || npm install --legacy-peer-deps; \
    else \
      npm install --legacy-peer-deps; \
    fi

# Copy source code and config files
COPY tsconfig.json tsconfig.node.json vite.config.ts tailwind.config.js postcss.config.js ./
COPY index.html ./
COPY src ./src

# Build the application
RUN npm run build

# Production stage - use smaller image
FROM node:20-alpine AS runner

WORKDIR /app

# Install serve globally and wget for healthcheck
RUN npm install -g serve@14.2.4 && \
    apk add --no-cache wget

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 4173

# Set PORT environment variable (Railway will override this)
ENV PORT=4173
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4173 || exit 1

# Start the application
CMD ["sh", "-c", "serve -s dist -l ${PORT:-4173}"]
