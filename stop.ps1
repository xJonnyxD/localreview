Write-Host "=== LocalReview - Deteniendo servicios ===" -ForegroundColor Cyan

# Detener procesos de Node y Uvicorn
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "uvicorn" -ErrorAction SilentlyContinue | Stop-Process -Force

# Detener Docker
docker compose down

Write-Host "`nTodos los servicios detenidos." -ForegroundColor Green
