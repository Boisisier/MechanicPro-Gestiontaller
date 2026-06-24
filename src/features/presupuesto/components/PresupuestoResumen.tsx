import { BudgetFormData } from "../types/presupuesto";

interface PresupuestoResumenProps {
  budgetForm: BudgetFormData;

  budgetTotal: number;

  onSave: () => void;

  onClear: () => void;
}

export default function PresupuestoResumen({
  budgetForm,
  budgetTotal,
  onSave,
  onClear,
}: PresupuestoResumenProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">Resumen</h3>

      <div className="mt-4 space-y-3">
        <p className="text-sm text-gray-500">Cliente</p>

        <p className="text-sm font-semibold text-gray-900">
          {budgetForm.customerName || "-"}
        </p>

        <p className="text-sm text-gray-500">Vehículo</p>

        <p className="text-sm font-semibold text-gray-900">
          {[budgetForm.patente, budgetForm.vehicle]
            .filter(Boolean)
            .join(" - ") || "-"}
        </p>
      </div>

      <div className="mt-6 border-t border-gray-200 pt-4">
        <p className="text-sm text-gray-500">Total estimado</p>

        <p className="mt-1 text-3xl font-bold text-gray-900">
          ${budgetTotal.toLocaleString("es-CL")}
        </p>
      </div>

      <button
        type="button"
        onClick={onSave}
        className="mt-6 w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
      >
        Guardar presupuesto
      </button>

      <button
        type="button"
        onClick={onClear}
        className="mt-3 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
        Limpiar presupuesto
      </button>
    </div>
  );
}
