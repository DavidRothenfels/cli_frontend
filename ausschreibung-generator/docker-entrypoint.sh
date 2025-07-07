#!/bin/sh

echo "🚀 Starting Vergabedokument-Generator"
echo "=================================="

# Function to handle shutdown
shutdown() {
    echo "🛑 Shutting down services..."
    kill $CLI_PID 2>/dev/null
    kill $PB_PID 2>/dev/null
    wait
    exit 0
}

# Trap signals for graceful shutdown
trap shutdown SIGTERM SIGINT

# Create superuser if not exists
echo "👤 Setting up admin user..."
./pocketbase superuser upsert "${PB_ADMIN_EMAIL:-admin@vergabe.de}" "${PB_ADMIN_PASSWORD:-admin123}" || true

# Start PocketBase in background
echo "🗄️ Starting PocketBase..."
./pocketbase serve --http=0.0.0.0:8090 &
PB_PID=$!

# Wait for PocketBase to be ready
echo "⏳ Waiting for PocketBase to start..."
until curl -f http://localhost:8090/api/health >/dev/null 2>&1; do
    sleep 1
done
echo "✅ PocketBase ready"

# Start CLI processor if Node.js files exist
if [ -f "cli/process_cli_commands.js" ]; then
    echo "🔄 Starting CLI processor..."
    cd cli && node process_cli_commands.js &
    CLI_PID=$!
    cd ..
    echo "✅ CLI processor started"
else
    echo "ℹ️ CLI processor not found, running PocketBase only"
fi

echo "🎉 All services started successfully!"
echo "📍 Access application at: http://localhost:8090"
echo "🔧 Admin dashboard at: http://localhost:8090/_/"

# Wait for background processes
wait