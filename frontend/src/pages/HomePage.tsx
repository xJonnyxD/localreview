import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  Search, MapPin, Star, TrendingUp, Coffee, UtensilsCrossed,
  ShoppingBag, Landmark, Dumbbell, Scissors, ChevronRight, Shield,
} from 'lucide-react';
import { getBusinesses, getCategories } from '../api/businesses';
import type { Business, Category } from '../types';
import BusinessCard from '../components/business/BusinessCard';

// Íconos por slug de categoría
const CAT_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  restaurantes:  { icon: UtensilsCrossed, color: 'text-orange-500 bg-orange-50 hover:bg-orange-100' },
  'comida-rapida': { icon: UtensilsCrossed, color: 'text-red-500 bg-red-50 hover:bg-red-100' },
  cafes:         { icon: Coffee,           color: 'text-amber-500 bg-amber-50 hover:bg-amber-100' },
  tiendas:       { icon: ShoppingBag,      color: 'text-blue-500 bg-blue-50 hover:bg-blue-100' },
  turismo:       { icon: Landmark,         color: 'text-green-500 bg-green-50 hover:bg-green-100' },
  gimnasios:     { icon: Dumbbell,         color: 'text-purple-500 bg-purple-50 hover:bg-purple-100' },
  salones:       { icon: Scissors,         color: 'text-pink-500 bg-pink-50 hover:bg-pink-100' },
};
const DEFAULT_CAT = { icon: MapPin, color: 'text-indigo-500 bg-indigo-50 hover:bg-indigo-100' };

function getCatStyle(cat: Category) {
  // Busca por slug o por substring del nombre
  const key = Object.keys(CAT_ICONS).find(
    (k) => cat.slug?.includes(k) || cat.name?.toLowerCase().includes(k)
  );
  return key ? CAT_ICONS[key] : DEFAULT_CAT;
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-44 bg-gray-200" />
      <div className="p-4 space-y-2.5">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

export default function HomePage() {
  useDocumentTitle();
  const [topBusinesses, setTopBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingBiz, setLoadingBiz] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getBusinesses({ limit: 6 })
      .then((res) => setTopBusinesses(res.items))
      .finally(() => setLoadingBiz(false));
    getCategories().then((cats) => setCategories(cats.slice(0, 6)));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    else navigate('/search');
  };

  return (
    <div className="bg-gray-50">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-700 text-white overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-white/5 rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 py-12 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 sm:px-4 py-1.5 text-xs sm:text-sm mb-4 sm:mb-6">
            <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            El Salvador
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold mb-3 sm:mb-4 leading-tight">
            Descubre los mejores
            <br />
            <span className="text-yellow-300">negocios locales</span>
          </h1>
          <p className="text-indigo-100 text-base sm:text-xl mb-7 sm:mb-10 max-w-xl mx-auto px-2">
            Resenas reales de la comunidad para encontrar los lugares perfectos cerca de ti.
          </p>

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="flex bg-white rounded-2xl shadow-2xl overflow-hidden p-1 sm:p-1.5 gap-1 sm:gap-1.5">
              <div className="flex items-center px-2 sm:px-3 text-gray-400">
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <input
                type="text"
                placeholder="Restaurantes, pupuserias, cafes..."
                className="flex-1 py-2.5 sm:py-3 text-gray-900 outline-none text-sm sm:text-base bg-transparent placeholder-gray-400 min-w-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold hover:opacity-90 transition shrink-0 text-sm sm:text-base"
              >
                Buscar
              </button>
            </div>
          </form>

          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {['Pupuserias', 'Mariscos', 'Cafe', 'Parques'].map((s) => (
              <Link
                key={s}
                to={`/search?q=${s}`}
                className="text-sm text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition"
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="max-w-5xl mx-auto px-4 -mt-6 relative z-10">
        <div className="grid grid-cols-3 bg-white rounded-2xl shadow-xl border border-gray-100 divide-x divide-gray-100">
          {[
            { icon: MapPin, short: 'Negocios', full: 'Negocios registrados', value: '2,500+', color: 'text-indigo-500' },
            { icon: Star,   short: 'Resenas',  full: 'Resenas autenticas',   value: '50,000+', color: 'text-yellow-500' },
            { icon: TrendingUp, short: 'Usuarios', full: 'Usuarios activos', value: '10,000+', color: 'text-green-500' },
          ].map(({ icon: Icon, short, full, value, color }) => (
            <div key={short} className="flex flex-col items-center py-4 sm:py-5 px-1 sm:px-2">
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color} mb-1 sm:mb-1.5`} />
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 text-center leading-tight mt-0.5 sm:hidden">{short}</p>
              <p className="text-xs text-gray-500 text-center leading-tight mt-0.5 hidden sm:block">{full}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-5xl mx-auto px-4 py-14">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Explorar por Categoria</h2>
            <p className="text-gray-500 text-sm mt-1">Encuentra lo que buscas rapido</p>
          </div>
          <Link to="/search" className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium">
            Ver todo <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {categories.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {categories.map((cat) => {
              const { icon: Icon, color } = getCatStyle(cat);
              return (
                <Link
                  key={cat.id}
                  to={`/search?category_id=${cat.id}`}
                  onClick={() => {
                    // Pasa category_id como searchParam en SearchPage
                    sessionStorage.setItem('filter_category_id', String(cat.id));
                    sessionStorage.setItem('filter_category_name', cat.name);
                  }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition cursor-pointer ${color}`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{cat.name}</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}
      </section>

      {/* Top businesses */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Mejor Calificados</h2>
            <p className="text-gray-500 text-sm mt-1">Los favoritos de la comunidad</p>
          </div>
          <Link to="/search?sort=rating" className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium">
            Ver todos <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loadingBiz ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3,4,5,6].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : topBusinesses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {topBusinesses.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aun no hay negocios registrados.</p>
          </div>
        )}
      </section>

      {/* CTA banner */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h2 className="text-3xl font-bold mb-3">Tienes un negocio?</h2>
          <p className="text-indigo-100 mb-8 text-lg">
            Registra tu negocio, responde resenas y crece con la comunidad de El Salvador.
          </p>
          <Link
            to="/register"
            className="inline-block bg-white text-indigo-700 font-bold px-8 py-3 rounded-xl hover:bg-indigo-50 transition shadow-lg"
          >
            Registrar mi negocio
          </Link>
        </div>
      </section>
    </div>
  );
}
