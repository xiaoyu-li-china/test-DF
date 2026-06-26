import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useSeatStore } from '../store/useSeatStore';

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  success: 'bg-green-900/90 border-green-500/50 text-green-300',
  error: 'bg-red-900/90 border-red-500/50 text-red-300',
  warning: 'bg-yellow-900/90 border-yellow-500/50 text-yellow-300',
  info: 'bg-blue-900/90 border-blue-500/50 text-blue-300',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useSeatStore();

  return (
    <div className="fixed top-16 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        return (
          <div
            key={toast.id}
            className={`
              flex items-start gap-3 px-4 py-3 rounded-xl border
              backdrop-blur-md shadow-lg
              animate-fade-in-up
              ${colorMap[toast.type]}
            `}
          >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
