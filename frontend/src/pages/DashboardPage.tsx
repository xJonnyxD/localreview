import { useEffect, useState } from 'react';
import { BarChart3, Star, MessageSquare, TrendingUp, ThumbsUp, ArrowUp, ArrowDown, Building2, CheckCircle2, Clock, ExternalLink, Plus, Send, Loader2, Pencil } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAuthStore } from '../stores/authStore';
import { respondToReview } from '../api/reviews';
import { toast } from '../stores/toastStore';
import api from '../api/client';
import type { Review } from '../types';
import StarRating from '../components/review/StarRating';
import EditBusinessModal from '../components/business/EditBusinessModal';

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
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${color}`} />
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
      <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-tight">{label}</p>
    </div>
  );
}

function ReviewResponseForm({ review, onResponded }: { review: Review; onResponded: (updated: Review) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const updated = await respondToReview(review.id, text.trim());
      onResponded(updated);
      setOpen(false);
      setText('');
      toast.success('Respuesta publicada');
    } catch {
      toast.error('Error al publicar la respuesta');
    } finally {
      setSubmitting(false);
    }
  };

  if (review.owner_response) return null;

  return (
    <div className="mt-3">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
        >
          <Send className="w-3.5 h-3.5" /> Responder a esta resena
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="mt-2 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Escribe tu respuesta como propietario..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 resize-none bg-gray-50 focus:bg-white transition"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !text.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Publicar respuesta
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setText(''); }}
              className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// Card compacta para tabla de negocios en móvil
function BusinessStatCard({ s, onEdit }: { s: BusinessStat; onEdit: (id: string, name: string) => void }) {
  return (
    <div className="flex items-center gap-3 p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0">
        <Building2 className="w-5 h-5 text-indigo-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{s.business_name || 'Negocio'}</p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <StarRating rating={Math.round(s.avg_rating)} size={10} />
            <span className="font-medium text-gray-700">{s.avg_rating.toFixed(1)}</span>
          </span>
          <span className="text-xs text-gray-400">{s.total_reviews} resenas</span>
          <span className="text-xs text-gray-400">{s.total_helpful} votos</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onEdit(s._id, s.business_name || 'Negocio')}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 font-medium transition"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <Link
          to={`/business/${s._id}`}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Ver <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<BusinessStat[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews'>('overview');
  const [editingBiz, setEditingBiz] = useState<{ id: string; name: string } | null>(null);

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-xl mb-4" />
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

  const handleResponded = (updated: Review) => {
    setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleEditBiz = (id: string, name: string) => {
    setEditingBiz({ id, name });
  };

  const handleBizSaved = async () => {
    setEditingBiz(null);
    // Recargar stats para mostrar datos actualizados
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data.businesses);
    } catch {
      // silencioso
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-0.5 truncate">
                Bienvenido, {user.display_name}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => navigate('/dashboard/create')}
                className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden xs:inline sm:inline">Crear negocio</span>
              </button>
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                En vivo
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 sm:mt-5">
            {(['overview', 'reviews'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab === 'overview' ? 'General' : `Resenas${pendingReplies > 0 ? ` (${pendingReplies})` : ''}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {activeTab === 'overview' && (
          <>
            {/* KPI Cards — 2 cols móvil, 4 cols desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 sm:mb-8">
              <div className="md:col-span-1 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
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

              <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  Pendientes de Respuesta
                </h3>
                {reviews.filter((r) => !r.owner_response).slice(0, 3).length > 0 ? (
                  <div className="space-y-3">
                    {reviews.filter((r) => !r.owner_response).slice(0, 3).map((r) => (
                      <div key={r.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-300 to-red-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {r.user_display_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-900">{r.user_display_name}</p>
                            <StarRating rating={r.rating} size={10} />
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{r.text}</p>
                        </div>
                        <span className="shrink-0 text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
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

            {/* Per-business: tabla en desktop, cards en móvil */}
            {stats.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    <h2 className="font-bold text-gray-900 text-sm sm:text-base">Rendimiento por Negocio</h2>
                  </div>
                  <button
                    onClick={() => navigate('/dashboard/create')}
                    className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Agregar negocio</span>
                  </button>
                </div>

                {/* Mobile: cards apiladas */}
                <div className="sm:hidden">
                  {stats.map((s) => <BusinessStatCard key={s._id} s={s} onEdit={handleEditBiz} />)}
                </div>

                {/* Desktop: tabla */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                        <th className="text-left py-3 px-6 font-semibold">Negocio</th>
                        <th className="text-center py-3 px-4 font-semibold">Rating</th>
                        <th className="text-center py-3 px-4 font-semibold">Resenas</th>
                        <th className="text-center py-3 px-4 font-semibold">Votos</th>
                        <th className="text-center py-3 px-4 font-semibold">Acciones</th>
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
                            <div className="flex items-center justify-center gap-3">
                              <button
                                onClick={() => handleEditBiz(s._id, s.business_name || 'Negocio')}
                                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 font-medium transition"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Editar
                              </button>
                              <Link
                                to={`/business/${s._id}`}
                                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                              >
                                Ver <ExternalLink className="w-3 h-3" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sin negocios */}
            {stats.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 sm:p-16 text-center">
                <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="font-semibold text-gray-500 mb-1">No tienes negocios registrados</p>
                <p className="text-sm text-gray-400 mb-5">Crea tu primer negocio para empezar a recibir resenas</p>
                <button
                  onClick={() => navigate('/dashboard/create')}
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
                >
                  <Plus className="w-4 h-4" /> Crear primer negocio
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'reviews' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
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
                  <div key={review.id} className="p-4 sm:p-6 hover:bg-gray-50 transition">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {review.user_display_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Fila superior: nombre + badge */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{review.user_display_name}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <StarRating rating={review.rating} size={11} />
                              <span className="text-xs text-gray-400">{date}</span>
                            </div>
                          </div>
                          <div className="shrink-0">
                            {review.owner_response ? (
                              <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                                <CheckCircle2 className="w-3 h-3" />
                                <span className="hidden xs:inline">Respondida</span>
                                <span className="xs:hidden">✓</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                                <Clock className="w-3 h-3" />
                                <span className="hidden xs:inline">Pendiente</span>
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
                        <ReviewResponseForm review={review} onResponded={handleResponded} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {reviews.length === 0 && (
                <div className="p-12 sm:p-16 text-center">
                  <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400">No hay resenas aun</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal editar negocio */}
      {editingBiz && (
        <EditBusinessModal
          businessId={editingBiz.id}
          businessName={editingBiz.name}
          onSaved={handleBizSaved}
          onClose={() => setEditingBiz(null)}
        />
      )}
    </div>
  );
}
