import { useEffect, useState } from 'react';
import { User, Star, Calendar, MapPin, Edit3, MessageSquare, Save, X, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { toast } from '../stores/toastStore';
import { deleteReview } from '../api/reviews';
import type { Review } from '../types';
import ReviewCard from '../components/review/ReviewCard';
import Pagination from '../components/ui/Pagination';
import api from '../api/client';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  user: { label: 'Usuario', color: 'bg-blue-100 text-blue-700' },
  business_owner: { label: 'Propietario', color: 'bg-green-100 text-green-700' },
  admin: { label: 'Admin', color: 'bg-purple-100 text-purple-700' },
};

const LIMIT = 10;

export default function ProfilePage() {
  const { user, fetchUser } = useAuthStore();
  useDocumentTitle(user ? `Perfil de ${user.display_name}` : 'Mi perfil');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);

  const loadReviews = async (pageNum: number) => {
    if (!user) return;
    const res = await api.get(`/reviews/user/${user.id}`, { params: { page: pageNum, limit: LIMIT } });
    setReviews(res.data.items);
    setTotal(res.data.total ?? res.data.items.length);
  };

  useEffect(() => {
    if (user) {
      loadReviews(1).finally(() => setLoading(false));
    }
  }, [user]);

  const handleStartEdit = () => {
    setEditName(user?.display_name || '');
    setEditBio(user?.bio || '');
    setEditing(true);
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error('El nombre no puede estar vacio');
      return;
    }
    setSaving(true);
    try {
      await api.patch('/users/me', {
        display_name: editName.trim(),
        bio: editBio.trim() || null,
      });
      await fetchUser();
      setEditing(false);
      toast.success('Perfil actualizado');
    } catch {
      toast.error('Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadReviews(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setTotal((t) => t - 1);
      toast.success('Reseña eliminada');
    } catch {
      toast.error('Error al eliminar la reseña');
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  const joined = new Date(user.created_at).toLocaleDateString('es-SV', {
    year: 'numeric',
    month: 'long',
  });

  const role = ROLE_LABELS[user.role] || ROLE_LABELS.user;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover + Avatar */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 h-40 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-4 right-16 w-32 h-32 bg-white/5 rounded-full" />
          <div className="absolute bottom-0 left-24 w-24 h-24 bg-white/5 rounded-full" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {/* Profile card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 -mt-12 sm:-mt-14 relative z-10 p-4 sm:p-6">
          <div className="flex items-end gap-3 sm:gap-5 mb-5 sm:mb-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-lg shrink-0 border-4 border-white -mt-12 sm:-mt-14">
              {user.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 focus:bg-white transition font-bold text-gray-900"
                  />
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Cuéntanos algo sobre ti..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 resize-none bg-gray-50 focus:bg-white transition text-gray-600"
                  />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-gray-900">{user.display_name}</h1>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${role.color}`}>
                      {role.label}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm mt-0.5">{user.email}</p>
                  {user.bio && (
                    <p className="text-gray-600 text-sm mt-1 leading-snug">{user.bio}</p>
                  )}
                </>
              )}
            </div>

            {/* Botón editar / guardar */}
            {editing ? (
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white border border-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1 text-sm text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartEdit}
                className="hidden sm:flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition shrink-0"
              >
                <Edit3 className="w-4 h-4" />
                Editar
              </button>
            )}
          </div>

          {/* Mobile edit button */}
          {!editing && (
            <button
              onClick={handleStartEdit}
              className="sm:hidden flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition mb-4 w-full justify-center"
            >
              <Edit3 className="w-4 h-4" /> Editar perfil
            </button>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 border-t border-gray-100 pt-4 sm:pt-5">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{total}</p>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
                <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="truncate">Resenas</span>
              </p>
            </div>
            <div className="text-center border-x border-gray-100">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{avgRating}</p>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
                <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-400 shrink-0" />
                <span className="hidden xs:inline truncate">Rating</span>
                <span className="xs:hidden">★</span>
              </p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {reviews.reduce((sum, r) => sum + r.helpful_count, 0)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">Votos utiles</p>
            </div>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400" />
              Miembro desde {joined}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-gray-400" />
              El Salvador
            </span>
          </div>
        </div>

        {/* Reviews section */}
        <div className="mt-8 pb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">Mis Resenas</h2>
            {total > 0 && (
              <span className="text-sm text-gray-500">{total} resena{total !== 1 ? 's' : ''}</span>
            )}
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                  <div className="flex gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-32" />
                      <div className="h-3 bg-gray-200 rounded w-20" />
                    </div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : reviews.length > 0 ? (
            <>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    showBusinessLink
                    onDelete={handleDeleteReview}
                    onEdit={(updated) => setReviews((prev) => prev.map((r) => r.id === updated.id ? updated : r))}
                  />
                ))}
              </div>
              <Pagination page={page} total={total} limit={LIMIT} onChange={handlePageChange} />
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="font-medium text-gray-500">Aun no has escrito resenas</p>
              <p className="text-sm text-gray-400 mt-1">
                Comparte tu experiencia con la comunidad
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
