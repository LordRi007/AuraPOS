Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Starting AuraPos POS System (React + Laravel)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

Write-Host "[1/2] Starting Laravel backend at http://127.0.0.1:8000..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k cd backend && php artisan serve --port=8000"

Write-Host "[2/2] Starting Vite Frontend at http://localhost:5173..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k npm.cmd run dev"

Write-Host "`nBoth servers have been launched in separate windows!" -ForegroundColor Green
Write-Host "- Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "- Backend:  http://127.0.0.1:8000" -ForegroundColor White
