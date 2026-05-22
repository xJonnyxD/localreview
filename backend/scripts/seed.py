"""
Seed script: populates the database with categories, businesses, users, and reviews
based on real locations in El Salvador.

Usage:
    cd backend
    python scripts/seed.py
"""

import asyncio
import sys
import types

# Fix for Python 3.14+ on Windows: force SelectorEventLoop for asyncpg compatibility
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())  # type: ignore

# asyncore shim for cassandra-driver on Python 3.12+
if "asyncore" not in sys.modules:
    _a = types.ModuleType("asyncore")
    class _D:
        def __init__(self, sock=None, map=None): pass
        def set_socket(self, s, map=None): pass
        def close(self): pass
    _a.dispatcher = _D  # type: ignore
    _a.loop = lambda **kw: None  # type: ignore
    _a.socket_map = {}  # type: ignore
    sys.modules["asyncore"] = _a

import random
import uuid
from datetime import datetime, time, timezone, timedelta

import asyncpg
from motor.motor_asyncio import AsyncIOMotorClient
from cassandra.cluster import Cluster
from cassandra.io.asyncioreactor import AsyncioConnection
from cassandra.policies import DCAwareRoundRobinPolicy
from cassandra.query import dict_factory

PG_DSN = "postgresql://localreview:localreview_dev@localhost:5434/localreview"
MONGO_URL = "mongodb://localhost:27017"
MONGO_DB = "localreview"
CASSANDRA_HOST = "localhost"
CASSANDRA_PORT = 9042
CASSANDRA_KEYSPACE = "localreview"

# ── Categories ──────────────────────────────────────────────────────────

CATEGORIES = [
    {"name": "Restaurantes", "slug": "restaurantes", "icon": "utensils"},
    {"name": "Cafeterias", "slug": "cafeterias", "icon": "coffee"},
    {"name": "Pupuserias", "slug": "pupuserias", "icon": "utensils"},
    {"name": "Panaderia", "slug": "panaderia", "icon": "cake"},
    {"name": "Comida Rapida", "slug": "comida-rapida", "icon": "burger"},
    {"name": "Mariscos", "slug": "mariscos", "icon": "fish"},
    {"name": "Hoteles", "slug": "hoteles", "icon": "bed"},
    {"name": "Bares y Vida Nocturna", "slug": "bares-vida-nocturna", "icon": "glass"},
    {"name": "Supermercados", "slug": "supermercados", "icon": "cart"},
    {"name": "Farmacias", "slug": "farmacias", "icon": "pill"},
    {"name": "Clinicas y Salud", "slug": "clinicas-salud", "icon": "heart"},
    {"name": "Talleres Automotrices", "slug": "talleres-automotrices", "icon": "wrench"},
    {"name": "Gimnasios", "slug": "gimnasios", "icon": "dumbbell"},
    {"name": "Salones de Belleza", "slug": "salones-belleza", "icon": "scissors"},
    {"name": "Tiendas de Ropa", "slug": "tiendas-ropa", "icon": "shirt"},
    {"name": "Turismo y Naturaleza", "slug": "turismo-naturaleza", "icon": "mountain"},
    {"name": "Educacion", "slug": "educacion", "icon": "book"},
    {"name": "Tecnologia", "slug": "tecnologia", "icon": "laptop"},
]

# ── Businesses (real places in El Salvador) ─────────────────────────────

