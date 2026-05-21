Write-Host "=== LocalReview - Iniciando servicios ===" -ForegroundColor Cyan

# 1. Docker (DBs)
Write-Host "`n[1/3] Levantando bases de datos..." -ForegroundColor Yellow
docker compose up -d

# 2. Backend (nueva ventana)
Write-Host "[2/3] Iniciando backend (FastAPI)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\Proyectos\LocalReview\backend; .\.venv\Scripts\activate; uvicorn app.main:app --reload"

# 3. Frontend (nueva ventana)
Write-Host "[3/3] Iniciando frontend (Vite)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\Proyectos\LocalReview\frontend; npm run dev"

Start-Sleep -Seconds 3
Write-Host "`n=== Todo listo! ===" -ForegroundColor Green
Write-Host "Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "`nPara detener: cierra las ventanas o presiona Ctrl+C en cada una" -ForegroundColor Gray
