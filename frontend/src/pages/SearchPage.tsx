import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Star, X, Map, List, Tag } from 'lucide-react';
import { searchBusinesses, getCategories } from '../api/businesses';
import type { Business, Category } from '../types';
import BusinessCard from '../components/business/BusinessCard';
import BusinessMapLazy from '../components/map/BusinessMapLazy';
import Pagination from '../components/ui/Pagination';

const SORT_OPTIONS = [
  { value: 'rating', label: 'Mejor calificados' },
  { value: 'newest', label: 'Mas recientes' },
  { value: 'distance', label: 'Mas cercanos' },
];

const RATING_OPTIONS = [
  { value: '', label: 'Cualquier calificacion' },
  { value: '4', label: '4+ estrellas' },
  { value: '3', label: '3+ estrellas' },
  { value: '2', label: '2+ estrellas' },
];

const LIMIT = 12;

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

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [inputValue, setInputValue] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<Business[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [minRating, setMinRating] = useState('');
  const [sort, setSort] = useState('rating');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | ''>(() => {
    const param = searchParams.get('category_id');
    return param ? parseInt(param) : '';
  });

  // Cargar categorías al montar
  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  const doSearch = async (q: string, currentPage = 1) => {
    setLoading(true);
    const params: Record<string, string | number> = {
      sort,
      limit: LIMIT,
      skip: (currentPage - 1) * LIMIT,
    };
    if (q) params.q = q;
    if (minRating) params.min_rating = parseFloat(minRating);
    if (selectedCategory !== '') params.category_id = selectedCategory;
    try {
      const res = await searchBusinesses(params);
      setResults(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    doSearch(query, 1);
  }, [sort, minRating, selectedCategory]);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    const catId = searchParams.get('category_id');
    if (catId) setSelectedCategory(parseInt(catId));
    setQuery(q);
    setInputValue(q);
    doSearch(q, 1);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(inputValue);
    setPage(1);
    setSearchParams(inputValue ? { q: inputValue } : {});
    doSearch(inputValue, 1);
  };

  const clearQuery = () => {
    setInputValue('');
    setQuery('');
    setPage(1);
    setSearchParams({});
    doSearch('', 1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    doSearch(query, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearAllFilters = () => {
    setSort('rating');
    setMinRating('');
    setSelectedCategory('');
  };

  const hasFilters = minRating !== '' || sort !== 'rating' || selectedCategory !== '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search header */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 flex items-center bg-gray-100 border border-transparent focus-within:border-indigo-300 focus-within:bg-white rounded-xl px-4 transition">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Buscar restaurantes, cafes, servicios..."
                className="flex-1 py-3 px-3 outline-none bg-transparent text-gray-900 placeholder-gray-400 text-sm"
              />
              {inputValue && (
                <button type="button" onClick={clearQuery} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm"
            >
              Buscar
            </button>
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition ${
                hasFilters
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
              {hasFilters && <span className="w-2 h-2 bg-indigo-500 rounded-full" />}
            </button>
          </form>

          {/* Filters panel */}
          {filtersOpen && (
            <div className="mt-3 space-y-3 pt-3 border-t border-gray-100">
              {/* Fila 1: Ordenar */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap shrink-0">
                  Ordenar:
                </label>
                <div className="flex gap-1 flex-wrap">
                  {SORT_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setSort(o.value)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition font-medium ${
                        sort === o.value
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fila 2: Rating */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide shrink-0">
                  Rating:
                </label>
                <div className="flex gap-1 flex-wrap">
                  {RATING_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setMinRating(o.value)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition font-medium flex items-center gap-1 ${
                        minRating === o.value
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      {o.value && <Star className="w-3 h-3" />}
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fila 2: Categorías */}
              {categories.length > 0 && (
                <div className="flex items-start gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Tag className="w-3.5 h-3.5 text-gray-500" />
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                      Categoria:
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setSelectedCategory('')}
                      className={`text-xs px-3 py-1.5 rounded-full border transition font-medium ${
                        selectedCategory === ''
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      Todas
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id === selectedCategory ? '' : cat.id)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition font-medium ${
                          selectedCategory === cat.id
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Limpiar filtros */}
              {hasFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Limpiar todos los filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Results count + view toggle */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-gray-500">
              {loading ? 'Buscando...' : (
                query
                  ? <><span className="font-semibold text-gray-900">{total}</span> resultado{total !== 1 ? 's' : ''} para "<span className="font-semibold text-indigo-600">{query}</span>"</>
                  : <><span className="font-semibold text-gray-900">{total}</span> negocios encontrados</>
              )}
            </p>
            {/* Chips de filtros activos */}
            {selectedCategory !== '' && (
              <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-medium">
                <Tag className="w-3 h-3" />
                {categories.find((c) => c.id === selectedCategory)?.name}
                <button onClick={() => setSelectedCategory('')} className="hover:text-indigo-900 ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {minRating && (
              <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 text-xs px-2.5 py-1 rounded-full font-medium">
                <Star className="w-3 h-3 fill-yellow-500" />
                {minRating}+ estrellas
                <button onClick={() => setMinRating('')} className="hover:text-yellow-900 ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          {/* Toggle lista / mapa */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                viewMode === 'list' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Lista
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                viewMode === 'map' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Map className="w-3.5 h-3.5" /> Mapa
            </button>
          </div>
        </div>

        {/* Vista mapa */}
        {viewMode === 'map' && !loading && (
          <div className="mb-6">
            <BusinessMapLazy businesses={results} height={500} />
            {results.length === 0 && (
              <p className="text-center text-sm text-gray-400 mt-3">Sin negocios para mostrar en el mapa</p>
            )}
          </div>
        )}

        {/* Vista lista */}
        {viewMode === 'list' && (
          <>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
              </div>
            ) : results.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {results.map((b) => (
                    <BusinessCard key={b.id} business={b} />
                  ))}
                </div>
                <Pagination page={page} total={total} limit={LIMIT} onChange={handlePageChange} />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">Sin resultados</h3>
                <p className="text-gray-500 text-sm max-w-xs">
                  No encontramos negocios con esos criterios. Intenta con otras palabras o quita los filtros.
                </p>
                {hasFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="mt-4 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