BUSINESSES = [
    # San Salvador - Restaurantes
    {
        "name": "Los Cebollines",
        "slug": "los-cebollines",
        "description": "Restaurante de cocina guatemalteca y salvadorena con amplio menu, conocido por sus desayunos tipicos y ambiente familiar.",
        "address": "Centro Comercial La Gran Via, Boulevard Los Proceres",
        "city": "San Salvador",
        "state": "San Salvador",
        "postal_code": "01101",
        "phone": "+503 2245-0202",
        "website": "https://loscebollines.com",
        "lat": 13.6676,
        "lng": -89.2326,
        "price_level": 2,
        "categories": ["restaurantes"],
    },
    {
        "name": "Tipicos Margoth",
        "slug": "tipicos-margoth",
        "description": "El sabor autentico de la comida tipica salvadorena. Pupusas, tamales, platanos fritos y mas, preparados con recetas tradicionales.",
        "address": "Calle Los Sisimiles, Colonia Miramonte",
        "city": "San Salvador",
        "state": "San Salvador",
        "postal_code": "01101",
        "phone": "+503 2260-1455",
        "lat": 13.7034,
        "lng": -89.2258,
        "price_level": 1,
        "categories": ["restaurantes", "pupuserias"],
    },
    {
        "name": "Restaurante La Pampa Argentina",
        "slug": "la-pampa-argentina",
        "description": "Cortes de carne argentinos a la parrilla, pastas artesanales y vinos importados en un ambiente elegante.",
        "address": "Calle La Reforma 227, Colonia San Benito",
        "city": "San Salvador",
        "state": "San Salvador",
        "postal_code": "01101",
        "phone": "+503 2223-0092",
        "lat": 13.6932,
        "lng": -89.2360,
        "price_level": 4,
        "categories": ["restaurantes"],
    },
    {
        "name": "Restaurante El Sopón Tipico",
        "slug": "el-sopon-tipico",
        "description": "Famoso por sus sopas de pata, de res y gallina india. Comida casera salvadorena con el sabor de la abuela.",
        "address": "Boulevard Constitucion, San Salvador",
        "city": "San Salvador",
        "state": "San Salvador",
        "postal_code": "01101",
        "phone": "+503 2274-8333",
        "lat": 13.6978,
        "lng": -89.2150,
        "price_level": 2,
        "categories": ["restaurantes"],
    },
    {
        "name": "Tony Roma's El Salvador",
        "slug": "tony-romas-sv",
        "description": "Cadena internacional de costillas y parrilla con sucursal en Multiplaza. Ambiente moderno y menu variado.",
        "address": "Centro Comercial Multiplaza, Antiguo Cuscatlan",
        "city": "Antiguo Cuscatlan",
        "state": "La Libertad",
        "postal_code": "01501",
        "phone": "+503 2248-8888",
        "lat": 13.6714,
        "lng": -89.2518,
        "price_level": 3,
        "categories": ["restaurantes"],
    },
    # Cafeterias
    {
        "name": "Viva Espresso",
        "slug": "viva-espresso",
        "description": "Cafe de especialidad salvadoreno 100% arabica, cultivado en las montanas de Apaneca. Ambiente acogedor para trabajar o reunirse.",
        "address": "Paseo General Escalon 3700",
        "city": "San Salvador",
        "state": "San Salvador",
        "postal_code": "01101",
        "phone": "+503 2264-5555",
        "website": "https://vivaespresso.com",
        "lat": 13.6988,
        "lng": -89.2460,
        "price_level": 2,
        "categories": ["cafeterias"],
    },
    {
        "name": "Ben's Coffee",
        "slug": "bens-coffee",
        "description": "Cafeteria artesanal con granos de fincas locales. Postres caseros, sandwiches gourmet y WiFi rapido.",
        "address": "Colonia Escalon, 79 Avenida Norte",
        "city": "San Salvador",
        "state": "San Salvador",
        "postal_code": "01101",
        "phone": "+503 2263-9900",
        "lat": 13.7020,
        "lng": -89.2488,
        "price_level": 2,
        "categories": ["cafeterias"],
    },
    {
        "name": "Cafe San Martin",
        "slug": "cafe-san-martin",
        "description": "Panaderia y cafeteria con tradicion salvadorena. Pan artesanal recien horneado y cafe de altura todos los dias.",
        "address": "Boulevard del Hipodromo, Zona Rosa",
        "city": "San Salvador",
        "state": "San Salvador",
        "postal_code": "01101",
        "phone": "+503 2243-7600",
        "lat": 13.6912,
        "lng": -89.2345,
        "price_level": 2,
        "categories": ["cafeterias", "panaderia"],
    },
    # Pupuserias
    {
        "name": "Pupuseria La Cuscatleca",
        "slug": "pupuseria-la-cuscatleca",
        "description": "Las mejores pupusas de queso, frijol, chicharron y revueltas. Tambien loroco, ayote y mora. Hechas a mano sobre comal de barro.",
        "address": "3a Calle Poniente 12, Santa Tecla",
        "city": "Santa Tecla",
        "state": "La Libertad",
        "postal_code": "01501",
        "phone": "+503 2228-4521",
        "lat": 13.6740,
        "lng": -89.2898,
        "price_level": 1,
        "categories": ["pupuserias"],
    },
    {
        "name": "Pupuseria Lily",
        "slug": "pupuseria-lily",
        "description": "Pupusas artesanales de arroz y maiz. Especialidad en pupusas de pollo, camarones y queso con loroco.",
        "address": "Avenida Masferrer Norte, Colonia Escalon",
        "city": "San Salvador",
        "state": "San Salvador",
        "postal_code": "01101",
        "phone": "+503 2263-7852",
        "lat": 13.7052,
        "lng": -89.2520,
        "price_level": 1,
        "categories": ["pupuserias"],
    },
    # Mariscos
    {
        "name": "La Marea Restaurant",
        "slug": "la-marea-restaurant",
        "description": "Mariscos frescos del Pacifico salvadoreno. Ceviches, cocteles de conchas, pescado frito y camarones al ajillo.",
        "address": "Boulevard del Litoral, Puerto de La Libertad",
        "city": "La Libertad",
        "state": "La Libertad",
        "postal_code": "01501",
        "phone": "+503 2346-0215",
        "lat": 13.4878,
        "lng": -89.3222,
        "price_level": 2,
        "categories": ["mariscos", "restaurantes"],
    },
    {
        "name": "El Delfin Marisqueria",
        "slug": "el-delfin-marisqueria",
        "description": "Restaurante frente al mar con vista al Muelle de La Libertad. Especialidad en mariscadas y sopa marinera.",
        "address": "Muelle Artesanal, La Libertad",
        "city": "La Libertad",
        "state": "La Libertad",
        "postal_code": "01501",
        "phone": "+503 2346-0189",
        "lat": 13.4885,
        "lng": -89.3210,
        "price_level": 2,
        "categories": ["mariscos"],
    },
    # Hoteles
    {
        "name": "Hotel Real InterContinental",
        "slug": "hotel-real-intercontinental",
        "description": "Hotel cinco estrellas en la Zona Rosa. Piscina, spa, gimnasio, restaurantes y centro de convenciones.",
        "address": "Boulevard de Los Heroes y Avenida Sisimiles",
        "city": "San Salvador",
        "state": "San Salvador",
        "postal_code": "01101",
        "phone": "+503 2211-3333",
        "website": "https://ihg.com",
        "lat": 13.7010,
        "lng": -89.2270,
        "price_level": 4,
        "categories": ["hoteles"],
    },
    {
        "name": "Hotel Decameron Salinitas",
        "slug": "hotel-decameron-salinitas",
        "description": "Resort todo incluido frente a Playa Salinitas. Piscinas, actividades acuaticas, shows nocturnos y buffet.",
        "address": "Playa Salinitas, Km 86.5 Carretera del Litoral",
        "city": "Sonsonate",
        "state": "Sonsonate",
        "postal_code": "02301",
        "phone": "+503 2422-2000",
        "website": "https://decameron.com",
        "lat": 13.5072,
        "lng": -89.7445,
        "price_level": 3,
        "categories": ["hoteles"],
    },
    # Bares
    {
        "name": "La Alquimia Cerveceria",
        "slug": "la-alquimia-cerveceria",
        "description": "Cerveza artesanal elaborada en El Salvador. Cervezas IPA, Stout, Lager y de temporada en un ambiente urbano.",
        "address": "Colonia San Benito, Calle La Reforma",
        "city": "San Salvador",
        "state": "San Salvador",
        "postal_code": "01101",
        "phone": "+503 2223-5544",
        "lat": 13.6940,
        "lng": -89.2370,
        "price_level": 2,
        "categories": ["bares-vida-nocturna"],
    },
    # Supermercados
    {
        "name": "Super Selectos Escalon",
        "slug": "super-selectos-escalon",
        "description": "Supermercado con amplia variedad de productos nacionales e importados. Panaderia, carniceria y frutas frescas.",
        "address": "Paseo General Escalon y 77 Avenida Norte",
        "city": "San Salvador",
        "state": "San Salvador",
        "postal_code": "01101",
        "phone": "+503 2500-5000",
        "website": "https://superselectos.com",
        "lat": 13.6998,
        "lng": -89.2445,
        "price_level": 2,
        "categories": ["supermercados"],
    },
    # Farmacias
    {
        "name": "Farmacia San Nicolas",
        "slug": "farmacia-san-nicolas",
        "description": "Farmacia con servicio 24 horas, amplio inventario de medicamentos, productos de cuidado personal y entrega a domicilio.",
        "address": "Alameda Roosevelt y 49 Avenida Sur",
        "city": "San Salvador",
        "state": "San Salvador",
        "postal_code": "01101",
        "phone": "+503 2221-3000",
        "lat": 13.6960,
        "lng": -89.2185,
        "price_level": 2,
        "categories": ["farmacias"],
    },
    # Gimnasios
    {
        "name": "World Gym El Salvador",
        "slug": "world-gym-sv",
        "description": "Gimnasio completo con area de pesas, cardio, clases grupales, spinning y entrenadores personales certificados.",
        "address": "Centro Comercial La Gran Via, nivel 3",
        "city": "San Salvador",
        "state": "San Salvador",
        "postal_code": "01101",
        "phone": "+503 2245-3300",
        "lat": 13.6680,
        "lng": -89.2330,
        "price_level": 3,
        "categories": ["gimnasios"],
    },
    # Salones de Belleza
    {
        "name": "Armando Funes Salon",
        "slug": "armando-funes-salon",
        "description": "Salon de belleza premium. Cortes, tintes, tratamientos capilares, maquillaje profesional y servicio para novias.",
        "address": "Colonia San Benito, San Salvador",
        "city": "San Salvador",
        "state": "San Salvador",
        "postal_code": "01101",
        "phone": "+503 2223-0555",
        "lat": 13.6935,
        "lng": -89.2355,
        "price_level": 3,
        "categories": ["salones-belleza"],
    },
    # Turismo
    {
        "name": "Parque Nacional El Imposible",
        "slug": "parque-nacional-el-imposible",
        "description": "Area natural protegida con senderos, cascadas y biodiversidad unica. Ideal para senderismo y avistamiento de aves.",
        "address": "Canton San Miguelito, Tacuba",
        "city": "Ahuachapan",
        "state": "Ahuachapan",
        "postal_code": "02201",
        "phone": "+503 2417-6532",
        "lat": 13.8275,
        "lng": -89.9486,
        "price_level": 1,
        "categories": ["turismo-naturaleza"],
    },
    {
        "name": "Ruta de las Flores",
        "slug": "ruta-de-las-flores",
        "description": "Recorrido turistico por los pueblos de Juayua, Apaneca, Ataco, Salcoatitan y Nahuizalco. Gastronomia, artesanias y naturaleza.",
        "address": "Carretera CA-8, Juayua",
        "city": "Juayua",
        "state": "Sonsonate",
        "postal_code": "02301",
        "phone": "+503 2452-2916",
        "lat": 13.8418,
        "lng": -89.7454,
        "price_level": 1,
        "categories": ["turismo-naturaleza"],
    },
    {
        "name": "Lago de Coatepeque",
        "slug": "lago-de-coatepeque",
        "description": "Lago volcanico de aguas cristalinas. Restaurantes a la orilla, lanchas, kayak y vistas espectaculares del volcan.",
        "address": "Lago de Coatepeque, El Congo",
        "city": "El Congo",
        "state": "Santa Ana",
        "postal_code": "02101",
        "lat": 13.8620,
        "lng": -89.5500,
        "price_level": 2,
        "categories": ["turismo-naturaleza"],
    },
    {
        "name": "Playa El Tunco",
        "slug": "playa-el-tunco",
        "description": "Playa famosa para surf, con hostales, restaurantes, bares y un ambiente bohemio. Punto de encuentro de surfistas de todo el mundo.",
        "address": "Playa El Tunco, Tamanique",
        "city": "Tamanique",
        "state": "La Libertad",
        "postal_code": "01501",
        "lat": 13.4938,
        "lng": -89.3825,
        "price_level": 2,
        "categories": ["turismo-naturaleza", "bares-vida-nocturna"],
    },
    # Tecnologia
    {
        "name": "iStore El Salvador",
        "slug": "istore-el-salvador",
        "description": "Distribuidor autorizado Apple. iPhones, MacBooks, iPads, accesorios originales y servicio tecnico certificado.",
        "address": "Centro Comercial Multiplaza, Local 206",
        "city": "Antiguo Cuscatlan",
        "state": "La Libertad",
        "postal_code": "01501",
        "phone": "+503 2248-6600",
        "lat": 13.6718,
        "lng": -89.2522,
        "price_level": 4,
        "categories": ["tecnologia"],
    },
    # Comida rapida
    {
        "name": "Pollo Campero Escalon",
        "slug": "pollo-campero-escalon",
        "description": "La cadena de pollo frito mas querida de Centroamerica. Pollo crujiente, papas, ensalada y empanadas.",
        "address": "Paseo General Escalon, frente a Redondel Masferrer",
        "city": "San Salvador",
        "state": "San Salvador",
        "postal_code": "01101",
        "phone": "+503 2500-2222",
        "website": "https://pollocampero.com",
        "lat": 13.7005,
        "lng": -89.2475,
        "price_level": 1,
        "categories": ["comida-rapida"],
    },
    # Clinicas
    {
        "name": "Hospital de Diagnostico",
        "slug": "hospital-de-diagnostico",
        "description": "Centro medico privado con especialistas en todas las areas. Laboratorio clinico, imagenologia y emergencias 24/7.",
        "address": "21 Calle Poniente y Avenida Morazan",
        "city": "San Salvador",
        "state": "San Salvador",
        "postal_code": "01101",
        "phone": "+503 2226-5111",
        "website": "https://hospitaldediagnostico.com",
        "lat": 13.7048,
        "lng": -89.2105,
        "price_level": 3,
        "categories": ["clinicas-salud"],
    },
    # Panaderia
    {
        "name": "Pan Lido",
        "slug": "pan-lido",
        "description": "Panaderia y pasteleria con mas de 30 anos de tradicion. Pan frances, semitas, tortas y pasteles para toda ocasion.",
        "address": "Boulevard de Los Heroes 1128",
        "city": "San Salvador",
        "state": "San Salvador",
        "postal_code": "01101",
        "phone": "+503 2225-6060",
        "lat": 13.7022,
        "lng": -89.2238,
        "price_level": 1,
        "categories": ["panaderia"],
    },
]

