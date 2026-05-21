# LocalReview

Plataforma colaborativa web para buscar, evaluar y comentar negocios locales en El Salvador. Los usuarios pueden descubrir restaurantes, cafeterias, pupuserias, lugares turisticos y mas, basandose en resenas autenticas de la comunidad.

## Desarrollado por

**Jonny Quintanilla**

---

## Caracteristicas

- Busqueda de negocios por nombre, categoria, ubicacion y calificacion
- Sistema de resenas con calificacion por estrellas, etiquetas y fotos
- Hilos de comentarios en resenas
- Votos "util" en resenas
- Respuestas de propietarios de negocios
- Dashboard para duenos de negocios con metricas y resenas recientes
- Busqueda geoespacial por radio usando PostGIS
- Cache de resultados con Redis
- Datos reales de negocios en El Salvador

## Stack Tecnologico

### Backend
| Tecnologia | Uso |
|---|---|
| **FastAPI** | Framework web async |
| **PostgreSQL + PostGIS** | Datos estructurados + busqueda geoespacial |
| **MongoDB** | Resenas, comentarios, actividad de usuarios |
| **Redis** | Cache de endpoints de lectura |
| **SQLAlchemy 2.0** | ORM async para PostgreSQL |
| **Motor** | Driver async para MongoDB |
| **Alembic** | Migraciones de base de datos |
| **JWT** | Autenticacion con access + refresh tokens |
| **Celery** | Tareas en background (sincronizacion de ratings) |

### Frontend
| Tecnologia | Uso |
|---|---|
| **React 18 + TypeScript** | Interfaz de usuario |
| **Vite** | Build tool |
| **Tailwind CSS** | Estilos |
| **Zustand** | Estado global (auth) |
| **React Router v6** | Navegacion |
| **Axios** | Cliente HTTP con interceptor JWT |
| **Lucide React** | Iconos |

### Infraestructura
| Tecnologia | Uso |
|---|---|
| **Docker Compose** | Orquestacion de servicios de DB |

## Arquitectura de Base de Datos

El proyecto usa una arquitectura **poliglota** (multi-DB) donde cada tecnologia se usa segun sus fortalezas:

```
PostgreSQL (datos estructurados)        MongoDB (datos semi-estructurados)
├── users                               ├── reviews
├── businesses + PostGIS                ├── comments
├── categories                          └── user_activities
└── business_hours

Redis (cache)
├── business:detail:{id}   (TTL 10min)
├── search:results:{hash}  (TTL 2min)
└── session:{user_id}      (TTL 7d)
```

## Estructura del Proyecto

```
LocalReview/
├── docker-compose.yml         # PostgreSQL+PostGIS, MongoDB, Redis
├── .env.example               # Variables de entorno de ejemplo
├── start.ps1                  # Script para iniciar todos los servicios
├── stop.ps1                   # Script para detener todos los servicios
│
├── backend/
│   ├── app/
│   │   ├── main.py            # Entry point FastAPI
│   │   ├── config.py          # Configuracion via pydantic-settings
│   │   ├── dependencies.py    # Dependencias compartidas (auth, roles)
│   │   ├── auth/              # Register, login, JWT
│   │   ├── users/             # Perfiles de usuario
│   │   ├── businesses/        # CRUD de negocios + PostGIS
│   │   ├── reviews/           # CRUD de resenas (MongoDB)
│   │   ├── comments/          # Hilos de comentarios (MongoDB)
│   │   ├── search/            # Busqueda geo + filtros + cache
│   │   ├── photos/            # Upload y procesamiento de fotos
│   │   ├── dashboard/         # Panel para propietarios
│   │   ├── sync/              # Sincronizacion entre PostgreSQL y MongoDB
│   │   └── db/                # Conexiones a PostgreSQL, MongoDB, Redis
│   ├── alembic/               # Migraciones de base de datos
│   └── scripts/
│       └── seed.py            # Datos de ejemplo (negocios reales de El Salvador)
│
└── frontend/
    └── src/
        ├── api/               # Cliente API con interceptor JWT
        ├── components/        # Header, BusinessCard, ReviewCard, StarRating
        ├── pages/             # Home, Search, BusinessDetail, Profile, Dashboard
        ├── stores/            # Auth store (Zustand)
        └── types/             # Interfaces TypeScript
```

