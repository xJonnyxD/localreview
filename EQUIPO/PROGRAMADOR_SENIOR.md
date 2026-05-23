# 💻 Programador Senior — LocalReview

## Rol
Soy el **Programador Senior** de LocalReview. Implemento código limpio siguiendo los patrones del proyecto.

## Proyecto
- **Path:** `C:\Users\Jonny Quintanilla\Desktop\localreview-main`
- **Backend:** FastAPI 0.135 + Python 3.14 + SQLAlchemy 2.0 async + Motor (MongoDB) + Redis
- **Frontend:** React 19 + TypeScript 5.9 + Vite 8 + Tailwind 4 + Zustand

## IMPORTANTE — Notas de Entorno
```python
# Python 3.14 en Windows requiere SelectorEventLoop para asyncpg/psycopg3
# El fix ya está en main.py - NO cambiar esto
import sys
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
```
- PostgreSQL corre en **puerto 5434** (no 5432)
- Driver PostgreSQL: `postgresql+psycopg` (psycopg3), NO asyncpg para SQLAlchemy

## Patrones del Proyecto

### Backend — SIEMPRE seguir estos patrones:
```python
# Router pattern
@router.get("/endpoint")
async def my_endpoint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),       # PostgreSQL
):
    mongo = get_mongodb()                      # MongoDB
    redis = get_redis()                        # Redis
    ...

# Service pattern (MongoDB)
async def my_service(db: AsyncIOMotorDatabase, ...) -> dict:
    ...

# Schema pattern (Pydantic v2)
class MyRequest(BaseModel):
    field: str
    optional_field: str | None = None
```

### Frontend — SIEMPRE seguir estos patrones:
```tsx
// Componente funcional con Tailwind
const MyComponent: React.FC<Props> = ({ prop }) => {
  const { user } = useAuthStore();  // Zustand store
  
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      ...
    </div>
  );
};

// API call pattern
const data = await api.get('/api/v1/endpoint').then(r => r.data);
```

## Estructura de archivos clave

### Backend
```
backend/app/
├── main.py              ← Entry point (con fix SelectorEventLoop)
├── config.py            ← Settings (postgres_url usa psycopg3)
├── dependencies.py      ← get_current_user, require_business_owner, require_admin
├── auth/router.py       ← /api/v1/auth/...
├── businesses/
│   ├── models.py        ← SQLAlchemy Business, Category, BusinessHours
│   ├── router.py        ← /api/v1/businesses/...
│   ├── schemas.py       ← BusinessCreate, BusinessResponse, etc.
│   └── service.py       ← business_to_response() — NOTA: lat/lng retorna None
├── reviews/
│   ├── router.py        ← /api/v1/reviews/... (ya con BackgroundTasks)
│   ├── schemas.py       ← ReviewCreate, ReviewResponse, etc.
│   └── service.py       ← create_review, format_review, etc.
├── dashboard/router.py  ← /api/v1/dashboard/... (ya con filtro ownership)
├── comments/
│   ├── router.py        ← GET paginado: ?page=1&limit=20
│   └── service.py       ← list_comments_by_review retorna (items, total)
├── photos/router.py     ← POST /upload con Form(review_id)
├── sync/tasks.py        ← _recalculate_rating(business_id)
└── db/
    ├── postgres.py      ← get_db() → AsyncSession
    ├── mongodb.py       ← get_mongodb() → AsyncIOMotorDatabase
    └── redis.py         ← get_redis()
```

### Frontend
```
frontend/src/
├── App.tsx              ← Rutas principales
├── api/
│   ├── client.ts        ← Axios con interceptor JWT
│   ├── auth.ts          ← login, register, refreshToken
│   ├── businesses.ts    ← getBusinesses, getBusinessById, getCategories
│   └── reviews.ts       ← getReviews, createReview, toggleHelpful
├── components/
│   ├── layout/Header.tsx
│   ├── business/BusinessCard.tsx
│   └── review/
│       ├── ReviewCard.tsx   ← Tiene botón "Comentar" sin funcionalidad
│       └── StarRating.tsx
├── pages/
│   ├── HomePage.tsx
│   ├── SearchPage.tsx       ← Necesita toggle Lista/Mapa
│   ├── BusinessDetailPage.tsx
│   ├── DashboardPage.tsx    ← Necesita UI respuesta de dueño
│   └── ProfilePage.tsx      ← Botón "Editar" no funciona
├── stores/
│   └── authStore.ts         ← Zustand: user, tokens
└── types/index.ts           ← TypeScript interfaces
```

## Mi flujo de trabajo
1. **Leo** los archivos relevantes antes de modificar
2. **Implemento** el cambio mínimo correcto
3. **Reporto**: archivos modificados, qué probar, edge cases
4. **Señalo** pero NO corrijo problemas secundarios sin aprobación

## Tareas pendientes Fase 2

### 2.2 Mapa Leaflet — Fix urgente primero
**Problema:** `business_to_response()` en `businesses/router.py` siempre retorna lat/lng como None.
**Fix:** Usar `ST_X(location::geometry)` y `ST_Y(location::geometry)` en la query.

### 2.3 Formulario crear negocio
**Crear:** `frontend/src/pages/CreateBusinessPage.tsx`
**Modificar:** `frontend/src/App.tsx` (ruta), `DashboardPage.tsx` (botón), `api/businesses.ts` (createBusiness)

### 2.4 Toast notifications
**Crear:** `frontend/src/stores/toastStore.ts` + `components/ui/Toast.tsx`

### 2.5 UI respuesta dueño
**Modificar:** `frontend/src/pages/DashboardPage.tsx`
**API existente:** `POST /api/v1/reviews/{id}/respond` con `{"text": "..."}`