# ── Users ───────────────────────────────────────────────────────────────

USERS = [
    {"display_name": "Maria Lopez", "email": "maria.lopez@email.com"},
    {"display_name": "Carlos Hernandez", "email": "carlos.h@email.com"},
    {"display_name": "Ana Martinez", "email": "ana.martinez@email.com"},
    {"display_name": "Roberto Ramirez", "email": "roberto.r@email.com"},
    {"display_name": "Sofia Castillo", "email": "sofia.c@email.com"},
    {"display_name": "Diego Flores", "email": "diego.flores@email.com"},
    {"display_name": "Lucia Rivas", "email": "lucia.rivas@email.com"},
    {"display_name": "Fernando Mejia", "email": "fernando.m@email.com"},
    {"display_name": "Gabriela Portillo", "email": "gabriela.p@email.com"},
    {"display_name": "Oscar Mendoza", "email": "oscar.mendoza@email.com"},
]

# Password: "password123" (bcrypt hash)
PASSWORD_HASH = "$2b$12$3yHWIAj64gfNzE47onwqfeXtk2Y0joRhbyT8ix4MhiqNg8qnY30aS"

# ── Review templates ────────────────────────────────────────────────────

REVIEW_TEMPLATES = {
    "restaurantes": [
        {"title": "Excelente comida", "text": "La comida estuvo deliciosa, el servicio fue muy atento y el lugar tiene un ambiente muy agradable. Los precios son justos para la calidad que ofrecen. Definitivamente volvere.", "tags": ["buen servicio", "comida rica"]},
        {"title": "Buena experiencia", "text": "Fuimos en familia y nos gusto mucho. Los platos tienen buen sabor y las porciones son generosas. El mesero fue muy amable y nos dio buenas recomendaciones.", "tags": ["ambiente familiar", "porciones generosas"]},
        {"title": "Muy recomendado", "text": "Uno de los mejores restaurantes que he visitado en la zona. La presentacion de los platos es impecable y el sabor no decepciona. El estacionamiento es comodo.", "tags": ["buena presentacion", "estacionamiento"]},
        {"title": "Rico pero lento", "text": "La comida es muy buena pero el servicio fue un poco lento. Esperamos casi 40 minutos para nuestro plato principal. Aun asi el sabor compensa la espera.", "tags": ["servicio lento", "comida rica"]},
        {"title": "Nos encanto", "text": "Celebramos un cumpleanos aqui y todo salio perfecto. El personal fue muy atento, nos decoraron la mesa y el pastel estuvo riquísimo. Gracias por hacer el dia especial.", "tags": ["celebraciones", "buen servicio"]},
    ],
    "cafeterias": [
        {"title": "Mi cafe favorito", "text": "El cafe es de primera calidad, se nota que usan granos frescos. El lugar es perfecto para trabajar con la laptop, tiene buen WiFi y enchufes disponibles.", "tags": ["buen cafe", "wifi rapido"]},
        {"title": "Lugar acogedor", "text": "Me encanta el ambiente de este lugar. Es tranquilo, la musica de fondo es agradable y los pasteles que tienen son deliciosos. El cappuccino es de los mejores que he probado.", "tags": ["ambiente tranquilo", "buenos postres"]},
        {"title": "Cafe de especialidad", "text": "Si eres amante del cafe, este lugar es para ti. Tienen diferentes metodos de preparacion y los baristas saben lo que hacen. Los precios son razonables.", "tags": ["cafe especialidad", "buen precio"]},
    ],
    "pupuserias": [
        {"title": "Las mejores pupusas", "text": "Las pupusas de queso con loroco son increibles, la masa es suave y el relleno es abundante. El curtido y la salsa de tomate complementan perfecto. Precios muy accesibles.", "tags": ["pupusas ricas", "buen precio"]},
        {"title": "Sabor casero", "text": "Se nota que las hacen con amor. Las pupusas de chicharron son las mejores que he probado, y las revueltas tambien estan buenisimas. Siempre hay que ir temprano porque se llena.", "tags": ["sabor casero", "se llena rapido"]},
        {"title": "Tradicion salvadorena", "text": "Un lugar que representa lo mejor de nuestra gastronomia. Las pupusas de arroz son suaves y crujientes por fuera. Atencion rapida y amable.", "tags": ["tradicion", "pupusas de arroz"]},
    ],
    "mariscos": [
        {"title": "Frescos del mar", "text": "Los mariscos estaban fresquisimos. El ceviche de conchas es espectacular y los camarones al ajillo tienen un sabor increible. La vista al mar hace que la experiencia sea completa.", "tags": ["mariscos frescos", "vista al mar"]},
        {"title": "Buen marisco", "text": "Pedimos la mariscada para dos y venia bien servida. Camarones, langostinos, pescado y conchas, todo bien sazonado. El precio es justo por la cantidad.", "tags": ["buena porcion", "precio justo"]},
    ],
    "hoteles": [
        {"title": "Estancia perfecta", "text": "Las habitaciones son amplias y comodas, el servicio de limpieza es impecable. El desayuno buffet tiene mucha variedad. La piscina y el gimnasio estan en excelente estado.", "tags": ["habitaciones comodas", "buen desayuno"]},
        {"title": "Buena ubicacion", "text": "El hotel esta muy bien ubicado, cerca de centros comerciales y restaurantes. El personal es muy profesional y atento. Recomendado para viajes de negocios.", "tags": ["buena ubicacion", "profesional"]},
    ],
    "turismo-naturaleza": [
        {"title": "Hermoso lugar", "text": "Un lugar increible para desconectarse de la ciudad. La naturaleza es impresionante, los senderos estan bien mantenidos y las vistas son espectaculares. Hay que llevar agua y bloqueador.", "tags": ["naturaleza", "senderismo"]},
        {"title": "Imperdible", "text": "Uno de los tesoros de El Salvador. El paisaje es hermoso, el aire puro y la tranquilidad del lugar son unicos. Recomiendo ir temprano para disfrutar mejor.", "tags": ["paisaje hermoso", "ir temprano"]},
        {"title": "Experiencia unica", "text": "Visitamos con un grupo de amigos y la pasamos increible. Hay mucho que explorar, buenas opciones para comer en los alrededores y la gente local es muy amable.", "tags": ["con amigos", "gente amable"]},
    ],
}

