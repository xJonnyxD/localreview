import { useEffect, useState } from 'react';
import { BarChart3, Star, MessageSquare, TrendingUp, ThumbsUp, ArrowUp, ArrowDown, Building2, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../api/client';
import type { Review } from '../types';
import StarRating from '../components/review/StarRating';

interface BusinessStat {
  _id: string;
  business_name?: string;
  avg_rating: number;
  total_reviews: number;
  total_helpful: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  bg: string;
  trend?: { dir: 'up' | 'down'; text: string };
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            trend.dir === 'up' ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'
          }`}>
            {trend.dir === 'up' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {trend.text}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<BusinessStat[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews'>('overview');

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, reviewsRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/reviews', { params: { limit: 20 } }),
        ]);
        setStats(statsRes.data.businesses);
        setReviews(reviewsRes.data.items);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (!user || (user.role !== 'business_owner' && user.role !== 'admin')) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso Restringido</h2>
          <p className="text-gray-500 text-sm">
            El dashboard esta disponible solo para propietarios de negocios y administradores.
          </p>
          <Link to="/" className="inline-block mt-6 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              <div className="w-12 h-12 bg-gray-200 rounded-xl mb-4" />
              <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalReviews = stats.reduce((sum, s) => sum + s.total_reviews, 0);
  const totalHelpful = stats.reduce((sum, s) => sum + s.total_helpful, 0);
  const overallRating = stats.length > 0
    ? (stats.reduce((sum, s) => sum + s.avg_rating, 0) / stats.length).toFixed(1)
    : '0.0';
  const pendingReplies = reviews.filter((r) => !r.owner_response).length;
  const responseRate = reviews.length > 0
    ? Math.round(((reviews.length - pendingReplies) / reviews.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Bienvenido, {user.display_name} — vision general de tus negocios
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              En vivo
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-5">
            {(['overview', 'reviews'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab === 'overview' ? 'Vision General' : 'Resenas'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'overview' && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={Building2}
                label="Negocios activos"
                value={stats.length}
                color="text-indigo-600"
                bg="bg-indigo-50"
              />
              <StatCard
                icon={Star}
                label="Rating promedio"
                value={overallRating}
                color="text-yellow-500"
                bg="bg-yellow-50"
                trend={{ dir: 'up', text: 'Bueno' }}
              />
              <StatCard
                icon={MessageSquare}
                label="Total resenas"
                value={totalReviews}
                color="text-green-600"
                bg="bg-green-50"
              />
              <StatCard
                icon={ThumbsUp}
                label="Votos utiles"
                value={totalHelpful}
                color="text-purple-600"
                bg="bg-purple-50"
              />
            </div>

            {/* Response rate */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="md:col-span-1 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Tasa de Respuesta
                </h3>
                <div className="flex items-end gap-2 mb-3">
                  <p className="text-4xl font-bold text-gray-900">{responseRate}%</p>
                  <p className="text-sm text-gray-500 pb-1">respondidas</p>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                  <div
                    className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${responseRate}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {pendingReplies} resena{pendingReplies !== 1 ? 's' : ''} sin responder
                </p>
              </div>

              <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  Resenas Pendientes de Respuesta
                </h3>
                {reviews.filter((r) => !r.owner_response).slice(0, 3).length > 0 ? (
                  <div className="space-y-3">
                    {reviews.filter((r) => !r.owner_response).slice(0, 3).map((r) => (
                      <div key={r.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-300 to-red-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {r.user_display_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">{r.user_display_name}</p>
                            <StarRating rating={r.rating} size={10} />
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{r.text}</p>
                        </div>
                        <span className="shrink-0 text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                          Pendiente
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
                    <p className="text-sm">Todo respondido</p>
                  </div>
                )}
              </div>
            </div>

            {/* Per-business table */}
            {stats.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-bold text-gray-900">Rendimiento por Negocio</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                        <th className="text-left py-3 px-6 font-semibold">Negocio</th>
                        <th className="text-center py-3 px-4 font-semibold">Rating</th>
                        <th className="text-center py-3 px-4 font-semibold">Resenas</th>
                        <th className="text-center py-3 px-4 font-semibold">Votos utiles</th>
                        <th className="text-center py-3 px-4 font-semibold">Accion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {stats.map((s) => (
                        <tr key={s._id} className="hover:bg-gray-50 transition">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-indigo-500" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">
                                  {s.business_name || 'Negocio'}
                                </p>
                                <p className="text-xs text-gray-400 font-mono">{s._id.substring(0, 8)}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <StarRating rating={Math.round(s.avg_rating)} size={12} />
                              <span className="font-semibold text-gray-800 text-sm">{s.avg_rating.toFixed(1)}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="font-semibold text-gray-800">{s.total_reviews}</span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="font-semibold text-gray-800">{s.total_helpful}</span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <Link
                              to={`/business/${s._id}`}
                              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                              Ver <ExternalLink className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'reviews' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-gray-900">Todas las Resenas</h2>
              </div>
              <span className="text-sm text-gray-500">{reviews.length} resenas</span>
            </div>
            <div className="divide-y divide-gray-50">
              {reviews.map((review) => {
                const date = new Date(review.created_at).toLocaleDateString('es-SV', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                });
                return (
                  <div key={review.id} className="p-6 hover:bg-gray-50 transition">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {review.user_display_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-gray-900 text-sm">{review.user_display_name}</p>
                          <StarRating rating={review.rating} size={12} />
                          <span className="text-xs text-gray-400">{date}</span>
                          <div className="ml-auto">
                            {review.owner_response ? (
                              <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">
                                <CheckCircle2 className="w-3 h-3" /> Respondida
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full font-medium">
                                <Clock className="w-3 h-3" /> Pendiente
                              </span>
                            )}
                          </div>
                        </div>
                        {review.title && (
                          <p className="font-medium text-gray-800 text-sm">{review.title}</p>
                        )}
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2 leading-relaxed">{review.text}</p>
                        {review.owner_response && (
                          <div className="mt-3 bg-indigo-50 rounded-xl p-3 border-l-4 border-indigo-400">
                            <p className="text-xs font-semibold text-indigo-700 mb-1">Tu respuesta</p>
                            <p className="text-sm text-gray-700">{review.owner_response.text}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {reviews.length === 0 && (
                <div className="p-16 text-center">
                  <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400">No hay resenas aun</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
