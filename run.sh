#!/bin/bash

echo "🏛️ Vergabedokument-Generator"
echo "============================"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if we're in the right directory  
if [ ! -f "ausschreibung-generator/pb_public/index.html" ]; then
    echo "❌ Wrong directory! Please run from project root."
    echo "Expected: ausschreibung-generator/pb_public/index.html"
    exit 1
fi

# Change to ausschreibung-generator directory
cd ausschreibung-generator

# Download PocketBase if not exists
if [ ! -f "pocketbase" ]; then
    echo "📥 Downloading PocketBase..."
    
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    
    case $ARCH in
        x86_64) ARCH="amd64" ;;
        aarch64|arm64) ARCH="arm64" ;;
        *) echo "❌ Unsupported architecture: $ARCH"; exit 1 ;;
    esac
    
    case $OS in
        linux) OS="linux" ;;
        darwin) OS="darwin" ;;
        *) echo "❌ Unsupported OS: $OS"; exit 1 ;;
    esac
    
    # Get latest version and download
    if command_exists curl; then
        DOWNLOAD_URL=$(curl -s https://api.github.com/repos/pocketbase/pocketbase/releases/latest | grep -o '"browser_download_url": *"[^"]*'${OS}'_'${ARCH}'[^"]*"' | cut -d'"' -f4)
        curl -L -o pocketbase.zip "$DOWNLOAD_URL"
    elif command_exists wget; then
        DOWNLOAD_URL=$(wget -qO- https://api.github.com/repos/pocketbase/pocketbase/releases/latest | grep -o '"browser_download_url": *"[^"]*'${OS}'_'${ARCH}'[^"]*"' | cut -d'"' -f4)
        wget -O pocketbase.zip "$DOWNLOAD_URL"
    else
        echo "❌ Need curl or wget to download PocketBase"
        exit 1
    fi
    
    if [ -f "pocketbase.zip" ] && [ -s "pocketbase.zip" ]; then
        unzip -q pocketbase.zip
        chmod +x pocketbase
        rm pocketbase.zip
        echo "✅ PocketBase installed"
    else
        echo "❌ Download failed"
        exit 1
    fi
fi

# Create .env if not exists
if [ ! -f ".env" ]; then
    echo "📄 Creating .env..."
    cat > .env << 'EOF'
# Vergabedokument-Generator Configuration
PB_ADMIN_EMAIL=admin@vergabe.de
PB_ADMIN_PASSWORD=admin123
HOST=0.0.0.0
PORT=8090
EOF
    echo "✅ .env created"
fi

# Create directories if needed
mkdir -p pb_data pb_migrations pb_public pb_hooks

echo ""
echo "🚀 Starting application..."
echo ""
WSL_IP=$(hostname -I | awk '{print $1}')
echo "📍 Access URLs:"
echo "   🪟 Windows:   http://localhost:8090 (oder http://$WSL_IP:8090)"
echo "   🐧 WSL/Linux: http://127.0.0.1:8090"
echo "   🔧 Admin:     http://localhost:8090/_/ (oder http://$WSL_IP:8090/_/)"
echo ""
echo "💡 Windows-Benutzer: Verwenden Sie run-windows.cmd für bessere Kompatibilität"
echo ""
echo "🔑 Demo Login: test@vergabe.de / vergabe123"
echo ""
echo "🛑 Press Ctrl+C to stop"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping application..."
    echo "✅ Stopped successfully!"
    echo ""
    echo "To restart: ./run.sh"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start PocketBase in background to avoid WSL/Windows blocking issues
nohup ./pocketbase serve --http=0.0.0.0:8090 > pocketbase.log 2>&1 &
PB_PID=$!

echo "✅ Server starting..."
echo "📝 Logs werden in pocketbase.log gespeichert"
echo ""

# Wait for server to be ready
sleep 3

# Test if server is responding
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8090 | grep -q "200"; then
    echo "🌐 Server is responding properly!"
    echo "🎯 Open your Windows browser: http://localhost:8090"
else
    echo "⚠️  Server started but may need a moment to initialize"
    echo "🎯 Try: http://localhost:8090"
fi

echo ""
echo "📋 Commands:"
echo "   View logs: tail -f ausschreibung-generator/pocketbase.log"
echo "   Stop server: kill $PB_PID"
echo ""

# Show initial logs
echo "🔍 Initial logs:"
tail -n 5 pocketbase.log 2>/dev/null || echo "No logs yet..."
echo ""

# Show real-time logs in background
echo "📊 Live logs (last 10 lines, updates every 2 seconds):"
echo "----------------------------------------"
while true; do
    if [ -f "pocketbase.log" ]; then
        clear
        echo "🏛️ Vergabedokument-Generator - Live Logs"
        echo "========================================"
        echo "Server PID: $PB_PID"
        echo "Time: $(date)"
        echo ""
        tail -n 10 pocketbase.log
        echo ""
        echo "📋 Commands:"
        echo "   View full logs: tail -f ausschreibung-generator/pocketbase.log"
        echo "   Stop server: kill $PB_PID"
        echo ""
        echo "Press Ctrl+C to stop server and exit..."
    fi
    sleep 2
done

# Stop the server
echo "🛑 Stopping server..."
kill $PB_PID 2>/dev/null
echo "✅ Server stopped!"