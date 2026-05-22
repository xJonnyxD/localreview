# LocalReview

Plataforma de reseñas de negocios locales para El Salvador.  
Desarrollada con FastAPI + React 19/TypeScript + PostgreSQL/PostGIS + **Apache Cassandra** + Redis.

---

## Inicio rápido

### Requisitos previos
- Docker Desktop
- Python 3.12+
- Node.js 20+

### 1. Levantar servicios

```powershell
cd C:\Users\Jonny Quintanilla\Desktop\localreview-main

# Inicia PostgreSQL, MongoDB, Redis y el cluster Cassandra de 2 nodos
# Cassandra tarda ~2 minutos en estar lista la primera vez
docker compose up -d

# Verificar estado
docker compose ps
```

### 2. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt

# Migraciones PostgreSQL
alembic upgrade head

# Seed de datos de prueba
python scripts/seed.py

# Iniciar API
uvicorn app.main:app --reload
```

Documentación interactiva → http://localhost:8000/docs

### 3. Frontend

```powershell
cd frontend
npm install
npm run dev
```

App → http://localhost:5173

### Credenciales de prueba

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Usuario | maria.lopez@email.com | password123 |
| Dueño | owner@localreview.sv | password123 |
| Admin | admin@localreview.sv | password123 |

---

## Arquitectura de bases de datos

| Base de datos | Uso |
|---|---|
| **PostgreSQL** | Usuarios, negocios, sesiones (datos estructurados relacionales) |
| **Cassandra** | Reseñas y comentarios (escritura masiva, paginación nativa) |
| Redis | Caché y sesiones JWT |
| MongoDB | Legado (mantenido en docker-compose, no usado en producción) |

### Cluster Cassandra — 2 nodos

```
cassandra1 (seed)  →  localhost:9042
cassandra2         →  se une automáticamente al cluster
```

- Keyspace: `localreview`
- Replicación: `NetworkTopologyStrategy`, `RF = 2` (copia en ambos nodos)
- Schema CQL → [`backend/cassandra/init.cql`](backend/cassandra/init.cql)

---

## API Endpoints

### Autenticación

| Método | Ruta | Descripción | Auth requerida |
|--------|------|-------------|---------------|
| `POST` | `/api/v1/auth/login` | Login — retorna `access_token` y `refresh_token` | No |
| `POST` | `/api/v1/auth/register` | Registro de nuevo usuario | No |
| `POST` | `/api/v1/auth/refresh` | Renovar access token | No |
| `GET`  | `/api/v1/auth/me` | Perfil del usuario autenticado | ✅ Bearer |

### Negocios

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET`    | `/api/v1/businesses` | Lista paginada (`?page&limit&category`) | No |
| `GET`    | `/api/v1/businesses/{id}` | Detalle de un negocio | No |
| `POST`   | `/api/v1/businesses` | Crear negocio | `business_owner` |
| `PATCH`  | `/api/v1/businesses/{id}` | Actualizar negocio | `business_owner` |
| `DELETE` | `/api/v1/businesses/{id}` | Eliminar negocio | `admin` |

### Reseñas *(almacenadas en Cassandra)*

| Método | Ruta | Descripción | Auth | Paginación |
|--------|------|-------------|------|-----------|
| `POST`   | `/api/v1/reviews` | Crear reseña | ✅ Bearer | — |
| `GET`    | `/api/v1/reviews/business/{id}` | Reseñas de un negocio | No | `?page=1&limit=20&sort=newest` |
| `GET`    | `/api/v1/reviews/user/{id}` | Reseñas de un usuario | No | `?page=1&limit=20` |
| `GET`    | `/api/v1/reviews/{review_id}` | Detalle de una reseña | No | — |
| `PATCH`  | `/api/v1/reviews/{review_id}` | Actualizar reseña | Autor / Admin | — |
| `DELETE` | `/api/v1/reviews/{review_id}` | Eliminar reseña | Autor / Admin | — |
| `POST`   | `/api/v1/reviews/{review_id}/helpful` | Votar como útil | ✅ Bearer | — |
| `POST`   | `/api/v1/reviews/{review_id}/respond` | Respuesta del dueño | `business_owner` | — |

**Parámetros de paginación:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `page`  | int | 1  | Número de página |
| `limit` | int | 20 | Resultados por página (máx 100) |
| `sort`  | str | `newest` | `newest` \| `oldest` \| `highest` \| `lowest` \| `helpful` |

**Ejemplo de respuesta paginada:**
```json
{
  "items": [ { "id": "...", "rating": 5, "text": "Excelente!" } ],
  "total": 42,
  "page":  1,
  "limit": 20
}
```

### Comentarios *(almacenados en Cassandra)*

