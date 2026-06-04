import { FormEvent } from "react";
import { InventoryItem } from "../../lib/types";

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
  return (
    <div>
      {
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <p className="text-sm text-gray-500">Items totales</p>

              <p className="text-2xl font-bold text-gray-900">
                {inventoryItems.length}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <p className="text-sm text-gray-500">Stock bajo</p>

              <p className="text-2xl font-bold text-gray-900">
                {lowStockItems.length}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <p className="text-sm text-gray-500">Valor aproximado</p>

              <p className="text-2xl font-bold text-gray-900">
                ${totalStockValue.toLocaleString("es-CL")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Registro de insumos y repuestos
              </h3>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Ingreso por código de barras
                </h3>

                <form onSubmit={handleBarcodeSubmit} className="space-y-3">
                  <input
                    value={barcodeInput}
                    onChange={(event) => setBarcodeInput(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Escanear código"
                  />

                  <button
                    type="submit"
                    className="btn-primary w-full rounded-lg px-4 py-2 text-sm font-semibold"
                  >
                    Registrar ingreso rápido
                  </button>
                </form>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
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
                    <option value="">Selecciona un insumo</option>

                    {inventoryItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    value={inventoryAdjust.quantity}
                    onChange={(event) =>
                      setInventoryAdjust((prev) => ({
                        ...prev,

                        quantity: parseInt(event.target.value) || 0,
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

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Listado de insumos
              </h3>
            </div>

            {inventoryItems.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                No hay insumos registrados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Insumo
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Categoria
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Stock
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Minimo
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Ubicacion
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Proveedor
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Actualizado
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {inventoryItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">
                            {item.name}
                          </p>

                          <p className="text-xs text-gray-500">
                            SKU: {item.sku || "-"}
                          </p>

                          <p className="text-xs text-gray-500">
                            Código: {item.barcode || "-"}
                          </p>
                        </td>

                        <td className="px-4 py-3 text-gray-700">
                          {item.category}
                        </td>

                        <td className="px-4 py-3 text-gray-700">
                          {item.stock}
                        </td>

                        <td className="px-4 py-3 text-gray-700">
                          {item.minStock}
                        </td>

                        <td className="px-4 py-3 text-gray-700">
                          {item.location || "-"}
                        </td>

                        <td className="px-4 py-3 text-gray-700">
                          {item.supplier || "-"}
                        </td>

                        <td className="px-4 py-3 text-gray-500">
                          {new Date(item.updated_at).toLocaleDateString(
                            "es-ES",
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      }
    </div>
  );
}
