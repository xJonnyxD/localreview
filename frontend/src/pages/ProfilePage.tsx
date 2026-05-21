import { useEffect, useState } from 'react';
import { User, Star, Calendar, MapPin, Edit3, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import type { Review } from '../types';
import ReviewCard from '../components/review/ReviewCard';
import api from '../api/client';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  user: { label: 'Usuario', color: 'bg-blue-100 text-blue-700' },
  business_owner: { label: 'Propietario', color: 'bg-green-100 text-green-700' },
  admin: { label: 'Admin', color: 'bg-purple-100 text-purple-700' },
};

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      api.get(`/reviews/user/${user.id}`)
        .then((res) => setReviews(res.data.items))
        .finally(() => setLoading(false));
    }
  }, [user]);

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
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 -mt-14 relative z-10 p-6">
          <div className="flex items-end gap-5 mb-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg shrink-0 border-4 border-white -mt-14">
              {user.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{user.display_name}</h1>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${role.color}`}>
                  {role.label}
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-0.5">{user.email}</p>
            </div>
            <button className="hidden sm:flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition shrink-0">
              <Edit3 className="w-4 h-4" />
              Editar
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-5">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{reviews.length}</p>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" /> Resenas
              </p>
            </div>
            <div className="text-center border-x border-gray-100">
              <p className="text-2xl font-bold text-gray-900">{avgRating}</p>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-400" /> Rating promedio
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {reviews.reduce((sum, r) => sum + r.helpful_count, 0)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Votos utiles</p>
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
            {reviews.length > 0 && (
              <span className="text-sm text-gray-500">{reviews.length} resena{reviews.length !== 1 ? 's' : ''}</span>
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
            <div className="space-y-4">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
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
