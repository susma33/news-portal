@echo off
setlocal

cd /d "%~dp0"

echo Starting the customer site at http://localhost:5173
start "NewsIntel Customer" /D "%~dp0apps\customer" cmd /k "npm run dev -- --port 5173 --strictPort"

echo Starting the admin site at http://localhost:5174
start "NewsIntel Admin" /D "%~dp0apps\admin" cmd /k "npm run dev -- --port 5174 --strictPort"

echo.
echo Both development servers are running in separate windows.
echo Close those windows to stop the servers.
endlocal
