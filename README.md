<div align="center">

# 🏪 LocalReview

**Plataforma de reseñas de negocios locales para El Salvador**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Cassandra](https://img.shields.io/badge/Cassandra-4.1-1287B1?style=flat-square&logo=apache-cassandra)](https://cassandra.apache.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://www.docker.com)

[Demo](#) · [Documentación API](http://localhost:8000/docs) · [Reportar Bug](#)

</div>

---

## ✨ Características

- 🔐 **Autenticación JWT** — Registro, login, roles diferenciados (usuario / dueño / admin)
- 🏬 **Gestión de Negocios** — Crear, editar, fotos, horarios por día, categorías
- ⭐ **Sistema de Reseñas** — Calificación 1-5, votos útiles, respuesta del dueño
- 💬 **Comentarios** — Hilos por reseña con paginación
- 📊 **Dashboard** — Estadísticas en tiempo real para dueños de negocio
- 🔍 **Búsqueda Avanzada** — Por texto, categoría, ciudad, calificación
- 📸 **Subida de Fotos** — Para negocios y reseñas
- 🗺️ **Geolocalización** — Coordenadas lat/lng con centro en San Salvador

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Backend** | Python 3.12 + FastAPI |
| **Base de Datos** | Apache Cassandra 4.1 (cluster 2 nodos) |
| **Frontend** | React 19 + TypeScript + Vite |
| **Estilos** | Tailwind CSS |
| **Estado** | Zustand |
| **Auth** | JWT (python-jose + passlib/bcrypt) |
| **Infra** | Docker Compose |

---

## 🚀 Inicio Rápido

### Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Python 3.12+](https://www.python.org/downloads/)
- [Node.js 20+](https://nodejs.org/)

### 1. Clonar el repositorio

```bash
git clone https://github.com/xJonnyxD/LocalReview.git
cd LocalReview
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

El archivo `.env` por defecto funciona para desarrollo local:

```env
CASSANDRA_HOSTS=localhost
CASSANDRA_KEYSPACE=localreview
CASSANDRA_PORT=9042
JWT_SECRET_KEY=localreview-dev-secret-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
DEBUG=True
CORS_ORIGINS=["http://localhost:5173"]
UPLOAD_DIR=./uploads
```

### 3. Levantar la base de datos

```bash
docker compose up -d
```

> ⏳ Espera ~30 segundos para que Cassandra inicialice el cluster de 2 nodos.

### 4. Configurar el backend

```bash
cd backend

# Crear entorno virtual
python -m venv .venv

# Activar (Windows)
.\.venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Poblar base de datos con datos de prueba
python scripts/seed.py

# Iniciar servidor
python -m uvicorn app.main:app --reload
```

✅ API disponible en → http://localhost:8000  
📚 Documentación Swagger → http://localhost:8000/docs

### 5. Configurar el frontend

```bash
# En otra terminal
cd frontend
npm install
npm run dev
```

✅ App disponible en → http://localhost:5173

---

## 👥 Cuentas de Prueba

| Rol | Email | Contraseña |
|-----|-------|-----------|
| 👤 Usuario | `maria.lopez@email.com` | `password123` |
| 🏬 Dueño | `owner@localreview.sv` | `password123` |
| 🛡️ Admin | `admin@localreview.sv` | `password123` |

---

## 🏗️ Arquitectura

```
localreview/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + lifespan
│   │   ├── models.py            # Dataclasses: User, Business, Category
│   │   ├── db/
│   │   │   └── cassandra.py     # Conexión y helpers Cassandra
│   │   ├── auth/                # JWT, registro, login
│   │   ├── businesses/          # CRUD negocios
│   │   ├── reviews/             # Sistema de reseñas
│   │   ├── comments/            # Comentarios paginados
│   │   ├── dashboard/           # Stats del dueño
│   │   ├── photos/              # Upload de imágenes
│   │   ├── search/              # Búsqueda avanzada
│   │   └── sync/                # Recálculo de avg_rating
│   └── scripts/
│       └── seed.py              # Datos de prueba
├── frontend/
│   ├── src/
│   │   ├── api/                 # Clientes HTTP (axios)
│   │   ├── stores/              # Estado global (Zustand)
│   │   ├── pages/               # Vistas principales
│   │   └── components/          # Componentes reutilizables
├── docker-compose.yml
└── .env.example
```

### Base de Datos — Apache Cassandra

El proyecto usa **Cassandra como única base de datos**, con tablas desnormalizadas optimizadas para cada patrón de consulta:

| Tabla | Partition Key | Propósito |
|-------|--------------|-----------|
| `users` | `id` | Lookup por UUID |
| `users_by_email` | `email` | Login / verificación |
| `businesses` | `id` | Detalle de negocio |
| `businesses_by_slug` | `slug` | URL amigable |
| `businesses_by_owner` | `owner_id` | Dashboard del dueño |
| `reviews` | `id` | Detalle de reseña |
| `reviews_by_business` | `business_id` | Feed de un negocio |
| `reviews_by_user` | `user_id` | Historial de usuario |
| `comments` | `id` | Detalle de comentario |
| `comments_by_review` | `review_id` | Hilo de comentarios |
| `categories` | `id` | Catálogo de categorías |

### Cluster Cassandra — 2 Nodos

```
cassandra1 (seed)  →  localhost:9042
cassandra2         →  replica automática
```

- **Keyspace:** `localreview`
- **Replicación:** `NetworkTopologyStrategy`, RF = 2

---

## 📡 API Reference

### Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/v1/auth/register` | Crear cuenta (con opción `is_business_owner`) |
| `POST` | `/api/v1/auth/login` | Login → `access_token` + `refresh_token` |
| `POST` | `/api/v1/auth/refresh` | Renovar access token |
| `GET`  | `/api/v1/auth/me` | Perfil autenticado |

### Negocios

| Método | Ruta | Auth |
|--------|------|------|
| `GET`    | `/api/v1/businesses` | Público |
| `GET`    | `/api/v1/businesses/{id}` | Público |
| `GET`    | `/api/v1/businesses/categories` | Público |
| `POST`   | `/api/v1/businesses` | `business_owner` |
| `PATCH`  | `/api/v1/businesses/{id}` | `business_owner` |

### Reseñas

| Método | Ruta | Auth |
|--------|------|------|
| `GET`    | `/api/v1/reviews/business/{id}` | Público |
| `POST`   | `/api/v1/reviews` | Autenticado |
| `PATCH`  | `/api/v1/reviews/{id}` | Autor/Admin |
| `DELETE` | `/api/v1/reviews/{id}` | Autor/Admin |
| `POST`   | `/api/v1/reviews/{id}/helpful` | Autenticado |
| `POST`   | `/api/v1/reviews/{id}/respond` | `business_owner` |

### Otros

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`  | `/api/v1/search` | Búsqueda global |
| `POST` | `/api/v1/photos/upload` | Subir foto |
| `GET`  | `/api/v1/dashboard/stats` | Stats del dueño |
| `GET`  | `/api/v1/health` | Estado del servidor |

---

## 🔧 Comandos Útiles

```bash
# Ver estado del cluster Cassandra
docker exec localreview-cassandra1 nodetool status

# Consola CQL interactiva
docker exec -it localreview-cassandra1 cqlsh
USE localreview;
DESCRIBE tables;

# Detener todos los servicios
docker compose down

# Limpiar datos y empezar de cero
docker compose down -v
docker compose up -d
```

---

## 🧪 Tests

```bash
cd backend
.venv\Scripts\pytest tests/ -v --cov=app
```

---

## 📋 Roles del Sistema

| Rol | Permisos |
|-----|----------|
| `user` | Ver negocios, escribir reseñas y comentarios |
| `business_owner` | Todo lo anterior + crear/editar negocios + dashboard |
| `admin` | Acceso total + eliminar cualquier contenido |

---

## 📄 Licencia

MIT © 2025 [xJonnyxD](https://github.com/xJonnyxD)
