import { ThumbsUp, MessageCircle, Star } from 'lucide-react';
import type { Review } from '../../types';

interface Props {
  review: Review;
  onHelpful?: (id: string) => void;
  onComment?: (id: string) => void;
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

export default function ReviewCard({ review, onHelpful, onComment, extra }: Props) {
  const date = new Date(review.created_at).toLocaleDateString('es-SV', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const gradient = getGradient(review.user_display_name);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
      {/* Author row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
            {review.user_display_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{review.user_display_name}</p>
            <p className="text-xs text-gray-400">{date}</p>
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
      {review.photos.length > 0 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {review.photos.map((photo, i) => (
            <img
              key={i}
              src={photo.thumbnail_url || photo.url}
              alt=""
              className="w-20 h-20 rounded-xl object-cover shrink-0"
            />
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
      <div className="flex items-center gap-4 mt-4 pt-3.5 border-t border-gray-100">
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
      </div>

      {extra && <div className="mt-3">{extra}</div>}
    </div>
  );
}
