#!/bin/bash

echo "🚀 Starte Vergabedokument-Generator..."

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Check if PocketBase binary exists
if [ ! -f "pocketbase" ]; then
    echo "❌ PocketBase Binary nicht gefunden!"
    echo "Bitte laden Sie PocketBase herunter und führen Sie setup.sh erneut aus."
    exit 1
fi

# Start PocketBase
echo "🌐 Frontend verfügbar unter: http://${HOST:-127.0.0.1}:${PORT:-8090}"
echo "🔧 Admin Panel verfügbar unter: http://${HOST:-127.0.0.1}:${PORT:-8090}/_/"
echo ""
echo "Drücken Sie Ctrl+C zum Beenden"

./pocketbase serve --http=${HOST:-127.0.0.1}:${PORT:-8090}
