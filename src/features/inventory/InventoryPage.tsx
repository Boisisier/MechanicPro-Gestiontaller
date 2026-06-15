import { ChangeEvent, FormEvent, useState } from "react";

import InventoryForm from "./InventoryForm";
import InventoryTable from "./InventoryTable";
import { InventoryItem } from "../../lib/types";
import { createInventoryItem, updateInventoryItem } from "../../lib/api";

interface InventoryPageProps {
  inventoryItems: InventoryItem[];
  setInventoryItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  showNotification: (type: "success" | "error", message: string) => void;
}

const emptyInventoryForm = {
  name: "",
  category: "",
  sku: "",
  barcode: "",
  stock: 0,
  minStock: 0,
  unit: "unidad",
  location: "",
  supplier: "",
  cost: 0,
  notes: "",
};

export default function InventoryPage({
  inventoryItems,
  setInventoryItems,
  showNotification,
}: InventoryPageProps) {
  const [inventoryForm, setInventoryForm] = useState(emptyInventoryForm);

  const [inventoryAdjust, setInventoryAdjust] = useState({
    itemId: "",
    quantity: 0,
    reason: "",
  });

  const [barcodeInput, setBarcodeInput] = useState("");

  const handleInventoryChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setInventoryForm((prev) => ({
      ...prev,
      [name]:
        name === "stock" || name === "minStock" || name === "cost"
          ? parseInt(value, 10) || 0
          : value,
    }));
  };

  const handleInventorySubmit = async (event: FormEvent) => {
    event.preventDefault();

    try {
      const savedItem = await createInventoryItem({
        name: inventoryForm.name.trim(),
        category: inventoryForm.category.trim(),
        sku: inventoryForm.sku.trim(),
        barcode: inventoryForm.barcode.trim(),
        stock: inventoryForm.stock,
        minStock: inventoryForm.minStock,
        unit: inventoryForm.unit.trim(),
        location: inventoryForm.location.trim(),
        supplier: inventoryForm.supplier.trim(),
        cost: inventoryForm.cost,
        notes: inventoryForm.notes.trim(),
      });
      setInventoryItems((prev) => [savedItem, ...prev]);
      setInventoryForm(emptyInventoryForm);
      showNotification("success", "Insumo agregado");
    } catch (error) {
      console.error("Create inventory item failed", error);
      showNotification("error", "No se pudo guardar el insumo");
    }
  };

  const handleInventoryAdjust = async (event: FormEvent) => {
    event.preventDefault();
    const delta = inventoryAdjust.quantity;
    if (!inventoryAdjust.itemId || !delta) {
      return;
    }

    const inventoryItem = inventoryItems.find(
      (item) => item.id === inventoryAdjust.itemId,
    );
    if (!inventoryItem) {
      showNotification("error", "Insumo no encontrado");
      return;
    }

    try {
      const savedItem = await updateInventoryItem(inventoryItem.id, {
        ...inventoryItem,
        stock: inventoryItem.stock + delta,
      });
      setInventoryItems((prev) =>
        prev.map((item) => (item.id === savedItem.id ? savedItem : item)),
      );
      setInventoryAdjust({ itemId: "", quantity: 0, reason: "" });
      showNotification("success", "Stock actualizado");
    } catch (error) {
      console.error("Inventory adjust failed", error);
      showNotification("error", "No se pudo actualizar el stock");
    }
  };

  const handleBarcodeSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const code = barcodeInput.trim();
    if (!code) {
      return;
    }

    const inventoryItem = inventoryItems.find(
      (item) => item.barcode === code || item.sku === code,
    );
    if (!inventoryItem) {
      setBarcodeInput("");
      showNotification("error", "Codigo no encontrado");
      return;
    }

    try {
      const savedItem = await updateInventoryItem(inventoryItem.id, {
        ...inventoryItem,
        stock: inventoryItem.stock + 1,
      });
      setInventoryItems((prev) =>
        prev.map((item) => (item.id === savedItem.id ? savedItem : item)),
      );
      setBarcodeInput("");
      showNotification("success", "Stock actualizado por codigo");
    } catch (error) {
      console.error("Barcode stock update failed", error);
      showNotification("error", "No se pudo actualizar el stock");
    }
  };

  const lowStockItems = inventoryItems.filter(
    (item) => item.minStock > 0 && item.stock <= item.minStock,
  );

  const totalStockValue = inventoryItems.reduce(
    (sum, item) => sum + item.stock * (item.cost || 0),
    0,
  );

  return (
    <>
      <InventoryForm
        inventoryForm={inventoryForm}
        onChange={handleInventoryChange}
        onSubmit={handleInventorySubmit}
      />

      <InventoryTable
        inventoryItems={inventoryItems}
        lowStockItems={lowStockItems}
        totalStockValue={totalStockValue}
        barcodeInput={barcodeInput}
        setBarcodeInput={setBarcodeInput}
        handleBarcodeSubmit={handleBarcodeSubmit}
        inventoryAdjust={inventoryAdjust}
        setInventoryAdjust={setInventoryAdjust}
        handleInventoryAdjust={handleInventoryAdjust}
      />
    </>
  );
}
