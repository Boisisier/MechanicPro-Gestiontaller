import { ConfirmDialogOptions } from "../../shared/hooks/useConfirmDialog";
import PresupuestoForm from "./components/PresupuestoForm";
import PresupuestoResumen from "./components/PresupuestoResumen";
import PresupuestoServicioForm from "./components/PresupuestoServicioForm";
import PresupuestoServicioList from "./components/PresupuestoServicioList";
import usePresupuesto from "./hooks/usePresupuesto";

interface PresupuestoPageProps {
  requestConfirmation: (options: ConfirmDialogOptions) => void;
}
export default function PresupuestoPage({
  requestConfirmation,
}: PresupuestoPageProps) {
  const {
    budgetForm,
    budgetService,
    budgetItems,
    budgetTotal,
    handleBudgetFormChange,
    handleBudgetServiceChange,
    handleAddBudgetService,
    handleRemoveBudgetService,
    handleSaveBudget,
    handleClearBudget,
  } = usePresupuesto(requestConfirmation);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-gray-900">Presupuesto</h2>

        <p className="text-sm text-gray-500">
          Arma un presupuesto simple de servicios mecánicos.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PresupuestoForm
            budgetForm={budgetForm}
            onChange={handleBudgetFormChange}
          />

          <PresupuestoServicioForm
            budgetService={budgetService}
            onChange={handleBudgetServiceChange}
            onSubmit={handleAddBudgetService}
          />
        </div>

        <PresupuestoResumen
          budgetForm={budgetForm}
          budgetTotal={budgetTotal}
          onSave={handleSaveBudget}
          onClear={handleClearBudget}
        />
      </div>

      <PresupuestoServicioList
        budgetItems={budgetItems}
        onRemove={handleRemoveBudgetService}
      />
    </div>
  );
}
