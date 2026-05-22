import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ThumbsUp, MessageCircle, Star, Trash2, X, ChevronLeft, ChevronRight, ExternalLink, Pencil, Camera, Loader2 } from 'lucide-react';
import { uploadPhoto } from '../../api/reviews';
import { toast } from '../../stores/toastStore';
import { useAuthStore } from '../../stores/authStore';
import type { Review } from '../../types';
import EditReviewModal from './EditReviewModal';

interface Props {
  review: Review;
  onHelpful?: (id: string) => void;
  onComment?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (updated: Review) => void;
  /** Muestra enlace "Ver negocio" — útil en ProfilePage */
  showBusinessLink?: boolean;
  extra?: React.ReactNode;
}

const AVATAR_GRADIENTS = [
  'from-indigo-400 to-blue-500',
  'from-purple-400 to-pink-500',
  'from-orange-400 to-red-500',
  'from-green-400 to-teal-500',
  'from-yellow-400 to-orange-500',
];

function getGradient(name: string) {
  const i = name.charCodeAt(0) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[i];
}

export default function ReviewCard({ review, onHelpful, onComment, onDelete, onEdit, showBusinessLink, extra }: Props) {
  const { user } = useAuthStore();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [localPhotos, setLocalPhotos] = useState(review.photos);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwner = user?.id === review.user_id;

  const date = new Date(review.created_at).toLocaleDateString('es-SV', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Fecha relativa
  const getRelativeDate = () => {
    const diffMs = Date.now() - new Date(review.created_at).getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} dias`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem`;
    if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
    return date;
  };

  const gradient = getGradient(review.user_display_name);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const result = await uploadPhoto(file, review.id);
      const newPhoto = { url: result.url, thumbnail_url: result.thumbnail_url, caption: null };
      setLocalPhotos((prev) => [...prev, newPhoto]);
      toast.success('Foto agregada a la resena');
    } catch {
      toast.error('Error al subir la foto');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
        {/* Author row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
              {review.user_display_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{review.user_display_name}</p>
              <p className="text-xs text-gray-400" title={date}>{getRelativeDate()}</p>
            </div>
          </div>

          {/* Stars */}
          <div className="flex items-center gap-0.5 shrink-0">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-4 h-4 ${
                  s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        {review.title && (
          <h4 className="font-bold text-gray-900 mt-3 text-sm">{review.title}</h4>
        )}
        <p className="text-gray-600 mt-2 text-sm leading-relaxed">{review.text}</p>

        {/* Tags */}
        {review.tags.length > 0 && (
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {review.tags.map((tag) => (
              <span key={tag} className="bg-indigo-50 text-indigo-600 text-xs px-2.5 py-0.5 rounded-full font-medium">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Photos */}
        {localPhotos.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {localPhotos.map((photo, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="shrink-0 focus:outline-none rounded-xl overflow-hidden"
              >
                <img
                  src={photo.thumbnail_url || photo.url}
                  alt=""
                  loading="lazy"
                  className="w-20 h-20 rounded-xl object-cover hover:opacity-90 transition cursor-pointer"
                />
              </button>
            ))}
          </div>
        )}

        {/* Owner response */}
        {review.owner_response && (
          <div className="mt-4 bg-indigo-50 rounded-xl p-3.5 border-l-4 border-indigo-400">
            <p className="text-xs font-bold text-indigo-700 mb-1.5 uppercase tracking-wide">
              Respuesta del negocio
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{review.owner_response.text}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 mt-4 pt-3.5 border-t border-gray-100 flex-wrap">
          <button
            onClick={() => onHelpful?.(review.id)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition font-medium"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            Util ({review.helpful_count})
          </button>
          <button
            onClick={() => onComment?.(review.id)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition font-medium"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Comentar
          </button>

          {/* Acciones del autor */}
          {isOwner && (
            <>
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-600 transition font-medium"
              >
                <Pencil className="w-3.5 h-3.5" />
                Editar
              </button>
              <label className={`flex items-center gap-1.5 text-xs font-medium transition cursor-pointer ${uploadingPhoto ? 'text-gray-300' : 'text-gray-400 hover:text-green-600'}`}>
                {uploadingPhoto
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Camera className="w-3.5 h-3.5" />
                }
                {uploadingPhoto ? 'Subiendo...' : 'Foto'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                />
              </label>
            </>
          )}

          {showBusinessLink && (
            <Link
              to={`/business/${review.business_id}`}
              className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition font-medium ml-auto"
            >
              Ver negocio <ExternalLink className="w-3 h-3" />
            </Link>
          )}
          {onDelete && (
            <button
              onClick={() => {
                if (window.confirm('¿Eliminar esta reseña? Esta acción no se puede deshacer.')) {
                  onDelete(review.id);
                }
              }}
              className={`flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition font-medium ${!showBusinessLink ? 'ml-auto' : ''}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar
            </button>
          )}
        </div>

        {extra && <div className="mt-3">{extra}</div>}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && localPhotos.length > 0 && (
        <div
          className="fixed inset-0 bg-black/80 z-[9998] flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={localPhotos[lightboxIndex].url}
              alt=""
              className="w-full max-h-[80vh] object-contain rounded-2xl"
            />
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-3 right-3 w-9 h-9 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
            {localPhotos.length > 1 && (
              <>
                <button
                  onClick={() => setLightboxIndex((lightboxIndex - 1 + localPhotos.length) % localPhotos.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setLightboxIndex((lightboxIndex + 1) % localPhotos.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <p className="text-center text-white/70 text-sm mt-2">
                  {lightboxIndex + 1} / {localPhotos.length}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal editar reseña */}
      {showEditModal && (
        <EditReviewModal
          review={review}
          onSaved={(updated) => {
            setShowEditModal(false);
            onEdit?.(updated);
          }}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  );
}
