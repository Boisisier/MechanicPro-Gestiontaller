import { useEffect, useState } from "react";

import type { ReviewPartItem, ReviewServiceItem, Vehicle } from "../../lib/types";
import {
  parseStoredReviewParts,
  parseStoredReviewServices,
} from "../../shared/utils/reviewParsers";

interface ExitPricingSectionProps {
  vehicle: Vehicle;
  onSave: (
    services: ReviewServiceItem[],
    parts: ReviewPartItem[],
  ) => Promise<void>;
}

const onlyDigits = (value: string) => value.replace(/[^\d]/g, "");

export default function ExitPricingSection({
  vehicle,
  onSave,
}: ExitPricingSectionProps) {
  const [services, setServices] = useState<ReviewServiceItem[]>([]);
  const [parts, setParts] = useState<ReviewPartItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setServices(parseStoredReviewServices(vehicle.servicios));
    setParts(parseStoredReviewParts(vehicle.servicios));
  }, [vehicle.id, vehicle.servicios]);

  const serviceTotal = services.reduce(
    (sum, service) => sum + (parseInt(service.price || "0", 10) || 0),
    0,
  );
  const inventoryTotal = parts.reduce(
    (sum, part) => sum + part.quantity * (part.unitCost || 0),
    0,
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(services, parts);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-5 border-y border-gray-200 py-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">
            Valores de la atencion
          </h4>
          <p className="mt-1 text-xs text-gray-500">
            Completa los valores antes de finalizar la entrega.
          </p>
        </div>
        <p className="text-xl font-bold text-[#0f4471]">
          ${(serviceTotal + inventoryTotal).toLocaleString("es-CL")}
        </p>
      </div>

      {services.length === 0 && parts.length === 0 ? (
        <p className="text-sm text-gray-500">No hay trabajos registrados.</p>
      ) : (
        <div className="divide-y divide-gray-200 border-y border-gray-200">
          {services.map((service) => (
            <div
              key={service.name}
              className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">{service.name}</p>
                <p className="text-xs text-gray-500">Servicio</p>
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={service.price}
                onChange={(event) =>
                  setServices((current) =>
                    current.map((item) =>
                      item.name === service.name
                        ? { ...item, price: onlyDigits(event.target.value) }
                        : item,
                    ),
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0f4471] focus:outline-none"
                placeholder="Valor del servicio"
                aria-label={`Valor de ${service.name}`}
              />
            </div>
          ))}

          {parts.map((part) => (
            <div
              key={part.inventoryItemId}
              className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">{part.name}</p>
                <p className="text-xs text-gray-500">
                  {part.itemType === "insumo" ? "Insumo" : "Repuesto"} · Cantidad {part.quantity}
                </p>
              </div>
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={part.unitCost || ""}
                  onChange={(event) => {
                    const unitCost = parseInt(onlyDigits(event.target.value), 10) || 0;
                    setParts((current) =>
                      current.map((item) =>
                        item.inventoryItemId === part.inventoryItemId
                          ? { ...item, unitCost }
                          : item,
                      ),
                    );
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0f4471] focus:outline-none"
                  placeholder="Valor unitario"
                  aria-label={`Valor unitario de ${part.name}`}
                />
                <p className="mt-1 text-xs font-semibold text-gray-500">
                  Subtotal: ${(part.quantity * (part.unitCost || 0)).toLocaleString("es-CL")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || (services.length === 0 && parts.length === 0)}
          className="rounded-lg bg-[#0f4471] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b365c] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar valores"}
        </button>
      </div>
    </section>
  );
}
