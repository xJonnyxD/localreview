import { useState } from 'react';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { getComments, addComment } from '../../api/reviews';
import { useAuthStore } from '../../stores/authStore';
import { toast } from '../../stores/toastStore';
import type { Comment } from '../../types';

interface CommentThreadProps {
  reviewId: string;
  commentCount?: number;
}

export default function CommentThread({ reviewId, commentCount = 0 }: CommentThreadProps) {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleToggle = async () => {
    if (!open && !loaded) {
      setLoading(true);
      try {
        const data = await getComments(reviewId);
        setComments(data);
        setLoaded(true);
      } catch {
        toast.error('No se pudieron cargar los comentarios');
      } finally {
        setLoading(false);
      }
    }
    setOpen((prev) => !prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const comment = await addComment(reviewId, text.trim());
      setComments((prev) => [...prev, comment]);
      setText('');
      toast.success('Comentario publicado');
    } catch {
      toast.error('Error al publicar el comentario');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition font-medium"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <MessageCircle className="w-4 h-4" />
        )}
        {open ? 'Ocultar comentarios' : `Comentarios${commentCount > 0 ? ` (${commentCount})` : ''}`}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {comments.length === 0 && !loading && (
            <p className="text-sm text-gray-400 italic">Sin comentarios aun.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-300 to-purple-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {c.user_display_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                <p className="text-xs font-semibold text-gray-700">{c.user_display_name}</p>
                <p className="text-sm text-gray-600 mt-0.5 leading-snug">{c.text}</p>
              </div>
            </div>
          ))}

          {user ? (
            <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1">
                {user.display_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Escribe un comentario..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-gray-50 focus:bg-white transition"
                    maxLength={500}
                  />
                  <button
                    type="submit"
                    disabled={submitting || !text.trim()}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {text.length > 0 && (
                  <p className={`text-xs text-right ${text.length > 450 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                    {text.length}/500
                  </p>
                )}
              </div>
            </form>
          ) : (
            <p className="text-xs text-gray-400 mt-2">
              <a href="/login" className="text-indigo-600 hover:underline font-medium">Inicia sesion</a> para comentar
            </p>
          )}
        </div>
      )}
    </div>
  );
}
