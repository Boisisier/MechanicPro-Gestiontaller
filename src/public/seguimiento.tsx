import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { PublicApiError, publicFetch, getTokenFromUrl } from "./publicClient";
import "../index.css";

type VehicleStatus = {
  patente: string;
  marca: string;
  modelo: string;
  ano: number;
  estado: string;
  fecha_ingreso: string;
  promised_delivery_date: string | null;
};

const estadoBadge: Record<string, string> = {
  Ingresado: "bg-orange-100 text-orange-700 border-orange-200",
  "En Taller": "bg-amber-100 text-amber-700 border-amber-200",
  Entregado: "bg-green-100 text-green-700 border-green-200",
};

const estadoMensaje: Record<string, string> = {
  Ingresado: "Tu vehículo fue recibido y está en la fila de ingreso.",
  "En Taller": "Tu vehículo está siendo atendido en el taller.",
  Entregado: "Tu vehículo ya fue entregado. ¡Gracias por confiar en nosotros!",
};

const formatDate = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
};

export default function SeguimientoPage() {
  const [vehicle, setVehicle] = useState<VehicleStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getTokenFromUrl();
    if (!token) {
      setError("Este link no es válido.");
      setLoading(false);
      return;
    }
    publicFetch(`/public/vehicles/${token}`)
      .then((data) => setVehicle(data as VehicleStatus))
      .catch((err) => {
        if (err instanceof PublicApiError && err.status === 404) {
          setError("No encontramos ningún vehículo con este link.");
        } else {
          setError("No pudimos cargar la información. Probá de nuevo en un momento.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#f3f4f8] flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-xl font-bold text-[#0f4471]">MechanicPro</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {loading && (
            <p className="text-center text-gray-500 py-8">Cargando...</p>
          )}

          {!loading && error && (
            <p className="text-center text-gray-600 py-8">{error}</p>
          )}

          {!loading && vehicle && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                Estado de tu vehículo
              </p>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {vehicle.marca} {vehicle.modelo} {vehicle.ano ? `(${vehicle.ano})` : ""}
              </h1>
              <p className="text-sm text-gray-500 mb-4">Patente {vehicle.patente}</p>

              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${
                  estadoBadge[vehicle.estado] || "bg-gray-100 text-gray-700 border-gray-200"
                }`}
              >
                {vehicle.estado}
              </span>

              <p className="text-gray-700 mt-4">
                {estadoMensaje[vehicle.estado] || "Podés consultarnos por el estado de tu vehículo."}
              </p>

              <div className="mt-6 pt-4 border-t border-gray-100 text-sm text-gray-500 space-y-1">
                {formatDate(vehicle.fecha_ingreso) && (
                  <p>Ingresó el {formatDate(vehicle.fecha_ingreso)}</p>
                )}
                {formatDate(vehicle.promised_delivery_date) && (
                  <p>Entrega estimada: {formatDate(vehicle.promised_delivery_date)}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SeguimientoPage />
  </StrictMode>
);
