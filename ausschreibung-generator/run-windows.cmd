@echo off
echo.
echo 🏛️ Vergabedokument-Generator - Windows Start
echo ============================================
echo.

REM Change to the script directory
cd /d "%~dp0"

REM Check if we're in the right directory
if not exist "pb_public\index.html" (
    echo ❌ Wrong directory! Please run from project root.
    echo Expected: pb_public\index.html
    pause
    exit /b 1
)

REM Download PocketBase if not exists
if not exist "pocketbase.exe" (
    echo 📥 Downloading PocketBase for Windows...
    powershell -Command "& {try { Invoke-WebRequest -Uri 'https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_windows_amd64.zip' -OutFile 'pocketbase.zip' -ErrorAction Stop; Expand-Archive -Path 'pocketbase.zip' -DestinationPath '.' -Force; Remove-Item 'pocketbase.zip'; echo '✅ PocketBase installed' } catch { echo '❌ Download failed'; exit 1 }}"
)

REM Create directories if needed
if not exist "pb_data" mkdir pb_data
if not exist "pb_migrations" mkdir pb_migrations
if not exist "pb_public" mkdir pb_public
if not exist "pb_hooks" mkdir pb_hooks

echo.
echo 🚀 Starting application...
echo.
echo 📍 Access URLs:
echo    🪟 Windows: http://localhost:8090
echo    🔧 Admin:   http://localhost:8090/_/
echo.
echo 🛑 Press Ctrl+C to stop
echo.

REM Start PocketBase
pocketbase.exe serve --http=0.0.0.0:8090

pause