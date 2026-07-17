@echo off
title MQnet : Unjeong Sanne - Local Runner

:menu
cls
echo ========================================================
echo   MQnet : Unjeong Sanne Local Integration Runner
echo ========================================================
echo.
echo [1] Run Unified Mode (FastAPI serves built frontend - Port 8080)
echo [2] Run Dev Mode (Vite Dev Server on 5173 + FastAPI on 8080)
echo [3] Rebuild Frontend (npm run build)
echo [4] Exit
echo.

set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto run_unified
if "%choice%"=="2" goto run_dev
if "%choice%"=="3" goto build_fe
if "%choice%"=="4" goto exit_l
goto invalid

:run_unified
if not exist backend\.env (
    echo [ERROR] backend\.env file not found!
    echo Creating .env from .env.template...
    copy backend\.env.template backend\.env
    echo Please configure your .env file and run again.
    pause
    goto menu
)
echo [INFO] Rebuilding frontend to ensure password field and latest updates are compiled...
cd frontend
call npm run build
cd ..
echo [INFO] Starting Backend uvicorn server... http://localhost:8080
cd backend
call .venv\Scripts\activate.bat
python main.py
goto exit_l

:run_dev
if not exist backend\.env (
    echo [ERROR] backend\.env file not found!
    echo Creating .env from .env.template...
    copy backend\.env.template backend\.env
    echo Please configure your .env file and run again.
    pause
    goto menu
)
echo [INFO] Running Frontend dev server (5173) and Backend server (8080) in separate windows...
start "MQnet Backend" cmd /k "cd backend && call .venv\Scripts\activate.bat && python main.py"
start "MQnet Frontend" cmd /k "cd frontend && npm run dev"
goto exit_l

:build_fe
echo [INFO] Building Frontend... (generating dist)
cd frontend
call npm run build
cd ..
echo [SUCCESS] Frontend built successfully.
pause
goto menu

:invalid
echo Invalid choice. Please enter a number between 1 and 4.
pause
goto menu

:exit_l
exit
