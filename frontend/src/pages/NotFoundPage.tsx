import { Link } from 'react-router-dom';
import { MapPin, Home, Search, ArrowLeft } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Pagina no encontrada');
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Ilustración */}
        <div className="relative inline-block mb-8">
          <div className="w-32 h-32 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto">
            <MapPin className="w-16 h-16 text-indigo-200" />
          </div>
          <div className="absolute -top-2 -right-2 w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-500 font-black text-lg shadow-sm">
            ?
          </div>
        </div>

        {/* Texto */}
        <h1 className="text-6xl font-black text-gray-900 mb-2">404</h1>
        <h2 className="text-xl font-bold text-gray-700 mb-3">Página no encontrada</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          La página que buscas no existe o fue movida. Puede que el enlace esté roto
          o que hayas escrito mal la dirección.
        </p>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition shadow-sm"
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </Link>
          <Link
            to="/search"
            className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition"
          >
            <Search className="w-4 h-4" />
            Buscar negocios
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 px-4 py-3 rounded-xl text-sm font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver atrás
          </button>
        </div>
      </div>
    </div>
  );
}
