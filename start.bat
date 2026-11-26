@echo off
REM =============================================
REM UNILIA AI Helpdesk Chatbot — Quick Start
REM Run this file to start the application
REM =============================================

echo.
echo  =======================================
echo   UNILIA AI Helpdesk Chatbot
echo   University of Livingstonia
echo  =======================================
echo.

REM Navigate to backend folder
cd /d "%~dp0backend"

REM Check virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found.
    echo Please run: py -3.12 -m venv venv
    echo Then run: venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)

REM Check .env file exists
if not exist ".env" (
    echo ERROR: .env file not found.
    echo Please copy .env.example to .env and fill in the values.
    pause
    exit /b 1
)

echo Starting UNILIA AI Helpdesk server...
echo.
echo  Student Chat:  http://localhost:8000/chat.html
echo  Admin Panel:   http://localhost:8000/admin.html
echo  API Explorer:  http://localhost:8000/docs
echo.
echo Press CTRL+C to stop the server.
echo.

call venv\Scripts\activate.bat
venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000
