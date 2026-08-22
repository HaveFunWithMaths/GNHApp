import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { cn } from '../../utils/cn';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
          info: <Info className="w-5 h-5 text-sky-500 shrink-0" />,
        };

        const borderColors = {
          success: 'border-emerald-500/30 bg-emerald-50/95 dark:bg-emerald-950/90 text-emerald-950 dark:text-emerald-50',
          error: 'border-rose-500/30 bg-rose-50/95 dark:bg-rose-950/90 text-rose-950 dark:text-rose-50',
          warning: 'border-amber-500/30 bg-amber-50/95 dark:bg-amber-950/90 text-amber-950 dark:text-amber-50',
          info: 'border-sky-500/30 bg-sky-50/95 dark:bg-sky-950/90 text-sky-950 dark:text-sky-50',
        };

        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md transition-all animate-slide-up',
              borderColors[toast.type]
            )}
          >
            {icons[toast.type]}
            <div className="flex-1 min-w-0 pr-2">
              <h4 className="text-sm font-semibold tracking-tight leading-snug">
                {toast.title}
              </h4>
              {toast.message && (
                <p className="text-xs opacity-90 mt-0.5 leading-relaxed break-words">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-current opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
