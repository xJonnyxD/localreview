Write-Host "=== LocalReview - Iniciando servicios ===" -ForegroundColor Cyan
Write-Host "PostgreSQL en puerto 5434 (puertos 5432/5433 usados por Windows PostgreSQL)" -ForegroundColor DarkGray

# 1. Docker (DBs)
Write-Host "`n[1/3] Levantando bases de datos..." -ForegroundColor Yellow
docker compose up -d

# Esperar a que los contenedores esten listos
Start-Sleep -Seconds 5
Write-Host "  PostgreSQL, MongoDB y Redis levantados en Docker" -ForegroundColor Green

# 2. Backend (nueva ventana)
Write-Host "[2/3] Iniciando backend (FastAPI)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location 'C:\Users\Jonny Quintanilla\Desktop\localreview-main\backend'; .\.venv\Scripts\activate; uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

# 3. Frontend (nueva ventana)
Write-Host "[3/3] Iniciando frontend (Vite)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location 'C:\Users\Jonny Quintanilla\Desktop\localreview-main\frontend'; npm run dev"

Start-Sleep -Seconds 5
Write-Host "`n=== Todo listo! ===" -ForegroundColor Green
Write-Host "Backend:     http://localhost:8000" -ForegroundColor White
Write-Host "Frontend:    http://localhost:5173" -ForegroundColor White
Write-Host "API Docs:    http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Cuentas de prueba:" -ForegroundColor Cyan
Write-Host "  Usuario:  maria.lopez@email.com / password123" -ForegroundColor Gray
Write-Host "  Dueno:    owner@localreview.sv / password123" -ForegroundColor Gray
Write-Host "  Admin:    admin@localreview.sv / password123" -ForegroundColor Gray
Write-Host "`nPara detener: run stop.ps1 o cierra las ventanas" -ForegroundColor DarkGray
