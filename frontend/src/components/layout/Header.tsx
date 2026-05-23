import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Search, User, LogOut, LayoutDashboard, Menu, X, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { searchBusinesses } from '../../api/businesses';
import type { Business } from '../../types';

export default function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Quick search
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Business[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
    setShowDropdown(false);
    setSearchQuery('');
  }, [location.pathname]);

  // Cerrar menú móvil al hacer scroll
  useEffect(() => {
    if (!mobileOpen) return;
    const onScroll = () => setMobileOpen(false);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [mobileOpen]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce para sugerencias
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await searchBusinesses({ q: searchQuery.trim(), limit: 5, sort: 'rating' });
        setSuggestions(res.items);
        setShowDropdown(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserMenuOpen(false);
    setMobileOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    } else {
      navigate('/search');
    }
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  const handleSuggestionClick = (biz: Business) => {
    navigate(`/business/${biz.id}`);
    setShowDropdown(false);
    setSearchQuery('');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white/95 backdrop-blur border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            LocalReview
          </span>
        </Link>

        {/* Quick search — desktop */}
        <div ref={searchRef} className="hidden md:block relative w-64 lg:w-80">
          <form onSubmit={handleSearchSubmit}>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-300 rounded-full transition">
              {searchLoading ? (
                <svg className="w-4 h-4 text-gray-400 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              ) : (
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
              )}
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
                placeholder="Buscar negocios, lugares..."
                className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSuggestions([]); setShowDropdown(false); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </form>

          {/* Dropdown de sugerencias */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 overflow-hidden">
              {suggestions.map((biz) => (
                <button
                  key={biz.id}
                  type="button"
                  onClick={() => handleSuggestionClick(biz)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {biz.photo_url ? (
                      <img src={biz.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <MapPin className="w-4 h-4 text-indigo-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{biz.name}</p>
                    <p className="text-xs text-gray-400 truncate">{biz.city}</p>
                  </div>
                  {biz.avg_rating > 0 && (
                    <span className="shrink-0 text-xs font-bold text-amber-500">
                      ★ {biz.avg_rating.toFixed(1)}
                    </span>
                  )}
                </button>
              ))}
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  type="button"
                  onClick={handleSearchSubmit as unknown as React.MouseEventHandler}
                  className="w-full text-left px-4 py-2 text-xs text-indigo-600 hover:bg-indigo-50 transition font-medium flex items-center gap-2"
                >
                  <Search className="w-3.5 h-3.5" />
                  Ver todos los resultados para "{searchQuery}"
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Nav — desktop */}
        <nav className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              {(user.role === 'business_owner' || user.role === 'admin') && (
                <Link
                  to="/dashboard"
                  className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition font-medium ${
                    isActive('/dashboard')
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
              )}

              {/* User dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-gray-100 transition"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                    {user.display_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-700 max-w-[100px] truncate">
                    {user.display_name}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-900 truncate">{user.display_name}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      <User className="w-4 h-4 text-gray-400" />
                      Mi Perfil
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar Sesion
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-lg hover:bg-gray-100 transition font-medium"
              >
                Iniciar Sesion
              </Link>
              <Link
                to="/register"
                className="text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition font-medium shadow-sm"
              >
                Registrarse
              </Link>
            </>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5 text-gray-600" /> : <Menu className="w-5 h-5 text-gray-600" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          <Link
            to="/search"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 transition"
          >
            <Search className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium">Buscar negocios</span>
          </Link>
          {user ? (
            <>
              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 transition"
              >
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium">Mi Perfil</span>
              </Link>
              {(user.role === 'business_owner' || user.role === 'admin') && (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                >
                  <LayoutDashboard className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium">Dashboard</span>
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Cerrar Sesion</span>
              </button>
            </>
          ) : (
            <div className="flex gap-2 pt-1">
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center text-sm border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Iniciar Sesion
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2.5 rounded-lg hover:opacity-90 transition font-medium"
              >
                Registrarse
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Overlay to close user menu */}
      {userMenuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
      )}
    </header>
  );
}
