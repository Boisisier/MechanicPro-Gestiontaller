import { ChangeEvent, FormEvent } from "react";
import { Plus } from "lucide-react";
import { BudgetService } from "../types/presupuesto";
import type { CatalogService } from "../../../shared/lib/types";

interface PresupuestoServicioFormProps {
  budgetService: BudgetService;

  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;

  onSubmit: (event: FormEvent) => void;
  catalog: CatalogService[];
  onServiceSelect: (name: string) => void;
}

export default function PresupuestoServicioForm({
  budgetService,
  onChange,
  onSubmit,
  catalog,
  onServiceSelect,
}: PresupuestoServicioFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3"
    >
      <select
        name="name"
        value={budgetService.name}
        onChange={(event) => onServiceSelect(event.target.value)}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
      >
        <option value="">Selecciona un servicio</option>

        {catalog.map((service) => (
          <option key={service.id || service.name} value={service.name}>
            {service.name}
          </option>
        ))}
      </select>

      <input
        type="number"
        name="price"
        value={budgetService.price}
        onChange={onChange}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        placeholder="Valor"
        min="0"
      />

      <button
        type="submit"
        className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Agregar
      </button>
    </form>
  );
}