| Método | Ruta | Descripción | Auth | Paginación |
|--------|------|-------------|------|-----------|
| `GET`    | `/api/v1/reviews/{review_id}/comments` | Listar comentarios | No | `?page=1&limit=20` |
| `POST`   | `/api/v1/reviews/{review_id}/comments` | Agregar comentario | ✅ Bearer | — |
| `PATCH`  | `/api/v1/comments/{comment_id}` | Editar comentario | Autor / Admin | — |
| `DELETE` | `/api/v1/comments/{comment_id}` | Eliminar comentario | Autor / Admin | — |

### Dashboard *(solo `business_owner`)*

| Método | Ruta | Descripción | Paginación |
|--------|------|-------------|-----------|
| `GET` | `/api/v1/dashboard/stats` | Estadísticas de SOLO los negocios propios | — |
| `GET` | `/api/v1/dashboard/reviews` | Reseñas de negocios propios | `?page&limit&business_id` |

### Búsqueda y Fotos

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET`  | `/api/v1/search` | Búsqueda por texto, categoría, rating, ubicación | No |
| `POST` | `/api/v1/photos/upload` | Subir foto (vincula a reseña con `review_id`) | ✅ Bearer |
| `GET`  | `/api/v1/health` | Estado del servidor | No |

---

## Cassandra — Distribución de datos

### Verificar estado del cluster

```bash
# Estado y token ranges de cada nodo
docker exec localreview-cassandra1 nodetool status

# Distribución del keyspace
docker exec localreview-cassandra1 nodetool describering localreview

# CQL interactivo
docker exec -it localreview-cassandra1 cqlsh
USE localreview;
DESCRIBE tables;
SELECT business_id, rating, user_display_name FROM reviews_by_business LIMIT 10;
```

### Tablas y estrategia de partición

| Tabla | Partition Key | Clustering | Propósito |
|-------|--------------|------------|-----------|
| `reviews` | `id` | — | Lookup por ID de reseña |
| `reviews_by_business` | `business_id` | `created_at DESC, id` | Listar reseñas de un negocio |
| `reviews_by_user` | `user_id` | `created_at DESC, id` | Listar reseñas de un usuario |
| `comments` | `id` | — | Lookup por ID de comentario |
| `comments_by_review` | `review_id` | `created_at ASC, id` | Listar comentarios de una reseña |

---

## Backup y Recuperación

### Backup manual con nodetool (SSTables)

```powershell
# Snapshot en ambos nodos con timestamp automático
.\backend\scripts\backup\manual_backup.ps1

# Con tag personalizado
.\backend\scripts\backup\manual_backup.ps1 -tag "antes_deploy_v2"

# Listar snapshots existentes
docker exec localreview-cassandra1 nodetool listsnapshots
```

### Herramienta de terceros — Export JSON

```powershell
cd backend

# Exportar todas las tablas a archivos JSONL
.venv\Scripts\python scripts\backup\third_party_backup.py --output ..\backups\cassandra

# Ver todas las opciones
.venv\Scripts\python scripts\backup\third_party_backup.py --help
```

### Restaurar

```powershell
# Restaurar desde snapshot nodetool
.\backend\scripts\backup\restore_backup.ps1 -tag "antes_deploy_v2"

# Restaurar desde export JSON
cd backend
.venv\Scripts\python scripts\backup\third_party_backup.py --restore --input ..\backups\cassandra\2026-05-22T12-00-00
```

---

## Tests

```powershell
cd backend

# Todos los tests con verbose
.venv\Scripts\pytest tests/ -v

# Con reporte de cobertura
.venv\Scripts\pytest tests/ --cov=app --cov-report=term-missing

# Un archivo específico
.venv\Scripts\pytest tests/test_dashboard.py -v
.venv\Scripts\pytest tests/test_comments.py -v
```

---

## Bugs corregidos (Fase 1)

| # | Severidad | Bug | Fix |
|---|-----------|-----|-----|
| 1 | 🔴 SEGURIDAD | Dashboard mostraba datos de **todos** los negocios | Filtro por `owner_id` en PostgreSQL antes de consultar Cassandra |
| 2 | 🔴 DATOS | `avg_rating` nunca se recalculaba | `BackgroundTasks` llama a `_recalculate_rating` tras cada cambio |
| 3 | 🟡 UX | País por defecto era `"MX"` | Cambiado a `"SV"` en model y schema |
| 4 | 🟡 FUNC | Fotos no se vinculaban a la reseña | `push_photo_to_review()` actualiza la lista en Cassandra |
| 5 | 🟡 ESCALA | Comentarios retornaban lista plana con límite 500 | Paginación `{items, total, page, limit}` con Cassandra |
