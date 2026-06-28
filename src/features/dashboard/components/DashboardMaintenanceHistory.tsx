import { History } from "lucide-react";
import { Vehicle } from "../../../shared/lib/types";
import { parseStoredReviewServices } from "../../../shared/utils/reviewParsers";

interface DashboardMaintenanceHistoryProps {
  latestMaintenances: Vehicle[];
}

export default function DashboardMaintenanceHistory({
  latestMaintenances,
}: DashboardMaintenanceHistoryProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Historial de mantenciones
        </h3>
        <History className="h-5 w-5 text-[#0f4471]" />
      </div>
      {latestMaintenances.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
          No hay mantenciones registradas.
        </p>
      ) : (
        <div className="divide-y divide-gray-100">
          {latestMaintenances.map((vehicle) => {
            const services = parseStoredReviewServices(vehicle.servicios);
            return (
              <div key={vehicle.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase text-gray-900">
                      {vehicle.patente}
                    </p>
                    <p className="text-xs text-gray-500">
                      {vehicle.marca} {vehicle.modelo} ·{" "}
                      {vehicle.customer_name || "Sin cliente"}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(
                      vehicle.updated_at || vehicle.fecha_ingreso,
                    ).toLocaleDateString("es-CL")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-700">
                  {services
                    .map((service) => service.name)
                    .slice(0, 3)
                    .join(", ")}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
