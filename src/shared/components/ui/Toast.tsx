import { AlertCircle, CheckCircle, X } from "lucide-react";
import type { Notificacion } from "../../lib/types";

interface ToastProps {
  notification: Notificacion | null;
  onClose: () => void;
}

export default function Toast({ notification, onClose }: ToastProps) {
  if (!notification) {
    return null;
  }

  const isSuccess = notification.type === "success";

  return (
    <div className="fixed right-4 top-4 z-[80] w-[calc(100%-2rem)] max-w-sm animate-slide-in">
      <div
        className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${
          isSuccess
            ? "border-green-200 bg-green-50 text-green-900"
            : "border-[#fc3d3c]/25 bg-[#fc3d3c]/10 text-[#7f1d1d]"
        }`}
      >
        {isSuccess ? (
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
        ) : (
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#fc3d3c]" />
        )}
        <p className="min-w-0 flex-1 text-sm font-medium leading-5">
          {notification.message}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 opacity-70 hover:bg-white/70 hover:opacity-100"
          aria-label="Cerrar notificaci?n"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
