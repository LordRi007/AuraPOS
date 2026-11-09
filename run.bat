@echo off
title AuraPos Runner
echo ===================================================
echo Starting AuraPos POS System (React + Laravel)
echo ===================================================

echo [1/2] Starting Laravel backend at http://127.0.0.1:8000 ...
start "AuraPos Backend (Laravel)" cmd /k "cd backend && php artisan serve --port=8000"

echo [2/2] Starting Vite Frontend at http://localhost:5173 ...
start "AuraPos Frontend (Vite)" cmd /k "npm.cmd run dev"

echo.
echo Both servers have been launched in separate windows!
echo - Frontend: http://localhost:5173
echo - Backend:  http://127.0.0.1:8000
echo.
pause
