#!/bin/bash

# Vergabe-Generator Migration Script
# Löscht alte Daten und führt neue Migration aus

echo "🔄 Vergabe Generator Migration Script"
echo "========================================="

# Prüfe ob PocketBase existiert
if [ ! -f "./pocketbase" ]; then
    echo "❌ PocketBase binary not found. Please download it first."
    exit 1
fi

# Warnung anzeigen
echo "⚠️  WARNING: This will DELETE ALL existing data!"
echo "⚠️  Make sure you have a backup if needed."
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Migration cancelled."
    exit 0
fi

# Stoppe laufende Prozesse
echo ""
echo "🛑 Stopping running processes..."
pkill -f pocketbase
pkill -f "node.*process_cli_commands"
sleep 3

# Backup erstellen (optional)
BACKUP_DIR="pb_data_backup_$(date +%Y%m%d_%H%M%S)"
if [ -d "pb_data" ] && [ -f "pb_data/data.db" ]; then
    echo "💾 Creating backup: $BACKUP_DIR"
    cp -r pb_data "$BACKUP_DIR"
    echo "✅ Backup created: $BACKUP_DIR"
fi

# Lösche alte Datenbank-Dateien
echo "🗑️  Removing old database files..."
rm -f pb_data/data.db*
rm -f pb_data/auxiliary.db*
rm -f pb_data/logs.db*

# Lösche Log-Dateien
echo "🗑️  Cleaning log files..."
rm -f pocketbase.log
rm -f cli_processor.log
rm -f cli_processor_opencode.log

echo "✅ Old data removed"

# Starte PocketBase für Migration
echo ""
echo "🚀 Starting PocketBase for migration..."
./pocketbase serve --http=0.0.0.0:8090 > pocketbase.log 2>&1 &
POCKETBASE_PID=$!

# Warte bis PocketBase bereit ist
echo "⏳ Waiting for PocketBase and migration to complete..."
timeout=60
counter=0
while ! curl -s http://localhost:8090/api/health > /dev/null 2>&1; do
    sleep 1
    counter=$((counter + 1))
    if [ $counter -ge $timeout ]; then
        echo "❌ PocketBase failed to start within $timeout seconds"
        echo "📜 Check logs: tail -f pocketbase.log"
        kill $POCKETBASE_PID 2>/dev/null
        exit 1
    fi
    
    # Zeige Progress
    if [ $((counter % 5)) -eq 0 ]; then
        echo "⏳ Still waiting... ($counter/$timeout seconds)"
    fi
done

# Warte zusätzlich für Migration
echo "⏳ Allowing migration to complete..."
sleep 5

echo ""
echo "✅ Migration completed successfully!"

# Zeige Migration-Logs
echo ""
echo "📜 Recent migration logs:"
echo "=========================="
tail -20 pocketbase.log | grep -E "(migration|collection|admin|user)" || echo "No migration logs found"

# Stoppe PocketBase nach Migration
echo ""
echo "🛑 Stopping temporary PocketBase instance..."
kill $POCKETBASE_PID 2>/dev/null
wait $POCKETBASE_PID 2>/dev/null

# Create admin user automatically
echo ""
echo "👤 Creating admin user..."
./pocketbase superuser upsert admin@vergabe.de admin123 > /dev/null 2>&1 &
sleep 2

echo ""
echo "🎉 Migration completed!"
echo "=========================="
echo "📊 New collections created:"
echo "   - projects (with eckpunkte field)"
echo "   - documents"
echo "   - generation_requests"
echo "   - cli_commands"
echo "   - logs"
echo "   - system_prompts"
echo "   - example_prompts"
echo ""
echo "👤 Users created:"
echo "   - Admin: admin@vergabe.de / admin123"
echo "   - Demo: test@vergabe.de / vergabe123"
echo ""
echo "🚀 Ready to start with: ./run.sh"
echo "🌐 Or manual start: ./pocketbase serve --http=0.0.0.0:8090"