import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Phone, Globe, Clock, Star, ChevronLeft, CheckCircle, Share2, ThumbsUp } from 'lucide-react';
import { getBusiness } from '../api/businesses';
import { getBusinessReviews, createReview, toggleHelpful } from '../api/reviews';
import type { Business, Review } from '../types';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/toastStore';
import ReviewCard from '../components/review/ReviewCard';
import CommentThread from '../components/review/CommentThread';
import BusinessMapLazy from '../components/map/BusinessMapLazy';
import Pagination from '../components/ui/Pagination';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const DAYS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
const LIMIT = 10;

function InteractiveStars({ rating, onChange }: { rating: number; onChange: (r: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`w-8 h-8 transition-colors ${
              s <= (hover || rating)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300 fill-gray-100'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500 w-4 text-right">{star}</span>
      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 shrink-0" />
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div
          className="bg-yellow-400 h-2 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-gray-400 text-xs w-8 text-right">{count}</span>
    </div>
  );
}

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [business, setBusiness] = useState<Business | null>(null);
  useDocumentTitle(business?.name);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadReviews = async (pageNum: number) => {
    if (!id) return;
    setReviewsLoading(true);
    try {
      const res = await getBusinessReviews(id, { page: pageNum, limit: LIMIT });
      setReviews(res.items);
      setTotal(res.total);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getBusiness(id),
      getBusinessReviews(id, { page: 1, limit: LIMIT }),
    ]).then(([biz, revRes]) => {
      setBusiness(biz);
      setReviews(revRes.items);
      setTotal(revRes.total);
    }).catch(() => {
      toast.error('Error al cargar el negocio');
    }).finally(() => setLoading(false));
  }, [id]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadReviews(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    try {
      const review = await createReview({
        business_id: id,
        rating: newRating,
        title: newTitle || undefined,
        text: newText,
      });
      setReviews([review, ...reviews]);
      setTotal((t) => t + 1);
      setShowForm(false);
      setNewTitle('');
      setNewText('');
      setNewRating(5);
      toast.success('Resena publicada exitosamente');
    } catch {
      toast.error('Error al publicar la resena');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHelpful = async (reviewId: string) => {
    try {
      const updated = await toggleHelpful(reviewId);
      setReviews(reviews.map((r) => (r.id === reviewId ? updated : r)));
    } catch {
      toast.error('Debes iniciar sesion para votar');
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
        <div className="bg-white rounded-3xl overflow-hidden border border-gray-100">
          <div className="h-64 bg-gray-200" />
          <div className="p-6 space-y-4">
            <div className="h-8 bg-gray-200 rounded w-64" />
            <div className="h-4 bg-gray-200 rounded w-40" />
            <div className="h-4 bg-gray-200 rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!business) return (
    <div className="text-center py-24 text-gray-400">
      <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p>Negocio no encontrado</p>
    </div>
  );

  const dist = [5, 4, 3, 2, 1].map((s) => ({
    star: s,
    count: reviews.filter((r) => r.rating === s).length,
  }));

  const hasLocation = business.latitude != null && business.longitude != null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back nav */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/search"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            Volver a resultados
          </Link>
          {business.is_verified && (
            <span className="flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full font-semibold ml-auto">
              <CheckCircle className="w-3.5 h-3.5" />
              Verificado
            </span>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Business header card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          {/* Cover image */}
          <div className="h-44 sm:h-56 md:h-72 bg-gradient-to-br from-indigo-200 via-purple-100 to-pink-100 relative">
            {business.photo_url ? (
              <img
                src={business.photo_url}
                alt={business.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MapPin className="w-20 h-20 text-indigo-200" />
              </div>
            )}
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: business.name,
                    text: `Mira ${business.name} en LocalReview`,
                    url: window.location.href,
                  }).catch(() => {});
                } else {
                  navigator.clipboard?.writeText(window.location.href);
                  toast.success('Enlace copiado');
                }
              }}
              className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-gray-600 hover:bg-white transition shadow-sm"
              aria-label="Compartir negocio"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 sm:p-6">
            <div className="flex flex-wrap gap-2 mb-3">
              {business.categories.map((c) => (
                <span key={c.id} className="bg-indigo-50 text-indigo-700 text-xs px-3 py-1 rounded-full font-semibold">
                  {c.name}
                </span>
              ))}
              {business.price_level && (
                <span className="bg-green-50 text-green-700 text-xs px-3 py-1 rounded-full font-semibold">
                  {'$'.repeat(business.price_level)}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">{business.name}</h1>

            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xl sm:text-2xl font-bold text-gray-900">{business.avg_rating.toFixed(1)}</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-5 h-5 ${s <= Math.round(business.avg_rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`}
                    />
                  ))}
                </div>
              </div>
              <span className="text-gray-500 text-sm">
                {business.review_count} resena{business.review_count !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <ThumbsUp className="w-4 h-4 text-indigo-400" />
                {reviews.reduce((s, r) => s + r.helpful_count, 0)} votos utiles
              </div>
            </div>

            {business.description && (
              <p className="text-gray-600 mt-4 leading-relaxed">{business.description}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-100">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Informacion</h3>
                <div className="space-y-2.5 text-sm text-gray-600">
                  <p className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    {business.address}, {business.city}
                  </p>
                  {business.phone && (
                    <a href={`tel:${business.phone}`} className="flex items-center gap-2.5 hover:text-indigo-600 transition">
                      <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                      {business.phone}
                    </a>
                  )}
                  {business.website && (
                    <a
                      href={business.website}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2.5 text-indigo-600 hover:text-indigo-800 transition truncate"
                    >
                      <Globe className="w-4 h-4 shrink-0" />
                      <span className="truncate">{business.website}</span>
                    </a>
                  )}
                </div>
              </div>

              {business.hours.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-gray-400" />
                    Horarios
                  </h3>
                  <div className="space-y-1.5">
                    {business.hours
                      .sort((a, b) => a.day_of_week - b.day_of_week)
                      .map((h) => {
                        const today = new Date().getDay();
                        const dayIndex = today === 0 ? 6 : today - 1;
                        const isToday = h.day_of_week === dayIndex;
                        return (
                          <div
                            key={h.id}
                            className={`flex justify-between text-sm rounded-lg px-2 py-1 ${isToday ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-gray-600'}`}
                          >
                            <span>{DAYS[h.day_of_week]}</span>
                            <span>{h.is_closed ? 'Cerrado' : `${h.open_time} - ${h.close_time}`}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Mini mapa */}
            {hasLocation && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  Ubicacion en el mapa
                </h3>
                <BusinessMapLazy businesses={[business]} height={200} single />
              </div>
            )}
          </div>
        </div>

        {/* Reviews section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rating summary sidebar */}
          {reviews.length > 0 && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm sticky top-24">
                <h3 className="font-bold text-gray-900 mb-4">Resumen de Rating</h3>
                <div className="text-center mb-5">
                  <p className="text-5xl font-extrabold text-gray-900">{business.avg_rating.toFixed(1)}</p>
                  <div className="flex justify-center mt-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-5 h-5 ${s <= Math.round(business.avg_rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{business.review_count} resenas</p>
                </div>
                <div className="space-y-2">
                  {dist.map((d) => (
                    <RatingBar key={d.star} star={d.star} count={d.count} total={reviews.length} />
                  ))}
                </div>
                {user && (
                  <button
                    onClick={() => setShowForm(!showForm)}
                    className="w-full mt-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition shadow-sm"
                  >
                    Escribir resena
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Reviews list */}
          <div className={reviews.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Resenas <span className="text-gray-400 font-normal text-base">({total})</span>
              </h2>
              {user && reviews.length === 0 && (
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition"
                >
                  Escribir resena
                </button>
              )}
            </div>

            {/* Review form */}
            {showForm && (
              <form
                onSubmit={handleSubmitReview}
                className="bg-white border border-indigo-100 rounded-2xl p-6 mb-5 shadow-sm space-y-4"
              >
                <h3 className="font-bold text-gray-900">Tu resena</h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Calificacion</label>
                  <InteractiveStars rating={newRating} onChange={setNewRating} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Titulo (opcional)</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Resumen de tu experiencia"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-gray-700">Tu experiencia</label>
                    <span className={`text-xs ${newText.length > 900 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                      {newText.length}/1000
                    </span>
                  </div>
                  <textarea
                    required
                    rows={4}
                    maxLength={1000}
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="Cuenta tu experiencia en detalle..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm bg-gray-50 focus:bg-white transition"
                  />
                </div>
                <div className="flex flex-col xs:flex-row gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full xs:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition text-center"
                  >
                    {submitting ? 'Publicando...' : 'Publicar resena'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="w-full xs:w-auto text-gray-500 hover:text-gray-700 text-sm font-medium px-3 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition text-center"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* Review cards with comments */}
            <div className="space-y-4">
              {reviewsLoading && (
                <div className="space-y-4">
                  {[1,2,3].map((i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 bg-gray-200 rounded w-28" />
                          <div className="h-3 bg-gray-200 rounded w-20" />
                        </div>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map((s) => <div key={s} className="w-4 h-4 bg-gray-200 rounded" />)}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-full" />
                        <div className="h-3 bg-gray-200 rounded w-4/5" />
                        <div className="h-3 bg-gray-200 rounded w-3/5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!reviewsLoading && reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onHelpful={handleHelpful}
                  onEdit={(updated) => setReviews((prev) => prev.map((r) => r.id === updated.id ? updated : r))}
                  extra={<CommentThread reviewId={review.id} />}
                />
              ))}
              {!reviewsLoading && reviews.length === 0 && !showForm && (
                <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center shadow-sm">
                  <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="font-semibold text-gray-500 mb-1">Sin resenas aun</p>
                  <p className="text-sm text-gray-400">Se el primero en compartir tu experiencia</p>
                  {!user && (
                    <Link
                      to="/login"
                      className="inline-block mt-4 text-sm text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      Inicia sesion para opinar
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Paginacion de resenas */}
            <Pagination page={page} total={total} limit={LIMIT} onChange={handlePageChange} />
          </div>
        </div>
      </div>
    </div>
  );
}
