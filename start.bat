@echo off
REM ============================================================
REM SPYRO WHATSAPP BOT - One-command launcher (Windows)
REM ============================================================
REM
REM What this does:
REM   1. Checks Node.js is installed
REM   2. Installs dependencies (first run only)
REM   3. Starts the bot + web UI
REM   4. Prints the URL where you can scan the QR or get a pairing code
REM
REM Usage: double-click this file, or run `start.bat` in Command Prompt
REM ============================================================

cd /d "%~dp0"

echo.
echo ========================================
echo   SPYRO WHATSAPP BOT - starting...
echo ========================================
echo.

REM 1. Check Node.js
where node >nul 2>&1
if errorlevel 1 (
  echo ❌ Node.js is not installed.
  echo    Install it from https://nodejs.org (use Node 20 or newer)
  pause
  exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js: %NODE_VERSION%

REM 2. Install deps if needed
if not exist node_modules (
  echo 📦 Installing dependencies (first run - takes 1-2 minutes)...
  call npm install
  echo.
) else (
  echo ✅ Dependencies already installed
)

REM 3. Check .env
if not exist .env (
  echo ⚠️ No .env file found. Copying from .env.example...
  copy .env.example .env
  echo    Edit .env to set your OWNER_JID, then re-run start.bat
  pause
  exit /b 1
)

REM 4. Check ffmpeg
where ffmpeg >nul 2>&1
if errorlevel 1 (
  echo ⚠️ ffmpeg not installed - media commands won't work.
  echo    Download from https://ffmpeg.org/download.html
  echo.
) else (
  echo ✅ ffmpeg found
)

REM 5. Start
echo.
echo ========================================
echo   🚀 STARTING BOT...
echo ========================================
echo.
echo   Web UI:  http://localhost:3000
echo.
echo   → Open that URL in your browser
echo   → You'll see a QR code (scan with WhatsApp)
echo   → OR use the 'Phone Pairing' tab to get an 8-char code
echo.
echo   Press Ctrl+C to stop the bot
echo ========================================
echo.

node src\index.js
pause
