import { useToastStore } from '../../stores/toastStore';
import type { Toast } from '../../stores/toastStore';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const STYLES: Record<Toast['type'], { bg: string; border: string; icon: React.ElementType; iconColor: string }> = {
  success: { bg: 'bg-white', border: 'border-green-200', icon: CheckCircle2,  iconColor: 'text-green-500'  },
  error:   { bg: 'bg-white', border: 'border-red-200',   icon: AlertCircle,   iconColor: 'text-red-500'    },
  info:    { bg: 'bg-white', border: 'border-blue-200',  icon: Info,          iconColor: 'text-blue-500'   },
  warning: { bg: 'bg-white', border: 'border-yellow-200',icon: AlertTriangle, iconColor: 'text-yellow-500' },
};

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToastStore();
  const s = STYLES[toast.type];
  const Icon = s.icon;

  return (
    <div
      className={`flex items-start gap-3 w-[calc(100vw-2rem)] sm:w-80 max-w-sm rounded-xl border shadow-lg p-3.5 sm:p-4 ${s.bg} ${s.border}`}
      style={{ animation: 'slideIn 0.25s ease-out' }}
    >
      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mt-0.5 shrink-0 ${s.iconColor}`} />
      <p className="flex-1 text-sm text-gray-800 leading-snug">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="text-gray-400 hover:text-gray-600 transition shrink-0 p-0.5"
        aria-label="Cerrar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts } = useToastStore();
  if (toasts.length === 0) return null;

  return (
    <>
      {/* Móvil: bottom center */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 sm:hidden w-full px-4">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </div>
      {/* Desktop: top right */}
      <div className="hidden sm:flex fixed top-5 right-5 z-[9999] flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </div>
    </>
  );
}
