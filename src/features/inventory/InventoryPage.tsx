import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import InventoryForm from "./InventoryForm";
import InventoryTable from "./InventoryTable";
import { InventoryItem } from "../../lib/types";

interface InventoryPageProps {
  inventoryItems: InventoryItem[];
  setInventoryItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  showNotification: (type: "success" | "error", message: string) => void;
}

export default function InventoryPage({
  inventoryItems,
  setInventoryItems,
  showNotification,
}: InventoryPageProps) {
  const [inventoryForm, setInventoryForm] = useState({
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
  });

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
          ? parseInt(value) || 0
          : value,
    }));
  };

  const handleInventorySubmit = (event: FormEvent) => {
    event.preventDefault();
    const now = new Date().toISOString();
    const item = {
      id: crypto.randomUUID(),
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
      updated_at: now,
    };
    setInventoryItems((prev) => [item, ...prev]);
    setInventoryForm({
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
    });
    showNotification("success", "Insumo agregado");
  };

  const handleInventoryAdjust = (event: FormEvent) => {
    event.preventDefault();
    const delta = inventoryAdjust.quantity;
    if (!inventoryAdjust.itemId || !delta) {
      return;
    }
    setInventoryItems((prev) =>
      prev.map((item) =>
        item.id === inventoryAdjust.itemId
          ? {
              ...item,
              stock: item.stock + delta,
              updated_at: new Date().toISOString(),
            }
          : item,
      ),
    );
    setInventoryAdjust({ itemId: "", quantity: 0, reason: "" });
    showNotification("success", "Stock actualizado");
  };

  const handleBarcodeSubmit = (event: FormEvent) => {
    event.preventDefault();

    const code = barcodeInput.trim();

    if (!code) {
      return;
    }

    let matched = false;

    setInventoryItems((prev) =>
      prev.map((item) => {
        if (item.barcode === code || item.sku === code) {
          matched = true;

          return {
            ...item,
            stock: item.stock + 1,
            updated_at: new Date().toISOString(),
          };
        }

        return item;
      }),
    );

    setBarcodeInput("");

    showNotification(
      "success",
      matched ? "Stock actualizado por código" : "Código no encontrado",
    );
  };

  useEffect(() => {
    localStorage.setItem("inventoryItems", JSON.stringify(inventoryItems));
  }, [inventoryItems]);

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
  //Para futuro
  // return (
  //   <>
  //     <InventoryForm
  //       inventoryForm={inventoryForm}
  //       onChange={handleInventoryChange}
  //       onSubmit={handleInventorySubmit}
  //     />

  //     <BarcodeForm
  //       barcodeInput={barcodeInput}
  //       setBarcodeInput={setBarcodeInput}
  //       onSubmit={handleBarcodeSubmit}
  //     />

  //     <StockAdjustForm
  //       inventoryItems={inventoryItems}
  //       inventoryAdjust={inventoryAdjust}
  //       setInventoryAdjust={setInventoryAdjust}
  //       onSubmit={handleInventoryAdjust}
  //     />

  //     <InventoryTable
  //       inventoryItems={inventoryItems}
  //       lowStockItems={lowStockItems}
  //       totalStockValue={totalStockValue}
  //     />
  //   </>
  // );
}
