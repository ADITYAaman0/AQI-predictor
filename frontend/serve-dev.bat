@echo off
REM Development server for Leaflet.js frontend on Windows
echo Starting Leaflet.js Frontend Development Server...
echo.
echo Frontend: http://localhost:8080
echo Backend API: http://localhost:8000/api/v1
echo.
echo Press Ctrl+C to stop
echo.
python serve-dev.py
pause