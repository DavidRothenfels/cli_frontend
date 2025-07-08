#!/bin/bash

# Vergabe-Generator Startup Script
# Startet PocketBase und CLI Processor

echo "🚀 Starting Vergabe Generator..."

# Prüfe ob PocketBase existiert
if [ ! -f "./pocketbase" ]; then
    echo "❌ PocketBase binary not found. Please download it first."
    exit 1
fi

# Stoppe eventuell laufende Prozesse
echo "🛑 Stopping any running processes..."
pkill -f pocketbase
pkill -f "node.*process_cli_commands"

# Warte kurz
sleep 2

# Starte PocketBase im Hintergrund
echo "📡 Starting PocketBase server..."
./pocketbase serve --http=0.0.0.0:8090 > pocketbase.log 2>&1 &
POCKETBASE_PID=$!

# Warte bis PocketBase bereit ist
echo "⏳ Waiting for PocketBase to start..."
timeout=30
counter=0
while ! curl -s http://localhost:8090/api/health > /dev/null 2>&1; do
    sleep 1
    counter=$((counter + 1))
    if [ $counter -ge $timeout ]; then
        echo "❌ PocketBase failed to start within $timeout seconds"
        kill $POCKETBASE_PID 2>/dev/null
        exit 1
    fi
done

echo "✅ PocketBase is running (PID: $POCKETBASE_PID)"

# Ensure admin exists
echo "👤 Ensuring admin user exists..."
./pocketbase superuser upsert admin@vergabe.de admin123 > /dev/null 2>&1 || echo "ℹ️ Admin setup may need manual intervention"

# Starte CLI Processor im Hintergrund
echo "🤖 Starting CLI Processor..."
node process_cli_commands.js > cli_processor.log 2>&1 &
CLI_PID=$!

echo "✅ CLI Processor is running (PID: $CLI_PID)"

# Zeige Status
echo ""
echo "🎉 Vergabe Generator is ready!"
echo "📊 Admin Interface: http://localhost:8090/_/"
echo "🌐 Application: http://localhost:8090/"
echo "📝 Demo User: test@vergabe.de / vergabe123"
echo "🔧 Admin User: admin@vergabe.de / admin123"
echo ""
echo "📋 PIDs: PocketBase=$POCKETBASE_PID, CLI=$CLI_PID"
echo "📜 Logs: tail -f pocketbase.log cli_processor.log"
echo ""
echo "Press Ctrl+C to stop all services..."

# Warte auf Interrupt und stoppe Services ordentlich
trap 'echo ""; echo "🛑 Stopping services..."; kill $POCKETBASE_PID $CLI_PID 2>/dev/null; wait; echo "✅ All services stopped."; exit 0' INT

# Halte Skript am Leben
wait