## Instalacion y Uso

### Requisitos previos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Python 3.12+](https://www.python.org/)
- [Node.js 18+](https://nodejs.org/)

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/localreview.git
cd localreview
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus valores (o usa los defaults para desarrollo local).

### 3. Levantar las bases de datos

```powershell
docker compose up -d
```

### 4. Instalar dependencias del backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt   # o: pip install -e .
```

### 5. Correr migraciones y seed

```powershell
# Habilitar extensiones PostGIS (primera vez)
python -c "import asyncio, asyncpg; asyncio.run(asyncpg.connect('postgresql://localreview:localreview_dev@localhost:5432/localreview', ssl=False).then(lambda c: c.execute('CREATE EXTENSION IF NOT EXISTS postgis')))"

# Migraciones
alembic upgrade head

# Datos de ejemplo (negocios reales de El Salvador)
python scripts/seed.py
```

### 6. Instalar dependencias del frontend

```powershell
cd ..\frontend
npm install
```

### 7. Iniciar todo

**Opcion rapida (PowerShell):**
```powershell
.\start.ps1
```

**Manual:**
```powershell
# Terminal 1 - Backend
cd backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 8. Acceder a la aplicacion

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

## Cuentas de prueba

| Rol | Email | Password |
|---|---|---|
| Usuario | maria.lopez@email.com | password123 |
| Business Owner | owner@localreview.sv | password123 |
| Admin | admin@localreview.sv | password123 |

## API Endpoints

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh

GET    /api/v1/users/me
PATCH  /api/v1/users/me
GET    /api/v1/users/{id}

GET    /api/v1/businesses
POST   /api/v1/businesses
GET    /api/v1/businesses/{id}
PATCH  /api/v1/businesses/{id}
GET    /api/v1/businesses/categories

POST   /api/v1/reviews
GET    /api/v1/reviews/{id}
GET    /api/v1/reviews/business/{business_id}
GET    /api/v1/reviews/user/{user_id}
PATCH  /api/v1/reviews/{id}
DELETE /api/v1/reviews/{id}
POST   /api/v1/reviews/{id}/helpful
POST   /api/v1/reviews/{id}/respond

POST   /api/v1/reviews/{id}/comments
GET    /api/v1/reviews/{id}/comments
PATCH  /api/v1/comments/{id}
DELETE /api/v1/comments/{id}

GET    /api/v1/search?q=&lat=&lng=&radius=&category_id=&min_rating=&price_level=&sort=

POST   /api/v1/photos/upload

GET    /api/v1/dashboard/stats
GET    /api/v1/dashboard/reviews
```

## Datos de El Salvador incluidos

El seed incluye 27 negocios reales distribuidos en:

- **San Salvador**: Los Cebollines, Tipicos Margoth, La Pampa Argentina, Viva Espresso, Ben's Coffee, Cafe San Martin, Pupuseria Lily, La Alquimia Cerveceria, Super Selectos Escalon, Farmacia San Nicolas, World Gym, Armando Funes Salon, Pollo Campero, Hospital de Diagnostico, Pan Lido, Tony Roma's, El Sopon Tipico
- **La Libertad**: La Marea, El Delfin Marisqueria, Playa El Tunco, Pupuseria La Cuscatleca
- **Sonsonate**: Hotel Decameron Salinitas, Ruta de las Flores
- **Santa Ana**: Lago de Coatepeque
- **Ahuachapan**: Parque Nacional El Imposible
- **Antiguo Cuscatlan**: iStore El Salvador, Multiplaza

## Licencia

MIT — Jonny Quintanilla
