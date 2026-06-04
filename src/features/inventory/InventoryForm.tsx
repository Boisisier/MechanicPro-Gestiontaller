import { ChangeEvent, FormEvent } from "react";
import { InventoryFormData } from "../../lib/types";

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
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <input
        name="name"
        value={inventoryForm.name}
        onChange={onChange}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        placeholder="Nombre del insumo"
        required
      />

      <input
        name="category"
        value={inventoryForm.category}
        onChange={onChange}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        placeholder="Categoría (aceites, frenos...)"
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
        placeholder="Código de barras"
      />

      <input
        type="number"
        name="stock"
        value={inventoryForm.stock}
        onChange={onChange}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        placeholder="Stock inicial"
      />

      <input
        type="number"
        name="minStock"
        value={inventoryForm.minStock}
        onChange={onChange}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        placeholder="Stock mí­nimo"
      />

      <input
        name="unit"
        value={inventoryForm.unit}
        onChange={onChange}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        placeholder="Unidad (litros, unidades)"
      />

      <input
        name="location"
        value={inventoryForm.location}
        onChange={onChange}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        placeholder="Ubicación en bodega"
      />

      <input
        name="supplier"
        value={inventoryForm.supplier}
        onChange={onChange}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        placeholder="Proveedor"
      />

      <input
        type="number"
        name="cost"
        value={inventoryForm.cost}
        onChange={onChange}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        placeholder="Costo unitario"
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
        Guardar insumo
      </button>
    </form>
  );
}
