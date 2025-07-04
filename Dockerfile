# Vergabedokument-Generator Dockerfile für Coolify Deployment
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    wget \
    unzip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Download and install PocketBase
ARG PB_VERSION=0.23.4
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${PB_VERSION}_linux_amd64.zip \
    && chmod +x pocketbase \
    && rm pocketbase_${PB_VERSION}_linux_amd64.zip

# Copy application files
COPY ausschreibung-generator/pb_hooks ./pb_hooks/
COPY ausschreibung-generator/pb_migrations ./pb_migrations/
COPY ausschreibung-generator/pb_public ./pb_public/
COPY ausschreibung-generator/process_cli_commands.js ./

# Create data directory and set permissions
RUN mkdir -p pb_data && chmod 755 pb_data

# Create volume mount point for persistent data
VOLUME ["/app/pb_data"]

# Expose port
EXPOSE 8090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8090/api/health || exit 1

# Start PocketBase with automigrate
CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090", "--automigrate"]