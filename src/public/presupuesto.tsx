import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { PublicApiError, publicFetch, getTokenFromUrl } from "./publicClient";
import "../index.css";

type BudgetItem = {
  name: string;
  quantity: number;
  unit_price: number;
  estimated_hours: number;
};

type Budget = {
  customer_name: string;
  patente: string;
  vehicle: string;
  issue_date: string | null;
  expiry_date: string | null;
  discount_percent: number;
  tax_percent: number;
  payment_method: string;
  terms: string;
  total: number;
  status: string;
  items: BudgetItem[];
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(value || 0);

const statusMensaje: Record<string, string> = {
  aprobado: "Aprobaste este presupuesto. El taller ya fue notificado.",
  rechazado: "Rechazaste este presupuesto. El taller ya fue notificado.",
  vencido: "Este presupuesto venció.",
  convertido: "Este presupuesto ya se convirtió en un trabajo en curso.",
  anulado: "Este presupuesto fue anulado.",
};

export default function PresupuestoPublicoPage() {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [respondedStatus, setRespondedStatus] = useState<string | null>(null);

  const token = getTokenFromUrl();

  useEffect(() => {
    if (!token) {
      setError("Este link no es válido.");
      setLoading(false);
      return;
    }
    publicFetch(`/public/budgets/${token}`)
      .then((data) => setBudget(data as Budget))
      .catch((err) => {
        if (err instanceof PublicApiError && err.status === 404) {
          setError("No encontramos ningún presupuesto con este link.");
        } else {
          setError("No pudimos cargar el presupuesto. Probá de nuevo en un momento.");
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const respond = async (approved: boolean) => {
    if (!token) return;
    setResponding(true);
    try {
      const result = (await publicFetch(`/public/budgets/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved }),
      })) as { status: string };
      setRespondedStatus(result.status);
    } catch (err) {
      if (err instanceof PublicApiError && err.status === 409) {
        setRespondedStatus((err.body?.status as string | undefined) || null);
      } else {
        setError("No pudimos registrar tu respuesta. Probá de nuevo en un momento.");
      }
    } finally {
      setResponding(false);
    }
  };

  const currentStatus = respondedStatus || budget?.status;
  const canRespond = !respondedStatus && budget?.status === "enviado";

  const subtotal = budget?.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0) || 0;
  const discount = budget ? (subtotal * (budget.discount_percent || 0)) / 100 : 0;
  const tax = budget ? ((subtotal - discount) * (budget.tax_percent || 0)) / 100 : 0;

  return (
    <div className="min-h-screen bg-[#f3f4f8] flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <span className="text-xl font-bold text-[#0f4471]">MechanicPro</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {loading && <p className="text-center text-gray-500 py-8">Cargando...</p>}

          {!loading && error && <p className="text-center text-gray-600 py-8">{error}</p>}

          {!loading && budget && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                Presupuesto para {budget.customer_name}
              </p>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {budget.vehicle || budget.patente || "Tu vehículo"}
              </h1>

              <div className="divide-y divide-gray-100 border-y border-gray-100">
                {budget.items.map((item, index) => (
                  <div key={index} className="flex justify-between py-2 text-sm">
                    <span className="text-gray-700">
                      {item.name}
                      {item.quantity > 1 ? ` x${item.quantity}` : ""}
                    </span>
                    <span className="text-gray-900 font-medium">
                      {formatMoney(item.quantity * item.unit_price)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Descuento ({budget.discount_percent}%)</span>
                    <span>-{formatMoney(discount)}</span>
                  </div>
                )}
                {tax > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Impuesto ({budget.tax_percent}%)</span>
                    <span>{formatMoney(tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-900 font-bold text-lg pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>{formatMoney(budget.total)}</span>
                </div>
              </div>

              {canRespond && (
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    disabled={responding}
                    onClick={() => respond(true)}
                    className="flex-1 bg-[#0f4471] text-white font-semibold py-3 rounded-lg disabled:opacity-60"
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    disabled={responding}
                    onClick={() => respond(false)}
                    className="flex-1 bg-white border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg disabled:opacity-60"
                  >
                    Rechazar
                  </button>
                </div>
              )}

              {!canRespond && (
                <p className="text-center text-gray-600 mt-6 pt-4 border-t border-gray-100">
                  {(currentStatus && statusMensaje[currentStatus]) ||
                    "Este presupuesto ya no está esperando respuesta."}
                </p>
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
    <PresupuestoPublicoPage />
  </StrictMode>
);
