@echo off
setlocal

cd /d "%~dp0"

echo Building customer site...
call npm run build:customer
if errorlevel 1 goto :failed

echo Building admin site...
call npm run build:admin
if errorlevel 1 goto :failed

echo Deploying both sites to Firebase Hosting...
firebase deploy --only hosting:customer,hosting:admin --project newsintel-ai
if errorlevel 1 goto :failed

echo.
echo Both sites were deployed successfully.
pause
exit /b 0

:failed
echo.
echo Build or deployment failed. Check the error above.
pause
exit /b 1
