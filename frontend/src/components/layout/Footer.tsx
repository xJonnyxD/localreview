import { Link } from 'react-router-dom';
import { MapPin, Globe, Share2, Mail, Heart } from 'lucide-react';

const LINKS = {
  Explorar: [
    { label: 'Buscar negocios', to: '/search' },
    { label: 'Restaurantes', to: '/search?q=restaurante' },
    { label: 'Cafes', to: '/search?q=cafe' },
    { label: 'Turismo', to: '/search?q=turistico' },
  ],
  Cuenta: [
    { label: 'Iniciar sesion', to: '/login' },
    { label: 'Registrarse', to: '/register' },
    { label: 'Mi perfil', to: '/profile' },
    { label: 'Dashboard', to: '/dashboard' },
  ],
};

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="sm:col-span-2 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">LocalReview</span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs text-gray-500">
              La plataforma de resenas de negocios locales para El Salvador.
              Encuentra, opina y apoya los negocios de tu comunidad.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a href="#" aria-label="Sitio web" className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-indigo-600 transition">
                <Globe className="w-4 h-4" />
              </a>
              <a href="#" aria-label="Redes sociales" className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-pink-600 transition">
                <Share2 className="w-4 h-4" />
              </a>
              <a href="mailto:info@localreview.sv" aria-label="Correo" className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-600 transition">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([title, items]) => (
            <div key={title}>
              <h3 className="text-white font-semibold text-sm mb-3">{title}</h3>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      className="text-sm text-gray-500 hover:text-indigo-400 transition"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <p>© {year} LocalReview — El Salvador. Todos los derechos reservados.</p>
          <p className="flex items-center gap-1">
            Hecho con <Heart className="w-3 h-3 text-red-500 fill-red-500" /> para la comunidad salvadorena
          </p>
        </div>
      </div>
    </footer>
  );
}
