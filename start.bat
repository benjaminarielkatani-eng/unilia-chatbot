@echo off
REM =============================================
REM UNILIA AI Helpdesk Chatbot — Quick Start
REM Double-click this file to start the app.
REM The app will be accessible on the network.
REM =============================================

echo.
echo  =======================================
echo   UNILIA AI Helpdesk Chatbot
echo   University of Livingstonia
echo  =======================================
echo.

cd /d "%~dp0backend"

if not exist "venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found.
    echo Run:  py -3.12 -m venv venv
    echo Then: venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)

if not exist ".env" (
    echo ERROR: .env file not found.
    echo Copy .env.example to .env and fill in the values.
    pause
    exit /b 1
)

echo Finding your Wi-Fi IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /R "IPv4.*10\." 2^>nul') do set WIFIIP=%%a
set WIFIIP=%WIFIIP: =%

echo.
echo  =========================================================
echo   Student Chat : http://localhost:8000/chat.html
echo   Admin Panel  : http://localhost:8000/admin.html
echo   API Explorer : http://localhost:8000/docs
if defined WIFIIP (
echo.
echo   On another laptop (same Wi-Fi):
echo   http://%WIFIIP%:8000/chat.html
)
echo  =========================================================
echo.
echo  Admin login: username=admin  password=unilia2024
echo.
echo  Press CTRL+C to stop.
echo.

call venv\Scripts\activate.bat
venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000