DEFAULT_REVIEWS = [
    {"title": "Muy bueno", "text": "Excelente servicio y atencion. El lugar esta limpio y bien mantenido. Los precios son accesibles y la calidad es muy buena. Lo recomiendo.", "tags": ["buen servicio", "limpio"]},
    {"title": "Buena opcion", "text": "Un buen lugar para visitar. Cumple con lo que ofrece y el personal es amable. Volveria sin dudar.", "tags": ["recomendado", "amable"]},
    {"title": "Me gusto", "text": "Fui por primera vez y me lleve una buena impresion. Todo en orden, precios justos y buena atencion. Regresare pronto.", "tags": ["primera visita", "buena impresion"]},
]

HOURS_TEMPLATES = {
    "restaurantes": {"open": "10:00", "close": "21:00", "closed_day": None},
    "cafeterias": {"open": "07:00", "close": "20:00", "closed_day": None},
    "pupuserias": {"open": "16:00", "close": "22:00", "closed_day": 0},
    "mariscos": {"open": "10:00", "close": "19:00", "closed_day": 1},
    "hoteles": {"open": "00:00", "close": "23:59", "closed_day": None},
    "bares-vida-nocturna": {"open": "17:00", "close": "02:00", "closed_day": 0},
    "supermercados": {"open": "07:00", "close": "21:00", "closed_day": None},
    "farmacias": {"open": "07:00", "close": "22:00", "closed_day": None},
    "gimnasios": {"open": "05:00", "close": "22:00", "closed_day": 6},
    "salones-belleza": {"open": "09:00", "close": "18:00", "closed_day": 0},
    "turismo-naturaleza": {"open": "08:00", "close": "16:00", "closed_day": 0},
    "tecnologia": {"open": "10:00", "close": "20:00", "closed_day": None},
    "comida-rapida": {"open": "09:00", "close": "22:00", "closed_day": None},
    "clinicas-salud": {"open": "07:00", "close": "19:00", "closed_day": 6},
    "panaderia": {"open": "06:00", "close": "20:00", "closed_day": None},
    "tiendas-ropa": {"open": "10:00", "close": "19:00", "closed_day": None},
    "educacion": {"open": "07:00", "close": "17:00", "closed_day": 6},
    "talleres-automotrices": {"open": "08:00", "close": "17:00", "closed_day": 6},
}


