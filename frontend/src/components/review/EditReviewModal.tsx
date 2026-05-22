import { useState } from 'react';
import { Star, X, Loader2 } from 'lucide-react';
import { updateReview } from '../../api/reviews';
import { toast } from '../../stores/toastStore';
import type { Review } from '../../types';

interface Props {
  review: Review;
  onSaved: (updated: Review) => void;
  onClose: () => void;
}

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
            className={`w-7 h-7 transition-colors ${
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

export default function EditReviewModal({ review, onSaved, onClose }: Props) {
  const [rating, setRating] = useState(review.rating);
  const [title, setTitle] = useState(review.title || '');
  const [text, setText] = useState(review.text);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      const updated = await updateReview(review.id, {
        rating,
        title: title.trim() || undefined,
        text: text.trim(),
      });
      toast.success('Resena actualizada');
      onSaved(updated);
    } catch {
      toast.error('Error al actualizar la resena');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Editar resena</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Rating */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Calificacion</label>
            <InteractiveStars rating={rating} onChange={setRating} />
          </div>

          {/* Título */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Titulo (opcional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resumen de tu experiencia"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
            />
          </div>

          {/* Texto */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-gray-700">Tu experiencia</label>
              <span className={`text-xs ${text.length > 900 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                {text.length}/1000
              </span>
            </div>
            <textarea
              required
              rows={4}
              maxLength={1000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm bg-gray-50 focus:bg-white transition"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving || !text.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
