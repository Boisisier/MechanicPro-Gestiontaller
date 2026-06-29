import {
  parseStoredReviewParts,
  parseStoredReviewServices,
} from "../../shared/utils/reviewParsers";
import useEstacionamiento from "./hooks/useEstacionamiento";

export default function EstacionamientoPage() {
  const {
    parkedVehicles,
    getVehicleWorkTotal,
    getParkingDays,
    getVehicleExitDate,
    handleReleaseFromParking,
    canViewPrices,
  } = useEstacionamiento();
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-gray-900">Estacionamiento</h2>
        <p className="text-sm text-gray-500">
          Vehículos entregados que llevan más de una semana en el taller.
        </p>
      </div>

      {parkedVehicles.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-sm text-gray-500 shadow-sm">
          No hay vehículos pendientes en estacionamiento.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {parkedVehicles.map((vehicle) => {
            const services = parseStoredReviewServices(vehicle.servicios);
            const parts = parseStoredReviewParts(vehicle.servicios);
            const total = getVehicleWorkTotal(vehicle);

            return (
              <div
                key={vehicle.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#0f4471]">
                      {getParkingDays(vehicle)} dias estacionado
                    </p>
                    <h3 className="mt-1 text-lg font-bold uppercase text-gray-900">
                      {vehicle.patente}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {vehicle.marca} {vehicle.modelo} · {vehicle.ano}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>
                        Ingreso:{" "}
                        {new Date(vehicle.fecha_ingreso).toLocaleDateString(
                          "es-CL",
                        )}
                      </span>
                      <span>
                        Salida:{" "}
                        {getVehicleExitDate(vehicle).toLocaleDateString(
                          "es-CL",
                        )}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReleaseFromParking(vehicle)}
                    className="rounded-lg bg-[#fc3d3c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#df2f2f]"
                  >
                    Sacar del estacionamiento
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                  {canViewPrices && (
                    <div className="rounded-lg border border-gray-200 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Cliente
                      </p>
                      <p className="mt-2 text-sm font-semibold text-gray-900">
                        {vehicle.customer_name || "Sin cliente"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {vehicle.customer_rut || "-"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {vehicle.customer_phone || "-"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {vehicle.customer_city || "-"}
                      </p>
                    </div>
                  )}

                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Usuario
                    </p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {vehicle.assigned_mechanic_name ||
                        "Sin mecánico asignado"}
                    </p>
                    <p className="text-xs text-gray-500">
                      Ingreso:{" "}
                      {new Date(vehicle.fecha_ingreso).toLocaleDateString(
                        "es-CL",
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      Salida:{" "}
                      {getVehicleExitDate(vehicle).toLocaleDateString("es-CL")}
                    </p>
                  </div>

                  {canViewPrices && (
                    <div className="rounded-lg border border-gray-200 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Valor total
                      </p>
                      <p className="mt-2 text-2xl font-bold text-gray-900">
                        ${total.toLocaleString("es-CL")}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-sm font-semibold text-gray-900">
                      Trabajos realizados
                    </p>
                    {services.length === 0 ? (
                      <p className="mt-2 text-sm text-gray-500">
                        Sin servicios registrados.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-1 text-sm text-gray-700">
                        {services.map((service) => (
                          <li
                            key={service.name}
                            className="flex justify-between gap-3"
                          >
                            <span>{service.name}</span>
                            {canViewPrices && (
                              <span className="font-semibold">
                                $
                                {(
                                  parseInt(service.price || "0", 10) || 0
                                ).toLocaleString("es-CL")}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-sm font-semibold text-gray-900">
                      Repuestos e insumos
                    </p>
                    {parts.length === 0 ? (
                      <p className="mt-2 text-sm text-gray-500">
                        Sin repuestos registrados.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-1 text-sm text-gray-700">
                        {parts.map((part) => (
                          <li
                            key={part.inventoryItemId}
                            className="flex justify-between gap-3"
                          >
                            <span>
                              {part.name} x{part.quantity} {part.unit}
                            </span>
                            {canViewPrices && (
                              <span className="font-semibold">
                                $
                                {(
                                  part.quantity * (part.unitCost || 0)
                                ).toLocaleString("es-CL")}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
