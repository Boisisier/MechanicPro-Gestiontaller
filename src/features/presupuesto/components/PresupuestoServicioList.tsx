import { Trash2 } from "lucide-react";
import { BudgetItem } from "../types/presupuesto";

interface PresupuestoServicioListProps {
  budgetItems: BudgetItem[];
  onRemove: (id: string) => void;
}

export default function PresupuestoServicioList({
  budgetItems,
  onRemove,
}: PresupuestoServicioListProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="border-b border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Servicios presupuestados
        </h3>
      </div>

      {budgetItems.length === 0 ? (
        <div className="p-6 text-sm text-gray-500">
          No hay servicios agregados.
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {budgetItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {item.name}
                </p>

                <p className="text-sm text-gray-500">
                  ${item.price.toLocaleString("es-CL")}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 sm:w-auto"
              >
                <Trash2 className="h-4 w-4" />
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
