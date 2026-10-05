@echo off
setlocal enabledelayedexpansion

:: Set window title and color
title CollabRoom - Starting Servers...
color 0B

echo ============================================================
echo         CollabRoom - Local Development Launcher
echo ============================================================
echo.

:: Ensure we are in the project root directory
cd /d "%~dp0"

:: 1. Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Node.js is not installed or not found in PATH!
    echo Please install Node.js 18+ from https://nodejs.org/ and try again.
    echo.
    pause
    exit /b 1
)

:: 2. Check if npm is installed
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] npm is not found in PATH!
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js and npm detected.

:: 3. Setup .env if it does not exist
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] .env not found. Creating .env from .env.example...
        copy ".env.example" ".env" >nul
        echo [OK] Created .env file.
    )
)

:: 4. Check dependencies (node_modules)
if not exist "node_modules" (
    echo [INFO] Installing dependencies. Please wait...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        color 0C
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
)

:: 5. Generate Prisma Client if needed
echo [INFO] Generating Prisma client...
call npm --workspace=apps/api run prisma:generate >nul 2>&1

:: 6. Launch browser automatically after 5 seconds in background
start "" /B cmd /c "timeout /t 5 /nobreak >nul && start http://localhost:3000"

:: 7. Start the Development Servers
echo.
echo ============================================================
echo  Starting Frontend on http://localhost:3000
echo  Starting Backend API on http://localhost:5000
echo ============================================================
echo.
echo Press Ctrl+C in this window at any time to stop the servers.
echo.

title CollabRoom [Running on http://localhost:3000]
call npm run dev

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [INFO] Server stopped with code %ERRORLEVEL%.
)

pause
