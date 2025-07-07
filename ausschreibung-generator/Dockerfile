# Multi-stage Dockerfile für Vergabedokument-Generator
FROM node:18-alpine AS cli-processor

# Install dependencies for CLI processor
WORKDIR /app
COPY package*.json ./
RUN npm install

# Copy CLI processor
COPY process_cli_commands.js ./
COPY pb_hooks/ ./pb_hooks/

# Main PocketBase stage
FROM alpine:latest

# Install dependencies
RUN apk add --no-cache \
    ca-certificates \
    unzip \
    curl \
    nodejs \
    npm \
    bash \
    git

# Create app directory
WORKDIR /app

# Download and install PocketBase v0.28.4
RUN curl -L https://github.com/pocketbase/pocketbase/releases/download/v0.28.4/pocketbase_0.28.4_linux_amd64.zip -o pocketbase.zip \
    && unzip pocketbase.zip \
    && chmod +x pocketbase \
    && rm pocketbase.zip

# Install OpenCode CLI
RUN curl -fsSL https://github.com/getcodeium/opencode/releases/latest/download/install.sh | sh

# Copy application files
COPY pb_migrations/ ./pb_migrations/
COPY pb_hooks/ ./pb_hooks/
COPY pb_public/ ./pb_public/
COPY --from=cli-processor /app ./cli/

# Copy startup script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create data directory
RUN mkdir -p pb_data

# Expose port
EXPOSE 8090

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8090/api/health || exit 1

# Start both services
ENTRYPOINT ["./docker-entrypoint.sh"]