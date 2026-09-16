import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { PublicApiError, publicFetch, getTokenFromPath } from "./publicClient";
import "../index.css";

type BudgetItem = {
  id: string;
  name: string;
  item_type: string;
  quantity: number;
  unit_price: number;
};

type Budget = {
  id: string;
  status: string;
  issue_date: string;
  total: number;
  discount_percent: number;
  tax_percent: number;
  advance_required: number;
  items: BudgetItem[];
};

type Photo = {
  id: string;
  url: string;
  caption: string;
  created_at: string;
};

type Workshop = {
  name: string;
  contact_phone: string;
  contact_email: string;
  contact_address: string;
};

type EstadoResponse = {
  vehicle: {
    patente: string;
    marca: string;
    modelo: string;
    ano: number;
    estado: string;
    fecha_ingreso: string;
    promised_delivery_date: string | null;
  };
  budgets: Budget[];
  photos: Photo[];
  workshop: Workshop | null;
};

const etapas = ["Ingresado", "En Taller", "Entregado"];

const formatDate = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
};

const formatMoney = (value: number) =>
  value.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

function ProgressLine({ estado }: { estado: string }) {
  const currentIndex = Math.max(0, etapas.indexOf(estado));
  return (
    <div className="flex items-center">
      {etapas.map((etapa, index) => (
        <div key={etapa} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 ${
                index <= currentIndex
                  ? "bg-[#0f4471] border-[#0f4471] text-white"
                  : "bg-white border-gray-300 text-gray-400"
              }`}
            >
              {index + 1}
            </div>
            <span
              className={`mt-2 text-xs text-center ${
                index <= currentIndex ? "text-[#0f4471] font-medium" : "text-gray-400"
              }`}
            >
              {etapa}
            </span>
          </div>
          {index < etapas.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 ${index < currentIndex ? "bg-[#0f4471]" : "bg-gray-200"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function BudgetSection({ budget }: { budget: Budget }) {
  const subtotal = budget.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  return (
    <div className="border border-gray-200 rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">
          Presupuesto del {formatDate(budget.issue_date)}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
          {budget.status}
        </span>
      </div>
      <ul className="divide-y divide-gray-100">
        {budget.items.map((item) => (
          <li key={item.id} className="py-2 flex items-center justify-between text-sm">
            <div>
              <p className="text-gray-800">{item.name}</p>
              <p className="text-gray-400 text-xs">
                {item.quantity} x {formatMoney(item.unit_price)}
              </p>
            </div>
            <span className="text-gray-700 font-medium">
              {formatMoney(item.quantity * item.unit_price)}
            </span>
          </li>
        ))}
      </ul>
      <div className="border-t border-gray-100 mt-2 pt-2 space-y-1 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatMoney(subtotal)}</span>
        </div>
        {budget.discount_percent > 0 && (
          <div className="flex justify-between">
            <span>Descuento ({budget.discount_percent}%)</span>
            <span>-{formatMoney((subtotal * budget.discount_percent) / 100)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-gray-900">
          <span>Total</span>
          <span>{formatMoney(budget.total)}</span>
        </div>
      </div>
    </div>
  );
}

export default function EstadoPage() {
  const [data, setData] = useState<EstadoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getTokenFromPath("/estado");
    if (!token) {
      setError("Este link no es válido.");
      setLoading(false);
      return;
    }
    publicFetch(`/public/estado/${token}`)
      .then((payload) => setData(payload as EstadoResponse))
      .catch((err) => {
        if (err instanceof PublicApiError && err.status === 404) {
          setError("No encontramos ningún vehículo con este link. Puede haber vencido.");
        } else {
          setError("No pudimos cargar la información. Probá de nuevo en un momento.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#f3f4f8] flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <span className="text-xl font-bold text-[#0f4471]">MechanicPro</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {loading && <p className="text-center text-gray-500 py-8">Cargando...</p>}

          {!loading && error && <p className="text-center text-gray-600 py-8">{error}</p>}

          {!loading && data && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                Estado de tu vehículo
              </p>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {data.vehicle.marca} {data.vehicle.modelo}{" "}
                {data.vehicle.ano ? `(${data.vehicle.ano})` : ""}
              </h1>
              <p className="text-sm text-gray-500 mb-6">Patente {data.vehicle.patente}</p>

              <ProgressLine estado={data.vehicle.estado} />

              <div className="mt-6 pt-4 border-t border-gray-100 text-sm text-gray-500 space-y-1">
                {formatDate(data.vehicle.fecha_ingreso) && (
                  <p>Ingresó el {formatDate(data.vehicle.fecha_ingreso)}</p>
                )}
                {formatDate(data.vehicle.promised_delivery_date) && (
                  <p>Entrega estimada: {formatDate(data.vehicle.promised_delivery_date)}</p>
                )}
              </div>

              {data.photos.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Fotos del avance</p>
                  <div className="grid grid-cols-2 gap-2">
                    {data.photos.map((photo) => (
                      <figure key={photo.id}>
                        <img
                          src={photo.url}
                          alt={photo.caption || "Foto del avance del vehículo"}
                          className="w-full h-28 object-cover rounded-lg border border-gray-200"
                        />
                        {photo.caption && (
                          <figcaption className="text-xs text-gray-500 mt-1">
                            {photo.caption}
                          </figcaption>
                        )}
                      </figure>
                    ))}
                  </div>
                </div>
              )}

              {data.budgets.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <p className="text-sm font-semibold text-gray-700">Presupuesto</p>
                  {data.budgets.map((budget) => (
                    <BudgetSection key={budget.id} budget={budget} />
                  ))}
                </div>
              )}

              {data.workshop &&
                (data.workshop.contact_phone ||
                  data.workshop.contact_email ||
                  data.workshop.contact_address) && (
                  <div className="mt-6 pt-4 border-t border-gray-100 text-sm text-gray-500 space-y-1">
                    <p className="font-semibold text-gray-700">{data.workshop.name}</p>
                    {data.workshop.contact_phone && <p>{data.workshop.contact_phone}</p>}
                    {data.workshop.contact_email && <p>{data.workshop.contact_email}</p>}
                    {data.workshop.contact_address && <p>{data.workshop.contact_address}</p>}
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <EstadoPage />
  </StrictMode>
);
