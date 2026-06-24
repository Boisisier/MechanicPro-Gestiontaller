import { FormEvent } from "react";
import { InventoryItem } from "../../shared/lib/types";

interface InventoryTableProps {
  inventoryItems: InventoryItem[];
  lowStockItems: InventoryItem[];
  totalStockValue: number;
  barcodeInput: string;
  setBarcodeInput: React.Dispatch<React.SetStateAction<string>>;
  handleBarcodeSubmit: (event: FormEvent) => void;
  inventoryAdjust: {
    itemId: string;
    quantity: number;
    reason: string;
  };
  setInventoryAdjust: React.Dispatch<
    React.SetStateAction<{
      itemId: string;
      quantity: number;
      reason: string;
    }>
  >;
  handleInventoryAdjust: (event: FormEvent) => void;
}

export default function InventoryTable({
  inventoryItems,
  lowStockItems,
  totalStockValue,
  barcodeInput,
  setBarcodeInput,
  handleBarcodeSubmit,
  inventoryAdjust,
  setInventoryAdjust,
  handleInventoryAdjust,
}: InventoryTableProps) {
  const totalParts = inventoryItems.filter((item) => item.item_type !== "insumo").length;
  const totalSupplies = inventoryItems.filter((item) => item.item_type === "insumo").length;

  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Items totales</p>
          <p className="text-2xl font-bold text-gray-900">{inventoryItems.length}</p>
          <p className="mt-1 text-xs text-gray-500">
            {totalParts} repuesto(s) · {totalSupplies} insumo(s)
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Stock bajo</p>
          <p className="text-2xl font-bold text-gray-900">{lowStockItems.length}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Valor aproximado</p>
          <p className="text-2xl font-bold text-gray-900">
            ${totalStockValue.toLocaleString("es-CL")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Inventario sincronizado
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Los repuestos e insumos registrados aqui quedan disponibles en el submodulo En Taller.
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Ingreso por codigo
            </h3>
            <form onSubmit={handleBarcodeSubmit} className="space-y-3">
              <input
                value={barcodeInput}
                onChange={(event) => setBarcodeInput(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Escanear codigo o SKU"
              />
              <button
                type="submit"
                className="btn-primary w-full rounded-lg px-4 py-2 text-sm font-semibold"
              >
                Registrar ingreso rapido
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Ajuste rapido
            </h3>
            <form onSubmit={handleInventoryAdjust} className="space-y-3">
              <select
                value={inventoryAdjust.itemId}
                onChange={(event) =>
                  setInventoryAdjust((prev) => ({
                    ...prev,
                    itemId: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Selecciona un item</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.item_type === "insumo" ? "Insumo" : "Repuesto"})
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={inventoryAdjust.quantity}
                onChange={(event) =>
                  setInventoryAdjust((prev) => ({
                    ...prev,
                    quantity: parseInt(event.target.value, 10) || 0,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Cantidad (+/-)"
              />

              <input
                value={inventoryAdjust.reason}
                onChange={(event) =>
                  setInventoryAdjust((prev) => ({
                    ...prev,
                    reason: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Motivo"
              />

              <button
                type="submit"
                className="btn-primary w-full rounded-lg px-4 py-2 text-sm font-semibold"
              >
                Aplicar ajuste
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-900">
            Listado de inventario
          </h3>
        </div>

        {inventoryItems.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">
            No hay items registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Item
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Categoria
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Cantidad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Ubicacion
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Actualizado
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {inventoryItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">SKU: {item.sku || "-"}</p>
                      <p className="text-xs text-gray-500">Codigo: {item.barcode || "-"}</p>
                      {item.notes && (
                        <p className="mt-1 max-w-xs truncate text-xs text-gray-500">
                          {item.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.category || "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          item.item_type === "insumo"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {item.item_type === "insumo" ? "Insumo" : "Repuesto"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.stock}</td>
                    <td className="px-4 py-3 text-gray-700">{item.location || "-"}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(item.updated_at).toLocaleDateString("es-ES")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
