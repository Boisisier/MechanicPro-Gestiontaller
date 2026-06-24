import { AlertTriangle, Info, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

const variantStyles = {
  danger: {
    icon: "bg-[#fc3d3c]/10 text-[#fc3d3c]",
    button: "bg-[#fc3d3c] text-white hover:bg-[#df2f2f] focus:ring-[#fc3d3c]/20",
    Icon: AlertTriangle,
  },
  warning: {
    icon: "bg-amber-50 text-amber-700",
    button: "bg-[#0f4471] text-white hover:bg-[#0b365c] focus:ring-[#0f4471]/20",
    Icon: AlertTriangle,
  },
  info: {
    icon: "bg-[#0f4471]/10 text-[#0f4471]",
    button: "bg-[#0f4471] text-white hover:bg-[#0b365c] focus:ring-[#0f4471]/20",
    Icon: Info,
  },
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "warning",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  const styles = variantStyles[variant];
  const Icon = styles.Icon;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-start gap-4 p-5">
          <div className={`rounded-lg p-3 ${styles.icon}`}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <button
                type="button"
                onClick={onCancel}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm leading-6 text-gray-600">{message}</p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm focus:ring-4 ${styles.button}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
