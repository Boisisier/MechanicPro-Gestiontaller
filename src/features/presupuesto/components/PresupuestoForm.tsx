import { ChangeEvent } from "react";
import { BudgetFormData } from "../types/presupuesto";

interface PresupuestoFormProps {
  budgetForm: BudgetFormData;

  onChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
}

export default function PresupuestoForm({
  budgetForm,
  onChange,
}: PresupuestoFormProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <input
        name="customerName"
        value={budgetForm.customerName}
        onChange={onChange}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        placeholder="Nombre del cliente"
      />

      <input
        name="customerPhone"
        value={budgetForm.customerPhone}
        onChange={onChange}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        placeholder="Teléfono"
      />

      <input
        name="patente"
        value={budgetForm.patente}
        onChange={onChange}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm uppercase focus:border-blue-500 focus:outline-none"
        placeholder="Patente"
      />

      <input
        name="vehicle"
        value={budgetForm.vehicle}
        onChange={onChange}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        placeholder="Vehículo"
      />

      <textarea
        name="notes"
        value={budgetForm.notes}
        onChange={onChange}
        rows={4}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm resize-none focus:border-blue-500 focus:outline-none md:col-span-2"
        placeholder="Observaciones del presupuesto"
      />
    </div>
  );
}
