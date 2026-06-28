import { Package } from "lucide-react";
import { Vehicle } from "../../../shared/lib/types";

interface DashboardInventoryMovementsProps {
  inventoryMovements: Array<{
    id: string;
    name: string;
    quantity: number;
    vehicle: Vehicle;
    date: string;
  }>;
}

export default function DashboardInventoryMovements({
  inventoryMovements,
}: DashboardInventoryMovementsProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Movimientos de inventario
        </h3>
        <Package className="h-5 w-5 text-[#0f4471]" />
      </div>
      {inventoryMovements.length === 0 ? (
        <p className="text-sm text-gray-500">Sin movimientos de repuestos.</p>
      ) : (
        <div className="space-y-3">
          {inventoryMovements.map((movement) => (
            <div key={movement.id} className="rounded-lg bg-gray-50 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">
                  {movement.name}
                </p>
                <span className="rounded-full bg-[#fc3d3c]/10 px-2 py-1 text-xs font-semibold text-[#b42318]">
                  -{movement.quantity}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {movement.vehicle.patente} ·{" "}
                {new Date(movement.date).toLocaleDateString("es-CL")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
