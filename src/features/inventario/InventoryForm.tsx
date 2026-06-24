import { ChangeEvent, FormEvent } from "react";
import { InventoryFormData } from "../../shared/lib/types";

interface InventoryFormProps {
  inventoryForm: InventoryFormData;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (event: FormEvent) => void;
}

export default function InventoryForm({
  inventoryForm,
  onChange,
  onSubmit,
}: InventoryFormProps) {
  const isSupply = inventoryForm.item_type === "insumo";

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Registro de inventario
          </h3>
          <p className="text-sm text-gray-500">
            Clasifica cada item como repuesto o insumo para usarlo en En Taller.
          </p>
        </div>

        <select
          name="item_type"
          value={inventoryForm.item_type}
          onChange={onChange}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="repuesto">Repuesto</option>
          <option value="insumo">Insumo</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <input
          name="name"
          value={inventoryForm.name}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder={isSupply ? "Nombre del insumo" : "Nombre del repuesto"}
          required
        />

        <input
          name="category"
          value={inventoryForm.category}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Categoria"
          required
        />

        <input
          name="sku"
          value={inventoryForm.sku}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="SKU interno"
        />

        <input
          name="barcode"
          value={inventoryForm.barcode}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Codigo de barras"
        />

        <input
          name="location"
          value={inventoryForm.location}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Ubicacion en bodega"
        />

        <input
          type="number"
          name="stock"
          value={inventoryForm.stock}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Cantidad"
          min="0"
        />

        <input
          name="notes"
          value={inventoryForm.notes}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none md:col-span-2"
          placeholder="Notas o especificaciones"
        />

        <button
          type="submit"
          className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold md:col-span-2"
        >
          Guardar {isSupply ? "insumo" : "repuesto"}
        </button>
      </div>
    </form>
  );
}
