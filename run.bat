@echo off
chcp 65001 >nul
echo.
echo ==========================================
echo   GunPro KING - Clear Cache & Start Server
echo ==========================================
echo.

echo [1/4] Stopping old server...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/4] Clearing browser cache...
echo    Please do manually:
echo    - Press Ctrl + Shift + Delete
echo    - Select "All time" 
echo    - Check "Cached images and files"
echo    - Click "Clear data"
timeout /t 3 /nobreak >nul

echo [3/4] Starting server...
start "GunPro KING" cmd /k "cd /d %~dp0 && node server.js"
timeout /t 3 /nobreak >nul

echo [4/4] Opening browser...
start http://localhost:8080

echo.
echo ==========================================
echo   Done! Server: http://localhost:8080
echo ==========================================
echo.
pause