async def seed():
    # ── Connect ─────────────────────────────────────────────────────
    pg = await asyncpg.connect(PG_DSN, ssl=False)
    mongo_client = AsyncIOMotorClient(MONGO_URL)
    mongo = mongo_client[MONGO_DB]

    # Connect Cassandra (sync, runs in asyncio thread via executor)
    cass_cluster = Cluster(
        contact_points=[CASSANDRA_HOST],
        port=CASSANDRA_PORT,
        connection_class=AsyncioConnection,
        load_balancing_policy=DCAwareRoundRobinPolicy(local_dc="datacenter1"),
    )
    cass = cass_cluster.connect()
    cass.row_factory = dict_factory

    # Ensure keyspace and tables exist
    cass.execute(f"""
        CREATE KEYSPACE IF NOT EXISTS {CASSANDRA_KEYSPACE}
        WITH replication = {{'class': 'NetworkTopologyStrategy', 'datacenter1': 2}}
        AND durable_writes = true
    """)
    cass.set_keyspace(CASSANDRA_KEYSPACE)
    # (Tables created by app on startup — just truncate if they exist)
    for tbl in ["reviews", "reviews_by_business", "reviews_by_user", "comments", "comments_by_review"]:
        try:
            cass.execute(f"TRUNCATE {tbl}")
        except Exception:
            pass  # table might not exist yet

    print("Limpiando datos existentes...")
    await pg.execute("DELETE FROM business_hours")
    await pg.execute("DELETE FROM business_categories")
    await pg.execute("DELETE FROM businesses")
    await pg.execute("DELETE FROM categories")
    await pg.execute("DELETE FROM users")
    await mongo.reviews.delete_many({})
    await mongo.comments.delete_many({})
    await mongo.user_activities.delete_many({})

    # ── Categories ──────────────────────────────────────────────────
    print("Insertando categorias...")
    cat_id_map = {}
    for cat in CATEGORIES:
        row = await pg.fetchrow(
            "INSERT INTO categories (name, slug, icon) VALUES ($1, $2, $3) RETURNING id",
            cat["name"], cat["slug"], cat["icon"],
        )
        cat_id_map[cat["slug"]] = row["id"]
    print(f"  {len(cat_id_map)} categorias creadas")

    # ── Users ───────────────────────────────────────────────────────
    print("Insertando usuarios...")
    user_ids = []
    for u in USERS:
        uid = uuid.uuid4()
        await pg.execute(
            """INSERT INTO users (id, email, password_hash, display_name, role, preferences, is_active)
               VALUES ($1, $2, $3, $4, $5, $6, $7)""",
            uid, u["email"], PASSWORD_HASH, u["display_name"], "user", "{}", True,
        )
        user_ids.append({"id": uid, "display_name": u["display_name"]})
    # Admin user
    admin_id = uuid.uuid4()
    await pg.execute(
        """INSERT INTO users (id, email, password_hash, display_name, role, preferences, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7)""",
        admin_id, "admin@localreview.sv", PASSWORD_HASH, "Admin LocalReview", "admin", "{}", True,
    )
    # Business owner
    owner_id = uuid.uuid4()
    await pg.execute(
        """INSERT INTO users (id, email, password_hash, display_name, role, preferences, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7)""",
        owner_id, "owner@localreview.sv", PASSWORD_HASH, "Propietario Demo", "business_owner", "{}", True,
    )
    print(f"  {len(user_ids) + 2} usuarios creados")

    # ── Businesses ──────────────────────────────────────────────────
    print("Insertando negocios...")
    business_records = []
    for b in BUSINESSES:
        bid = uuid.uuid4()
        oid = owner_id if random.random() < 0.3 else None
        await pg.execute(
            """INSERT INTO businesses (id, owner_id, name, slug, description, address, city, state,
               postal_code, country, phone, email, website, location, price_level,
               is_verified, is_active, avg_rating, review_count)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'SV',$10,NULL,$11,
               ST_MakePoint($12,$13)::geography,$14,$15,TRUE,0,0)""",
            bid, oid, b["name"], b["slug"], b["description"], b["address"],
            b["city"], b.get("state"), b.get("postal_code"),
            b.get("phone"), b.get("website"),
            b["lng"], b["lat"], b.get("price_level"),
            random.random() < 0.4,
        )
        # Categories
        for cat_slug in b["categories"]:
            if cat_slug in cat_id_map:
                await pg.execute(
                    "INSERT INTO business_categories (business_id, category_id) VALUES ($1, $2)",
                    bid, cat_id_map[cat_slug],
                )
        # Hours
        primary_cat = b["categories"][0]
        hours_template = HOURS_TEMPLATES.get(primary_cat, HOURS_TEMPLATES["restaurantes"])
        for day in range(7):
            is_closed = day == hours_template.get("closed_day")
            open_h, open_m = map(int, hours_template["open"].split(":"))
            close_h, close_m = map(int, hours_template["close"].split(":"))
            await pg.execute(
                """INSERT INTO business_hours (business_id, day_of_week, open_time, close_time, is_closed)
                   VALUES ($1, $2, $3, $4, $5)""",
                bid, day, time(open_h, open_m), time(close_h, close_m), is_closed,
            )
        business_records.append({"id": bid, "name": b["name"], "categories": b["categories"]})
    print(f"  {len(business_records)} negocios creados")

    # ── Reviews → Cassandra ─────────────────────────────────────────
    print("Insertando resenas en Cassandra...")
    review_count = 0
    for biz in business_records:
        primary_cat = biz["categories"][0]
        templates = REVIEW_TEMPLATES.get(primary_cat, DEFAULT_REVIEWS)
        num_reviews = random.randint(3, 8)
        reviewers = random.sample(user_ids, min(num_reviews, len(user_ids)))

        ratings_sum = 0
        for i, reviewer in enumerate(reviewers):
            template = templates[i % len(templates)]
            rating = random.choices([5, 4, 3, 4, 5], weights=[35, 30, 10, 15, 10])[0]
            ratings_sum += rating
            created = datetime.now(timezone.utc) - timedelta(days=random.randint(1, 180))

            rid = uuid.uuid4()
            biz_uuid = uuid.UUID(str(biz["id"]))
            uid = uuid.UUID(str(reviewer["id"]))
            helpful_count = random.randint(0, 15)

            owner_resp_text = None
            owner_resp_at = None
            if random.random() < 0.25:
                responses = [
                    "Muchas gracias por visitarnos y por tus amables palabras.",
                    "Agradecemos tu resena. Tu opinion es muy importante para nosotros.",
                    "Gracias por tu visita! Te invitamos a regresar cuando quieras.",
                ]
                owner_resp_text = random.choice(responses)
                owner_resp_at = created + timedelta(days=random.randint(1, 5))

            # reviews table (lookup by id)
            cass.execute(
                """INSERT INTO reviews (id, business_id, user_id, user_display_name, user_avatar_url,
                   rating, title, body, tags, photos, helpful_count, helpful_by, status,
                   owner_resp_text, owner_resp_at, created_at, updated_at)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (rid, biz_uuid, uid, reviewer["display_name"], None,
                 rating, template["title"], template["text"], list(template["tags"]),
                 [], helpful_count, set(), "published",
                 owner_resp_text, owner_resp_at, created, created),
            )

            # reviews_by_business table
            cass.execute(
                """INSERT INTO reviews_by_business (business_id, created_at, id,
                   user_id, user_display_name, user_avatar_url,
                   rating, title, body, tags, photos, helpful_count, helpful_by, status,
                   owner_resp_text, owner_resp_at, updated_at)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (biz_uuid, created, rid,
                 uid, reviewer["display_name"], None,
                 rating, template["title"], template["text"], list(template["tags"]),
                 [], helpful_count, set(), "published",
                 owner_resp_text, owner_resp_at, created),
            )

            # reviews_by_user table
            cass.execute(
                """INSERT INTO reviews_by_user (user_id, created_at, id,
                   business_id, user_display_name, user_avatar_url,
                   rating, title, body, tags, photos, helpful_count, helpful_by, status,
                   owner_resp_text, owner_resp_at, updated_at)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (uid, created, rid,
                 biz_uuid, reviewer["display_name"], None,
                 rating, template["title"], template["text"], list(template["tags"]),
                 [], helpful_count, set(), "published",
                 owner_resp_text, owner_resp_at, created),
            )

            review_count += 1

        # Update avg_rating in PostgreSQL
        avg = round(ratings_sum / len(reviewers), 2)
        await pg.execute(
            "UPDATE businesses SET avg_rating = $1, review_count = $2 WHERE id = $3",
            avg, len(reviewers), biz["id"],
        )
    print(f"  {review_count} resenas creadas en Cassandra")

    # ── MongoDB legacy indexes (kept for compatibility) ──────────────
    print("Creando indices MongoDB...")
    await mongo.user_activities.create_index([("user_id", 1), ("created_at", -1)])
    print("  Indices creados")

    await pg.close()
    mongo_client.close()
    cass_cluster.shutdown()

    print("\n=== Seed completado ===")
    print(f"  Categorias: {len(CATEGORIES)}")
    print(f"  Usuarios:   {len(USERS) + 2}")
    print(f"  Negocios:   {len(BUSINESSES)}")
    print(f"  Resenas:    {review_count}")
    print(f"\n  Login de prueba:")
    print(f"    Email: maria.lopez@email.com")
    print(f"    Pass:  password123")
    print(f"\n  Admin:")
    print(f"    Email: admin@localreview.sv")
    print(f"    Pass:  password123")
    print(f"\n  Business Owner:")
    print(f"    Email: owner@localreview.sv")
    print(f"    Pass:  password123")


if __name__ == "__main__":
    asyncio.run(seed())
