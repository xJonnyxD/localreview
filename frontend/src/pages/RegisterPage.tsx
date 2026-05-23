import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Eye, EyeOff, AlertCircle, CheckCircle2, Store } from 'lucide-react';
import { register, login } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'Al menos 8 caracteres', ok: password.length >= 8 },
    { label: 'Una letra mayuscula', ok: /[A-Z]/.test(password) },
    { label: 'Un numero', ok: /\d/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${i < score ? colors[score] : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <div className="space-y-1">
        {checks.map((c) => (
          <p key={c.label} className={`flex items-center gap-1.5 text-xs ${c.ok ? 'text-green-600' : 'text-gray-400'}`}>
            <CheckCircle2 className={`w-3 h-3 ${c.ok ? 'text-green-500' : 'text-gray-300'}`} />
            {c.label}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  useDocumentTitle('Crear cuenta');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { fetchUser } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, displayName, isOwner);
      await login(email, password);
      await fetchUser();
      navigate(isOwner ? '/dashboard' : '/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al crear la cuenta. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-2">
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              LocalReview
            </span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-3 sm:mt-4">Crea tu cuenta</h1>
          <p className="text-gray-500 text-sm mt-1">Unete a la comunidad de El Salvador</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 p-5 sm:p-8">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 text-red-700 border border-red-100 rounded-xl p-3.5 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Nombre completo
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm bg-gray-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm bg-gray-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Contrasena
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm bg-gray-50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            {/* Checkbox propietario */}
            <button
              type="button"
              onClick={() => setIsOwner(!isOwner)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition text-left ${
                isOwner
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isOwner ? 'bg-indigo-600' : 'bg-gray-200'
              }`}>
                <Store className={`w-5 h-5 ${isOwner ? 'text-white' : 'text-gray-500'}`} />
              </div>
              <div>
                <p className={`text-sm font-semibold ${isOwner ? 'text-indigo-700' : 'text-gray-700'}`}>
                  Soy propietario de un negocio
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Podras registrar y gestionar tu negocio
                </p>
              </div>
              <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                isOwner ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
              }`}>
                {isOwner && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition shadow-md shadow-indigo-200 text-sm mt-2"
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta Gratis'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            Al registrarte, aceptas nuestros terminos de uso y politica de privacidad.
          </p>

          <div className="mt-5 pt-5 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Ya tienes cuenta?{' '}
              <Link to="/login" className="text-indigo-600 hover:text-indigo-800 font-semibold">
                Inicia sesion
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
