import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import {
  ClipboardCheck,
  Download,
  Edit2,
  Package,
  Search,
  ShoppingCart,
  Truck,
} from "lucide-react";
import type {
  InventoryItem,
  InventoryMovement,
  InventorySupplier,
} from "../../shared/lib/types";
import {
  completeInventoryStockCount,
  createInventoryItem,
  createInventoryPurchaseOrder,
  createInventoryStockCount,
  createInventorySupplier,
  getInventoryMovements,
  getInventoryItems,
  getInventoryPurchaseOrders,
  getInventoryStockCounts,
  getInventorySuppliers,
  receiveInventoryPurchaseOrder,
  updateInventoryItem,
} from "../../shared/lib/api";
import { formatRut, isValidRut } from "../../shared/utils/rut";

interface InventoryPageProps {
  inventoryItems: InventoryItem[];
  setInventoryItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  showNotification: (type: "success" | "error", message: string) => void;
  isAdmin: boolean;
  onAudit: (action: string, detail: string) => void;
}

type InventoryTab = "productos" | "movimientos" | "proveedores" | "compras" | "conteo";
const emptyProduct = {
  item_type: "repuesto" as "repuesto" | "insumo",
  name: "", category: "", sku: "", barcode: "", stock: 0, minStock: 0,
  unit: "unidad", location: "", supplier: "", cost: 0, sale_price: 0,
  status: "activo", supplier_id: "", warehouse: "", aisle: "", shelf: "", bin: "", notes: "",
};
const money = (value: number) => `$${Math.round(value).toLocaleString("es-CL")}`;

export default function InventoryPage({
  inventoryItems,
  setInventoryItems,
  showNotification,
  isAdmin,
  onAudit,
}: InventoryPageProps) {
  const [tab, setTab] = useState<InventoryTab>("productos");
  const [product, setProduct] = useState(emptyProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [suppliers, setSuppliers] = useState<InventorySupplier[]>([]);
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [counts, setCounts] = useState<Array<Record<string, unknown>>>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [adjust, setAdjust] = useState({ itemId: "", quantity: 0, reason: "" });
  const [supplierForm, setSupplierForm] = useState({ name: "", rut: "", phone: "", email: "", address: "" });
  const [orderForm, setOrderForm] = useState({ supplier_id: "", inventory_item_id: "", quantity: 1, unit_cost: 0, expected_date: "", notes: "" });
  const [countForm, setCountForm] = useState({ inventory_item_id: "", counted_quantity: 0, notes: "" });

  const loadSecondaryData = useCallback(async () => {
    try {
      const [movementRows, supplierRows, orderRows, countRows] = await Promise.all([
        getInventoryMovements(),
        getInventorySuppliers(),
        getInventoryPurchaseOrders(),
        getInventoryStockCounts(),
      ]);
      setMovements(movementRows);
      setSuppliers(supplierRows);
      setOrders(orderRows);
      setCounts(countRows);
    } catch (error) {
      console.error("Inventory secondary data load failed", error);
      showNotification("error", "No se pudo cargar la gestión de inventario");
    }
  }, [showNotification]);

  useEffect(() => {
    loadSecondaryData();
  }, [loadSecondaryData]);

  const summary = {
    parts: inventoryItems.filter((item) => item.item_type !== "insumo").length,
    supplies: inventoryItems.filter((item) => item.item_type === "insumo").length,
    low: inventoryItems.filter((item) => item.minStock > 0 && item.stock <= item.minStock && item.stock > 0).length,
    out: inventoryItems.filter((item) => item.stock <= 0).length,
    value: inventoryItems.reduce((sum, item) => sum + item.stock * (item.cost || 0), 0),
  };

  const filteredItems = inventoryItems.filter((item) => {
    const query = search.toLowerCase();
    return (
      `${item.name} ${item.sku} ${item.barcode} ${item.category}`.toLowerCase().includes(query) &&
      (!typeFilter || (item.item_type === "insumo" ? "insumo" : "repuesto") === typeFilter) &&
      (!statusFilter || (item.status || "activo") === statusFilter)
    );
  });
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / 15));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = filteredItems.slice((currentPage - 1) * 15, currentPage * 15);

  useEffect(() => setPage(1), [search, typeFilter, statusFilter]);

  const handleProductChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setProduct((current) => ({
      ...current,
      [name]: ["stock", "minStock", "cost", "sale_price"].includes(name) ? Number(value) || 0 : value,
    }));
  };

  const saveProduct = async (event: FormEvent) => {
    event.preventDefault();
    if (!product.name.trim()) return;
    try {
      const payload = { ...product, supplier_id: product.supplier_id || null };
      const saved = editingId
        ? await updateInventoryItem(editingId, { ...payload, movement_type: "ajuste", movement_reason: "Edición de producto" })
        : await createInventoryItem(payload);
      setInventoryItems((current) =>
        editingId ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current],
      );
      onAudit(editingId ? "Producto actualizado" : "Producto creado", product.name);
      showNotification("success", editingId ? "Producto actualizado" : "Producto creado");
      setProduct(emptyProduct);
      setEditingId(null);
      await loadSecondaryData();
    } catch (error) {
      console.error("Save inventory product failed", error);
      showNotification("error", "No se pudo guardar el producto");
    }
  };

  const editProduct = (item: InventoryItem) => {
    setEditingId(item.id);
    setProduct({
      item_type: item.item_type === "insumo" ? "insumo" : "repuesto",
      name: item.name, category: item.category || "", sku: item.sku || "",
      barcode: item.barcode || "", stock: item.stock, minStock: item.minStock || 0,
      unit: item.unit || "unidad", location: item.location || "", supplier: item.supplier || "",
      cost: item.cost || 0, sale_price: item.sale_price || 0, status: item.status || "activo",
      supplier_id: item.supplier_id || "", warehouse: item.warehouse || "", aisle: item.aisle || "",
      shelf: item.shelf || "", bin: item.bin || "", notes: item.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const applyAdjustment = async (event: FormEvent) => {
    event.preventDefault();
    const item = inventoryItems.find((entry) => entry.id === adjust.itemId);
    if (!item || !adjust.quantity || !adjust.reason.trim()) {
      showNotification("error", "Selecciona producto, cantidad y motivo");
      return;
    }
    try {
      const saved = await updateInventoryItem(item.id, {
        ...item,
        stock: Math.max(0, item.stock + adjust.quantity),
        movement_type: adjust.quantity > 0 ? "entrada" : "ajuste",
        movement_reason: adjust.reason,
      });
      setInventoryItems((current) => current.map((entry) => entry.id === saved.id ? saved : entry));
      setAdjust({ itemId: "", quantity: 0, reason: "" });
      onAudit("Stock ajustado", `${item.name}: ${adjust.quantity}`);
      await loadSecondaryData();
      showNotification("success", "Stock actualizado");
    } catch (error) {
      console.error("Inventory adjustment failed", error);
      showNotification("error", "No se pudo ajustar el stock");
    }
  };

  const saveSupplier = async (event: FormEvent) => {
    event.preventDefault();
    if (supplierForm.rut.trim() && !isValidRut(supplierForm.rut)) {
      showNotification("error", "Ingresa un RUT chileno válido, ej: 11.111.111-1");
      return;
    }
    try {
      await createInventorySupplier(supplierForm);
      setSupplierForm({ name: "", rut: "", phone: "", email: "", address: "" });
      onAudit("Proveedor creado", supplierForm.name);
      await loadSecondaryData();
      showNotification("success", "Proveedor creado");
    } catch (error) {
      console.error("Supplier creation failed", error);
      showNotification("error", "No se pudo crear el proveedor");
    }
  };

  const createOrder = async (event: FormEvent) => {
    event.preventDefault();
    if (!orderForm.inventory_item_id) return;
    try {
      await createInventoryPurchaseOrder({
        ...orderForm,
        order_number: `OC-${Date.now().toString().slice(-8)}`,
        order_date: new Date().toISOString().slice(0, 10),
        items: [{
          inventory_item_id: orderForm.inventory_item_id,
          quantity: orderForm.quantity,
          unit_cost: orderForm.unit_cost,
        }],
      });
      setOrderForm({ supplier_id: "", inventory_item_id: "", quantity: 1, unit_cost: 0, expected_date: "", notes: "" });
      onAudit("Orden de compra creada", "Nueva orden pendiente");
      await loadSecondaryData();
      showNotification("success", "Orden de compra creada");
    } catch (error) {
      console.error("Purchase order creation failed", error);
      showNotification("error", "No se pudo crear la orden");
    }
  };

  const receiveOrder = async (id: string) => {
    try {
      await receiveInventoryPurchaseOrder(id);
      onAudit("Compra recibida", `Orden ${id}`);
      setInventoryItems(await getInventoryItems());
      await loadSecondaryData();
      showNotification("success", "Compra recibida y stock actualizado");
    } catch (error) {
      console.error("Purchase reception failed", error);
      showNotification("error", "No se pudo recibir la compra");
    }
  };

  const createCount = async (event: FormEvent) => {
    event.preventDefault();
    const item = inventoryItems.find((entry) => entry.id === countForm.inventory_item_id);
    if (!item) return;
    try {
      await createInventoryStockCount({
        notes: countForm.notes,
        items: [{
          inventory_item_id: item.id,
          expected_quantity: item.stock,
          counted_quantity: countForm.counted_quantity,
        }],
      });
      setCountForm({ inventory_item_id: "", counted_quantity: 0, notes: "" });
      onAudit("Conteo físico creado", item.name);
      await loadSecondaryData();
      showNotification("success", "Conteo creado");
    } catch (error) {
      console.error("Stock count creation failed", error);
      showNotification("error", "No se pudo crear el conteo");
    }
  };

  const completeCount = async (id: string) => {
    try {
      await completeInventoryStockCount(id);
      onAudit("Conteo físico confirmado", `Conteo ${id}`);
      setInventoryItems(await getInventoryItems());
      await loadSecondaryData();
      showNotification("success", "Conteo confirmado y stock ajustado");
    } catch (error) {
      console.error("Stock count completion failed", error);
      showNotification("error", "No se pudo confirmar el conteo");
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Tipo", "Nombre", "Categoría", "SKU", "Código", "Stock", "Mínimo", "Costo", "Venta", "Ubicación"],
      ...filteredItems.map((item) => [
        item.item_type || "repuesto", item.name, item.category, item.sku, item.barcode,
        item.stock, item.minStock, item.cost, item.sale_price || 0, item.location,
      ]),
    ];
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `inventario-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const importCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const parseLine = (line: string) => {
      const cells: string[] = [];
      let value = "";
      let quoted = false;
      for (let index = 0; index < line.length; index += 1) {
        const character = line[index];
        if (character === '"' && line[index + 1] === '"') {
          value += '"';
          index += 1;
        } else if (character === '"') {
          quoted = !quoted;
        } else if (character === "," && !quoted) {
          cells.push(value);
          value = "";
        } else {
          value += character;
        }
      }
      cells.push(value);
      return cells;
    };
    try {
      const rows = (await file.text())
        .split(/\r?\n/)
        .filter(Boolean)
        .slice(1)
        .map(parseLine);
      const created: InventoryItem[] = [];
      for (const row of rows) {
        if (!row[1]?.trim()) continue;
        created.push(
          await createInventoryItem({
            item_type: row[0] === "insumo" ? "insumo" : "repuesto",
            name: row[1].trim(),
            category: row[2] || "",
            sku: row[3] || "",
            barcode: row[4] || "",
            stock: Number(row[5]) || 0,
            minStock: Number(row[6]) || 0,
            cost: Number(row[7]) || 0,
            sale_price: Number(row[8]) || 0,
            location: row[9] || "",
            unit: "unidad",
            status: "activo",
          }),
        );
      }
      setInventoryItems((current) => [...created, ...current]);
      onAudit("Inventario importado", `${created.length} producto(s) desde CSV`);
      showNotification("success", `${created.length} producto(s) importados`);
    } catch (error) {
      console.error("CSV inventory import failed", error);
      showNotification("error", "No se pudo completar la importación CSV");
    }
  };

  const tabs = [
    { id: "productos" as const, label: "Productos", icon: Package },
    { id: "movimientos" as const, label: "Movimientos", icon: ClipboardCheck },
    { id: "proveedores" as const, label: "Proveedores", icon: Truck },
    { id: "compras" as const, label: "Compras", icon: ShoppingCart, admin: true },
    { id: "conteo" as const, label: "Conteo físico", icon: ClipboardCheck, admin: true },
  ].filter((entry) => !entry.admin || isAdmin);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Inventario</h2>
        <p className="text-sm text-gray-500">Control de productos, trazabilidad, compras y existencias.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((entry) => {
            const Icon = entry.icon;
            return <button key={entry.id} onClick={() => setTab(entry.id)} className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold ${tab === entry.id ? "border-[#0f4471] bg-[#0f4471] text-white" : "border-[#0f4471]/30 text-[#0f4471]"}`}><Icon className="h-4 w-4" />{entry.label}</button>;
          })}
        </div>
      </div>

      {tab === "productos" && <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[["Repuestos", summary.parts, "text-[#0f4471]"], ["Insumos", summary.supplies, "text-emerald-600"], ["Stock bajo", summary.low, "text-amber-600"], ["Agotados", summary.out, "text-[#fc3d3c]"], ["Valor inventario", money(summary.value), "text-[#0f4471]"]].map(([label, value, color]) => <div key={String(label)} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"><p className="text-sm text-gray-500">{label}</p><p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p></div>)}
        </div>
        <form onSubmit={saveProduct} className="grid gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-6">
          <h3 className="text-lg font-semibold text-gray-900 md:col-span-2 xl:col-span-6">{editingId ? "Editar producto" : "Registrar producto"}</h3>
          <select name="item_type" value={product.item_type} onChange={handleProductChange} className="rounded-lg border px-3 py-2 text-sm"><option value="repuesto">Repuesto</option><option value="insumo">Insumo</option></select>
          {["name","category","sku","barcode","unit","warehouse","aisle","shelf","bin","location"].map((name) => <input key={name} name={name} value={String(product[name as keyof typeof product])} onChange={handleProductChange} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder={({name:"Nombre",category:"Categoría",sku:"SKU",barcode:"Código de barras",unit:"Unidad",warehouse:"Bodega",aisle:"Pasillo",shelf:"Estante",bin:"Casillero",location:"Ubicación general"} as Record<string,string>)[name]} required={name==="name"} />)}
          <input name="stock" type="number" min="0" value={product.stock} onChange={handleProductChange} className="rounded-lg border px-3 py-2 text-sm" placeholder="Stock" />
          <input name="minStock" type="number" min="0" value={product.minStock} onChange={handleProductChange} className="rounded-lg border px-3 py-2 text-sm" placeholder="Stock mínimo" />
          <input name="cost" type="number" min="0" value={product.cost} onChange={handleProductChange} className="rounded-lg border px-3 py-2 text-sm" placeholder="Costo" />
          <input name="sale_price" type="number" min="0" value={product.sale_price} onChange={handleProductChange} className="rounded-lg border px-3 py-2 text-sm" placeholder="Precio de venta" />
          <select name="supplier_id" value={product.supplier_id} onChange={handleProductChange} className="rounded-lg border px-3 py-2 text-sm"><option value="">Sin proveedor</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select>
          <select name="status" value={product.status} onChange={handleProductChange} className="rounded-lg border px-3 py-2 text-sm"><option value="activo">Activo</option><option value="descontinuado">Descontinuado</option><option value="bloqueado">Bloqueado</option></select>
          <input name="notes" value={product.notes} onChange={handleProductChange} className="rounded-lg border px-3 py-2 text-sm xl:col-span-4" placeholder="Notas o especificaciones" />
          <div className="flex gap-2 xl:col-span-2"><button className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white">{editingId ? "Actualizar" : "Guardar producto"}</button>{editingId && <button type="button" onClick={() => {setEditingId(null);setProduct(emptyProduct);}} className="rounded-lg border px-3 py-2 text-sm">Cancelar</button>}</div>
        </form>
        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="grid gap-3 border-b p-4 md:grid-cols-[1fr_160px_160px_auto_auto]"><div className="flex items-center gap-2 rounded-lg border px-3"><Search className="h-4 w-4 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full py-2 text-sm outline-none" placeholder="Nombre, SKU o código" /></div><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-lg border px-3 text-sm"><option value="">Todos los tipos</option><option value="repuesto">Repuestos</option><option value="insumo">Insumos</option></select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border px-3 text-sm"><option value="">Todos los estados</option><option value="activo">Activos</option><option value="descontinuado">Descontinuados</option><option value="bloqueado">Bloqueados</option></select>{isAdmin && <label className="cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold"><input type="file" accept=".csv,text/csv" onChange={importCsv} className="hidden" />Importar CSV</label>}<button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"><Download className="h-4 w-4" />Exportar</button></div>
            <div className="overflow-x-auto"><table className="min-w-full divide-y text-sm"><thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Producto</th><th className="px-4 py-3 text-left">Tipo</th><th className="px-4 py-3 text-left">Stock</th><th className="px-4 py-3 text-left">Ubicación</th><th className="px-4 py-3 text-right">Valores</th><th className="px-4 py-3"></th></tr></thead><tbody className="divide-y">{paginatedItems.map((item) => <tr key={item.id}><td className="px-4 py-3"><p className="font-semibold">{item.name}</p><p className="text-xs text-gray-500">{item.sku || "-"} · {item.category || "-"}</p></td><td className="px-4 py-3">{item.item_type === "insumo" ? "Insumo" : "Repuesto"}</td><td className="px-4 py-3"><span className={item.stock<=0?"font-bold text-[#fc3d3c]":item.minStock>0&&item.stock<=item.minStock?"font-bold text-amber-600":""}>{item.stock} {item.unit}</span></td><td className="px-4 py-3">{[item.warehouse,item.aisle,item.shelf,item.bin].filter(Boolean).join(" / ") || item.location || "-"}</td><td className="px-4 py-3 text-right"><p>{money(item.cost||0)}</p><p className="text-xs text-gray-500">Venta {money(item.sale_price||0)}</p></td><td className="px-4 py-3"><button onClick={() => editProduct(item)} className="p-2 text-[#0f4471]" aria-label={`Editar ${item.name}`}><Edit2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>
            <div className="flex items-center justify-between border-t p-4"><p className="text-sm text-gray-500">{filteredItems.length} producto(s)</p><div className="flex gap-2"><button disabled={currentPage===1} onClick={() => setPage((value)=>Math.max(1,value-1))} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Anterior</button><span className="py-2 text-sm font-semibold">{currentPage}/{totalPages}</span><button disabled={currentPage===totalPages} onClick={() => setPage((value)=>Math.min(totalPages,value+1))} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Siguiente</button></div></div>
          </section>
          <form onSubmit={applyAdjustment} className="h-fit rounded-xl border bg-white p-5 shadow-sm"><h3 className="font-semibold">Ajuste de stock</h3><select value={adjust.itemId} onChange={(event)=>setAdjust({...adjust,itemId:event.target.value})} className="mt-4 w-full rounded-lg border px-3 py-2 text-sm"><option value="">Producto</option>{inventoryItems.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select><input type="number" value={adjust.quantity} onChange={(event)=>setAdjust({...adjust,quantity:Number(event.target.value)||0})} className="mt-3 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Cantidad (+/-)" /><input value={adjust.reason} onChange={(event)=>setAdjust({...adjust,reason:event.target.value})} className="mt-3 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Motivo obligatorio" /><button className="mt-3 w-full rounded-lg bg-[#0f4471] px-4 py-2 text-sm font-semibold text-white">Aplicar ajuste</button></form>
        </div>
      </>}

      {tab === "movimientos" && <section className="overflow-hidden rounded-xl border bg-white shadow-sm"><div className="p-5"><h3 className="text-lg font-semibold">Trazabilidad de movimientos</h3></div><div className="overflow-x-auto"><table className="min-w-full divide-y text-sm"><thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Fecha</th><th className="px-4 py-3 text-left">Producto</th><th className="px-4 py-3 text-left">Movimiento</th><th className="px-4 py-3 text-left">Stock</th><th className="px-4 py-3 text-left">Referencia</th><th className="px-4 py-3 text-left">Usuario</th></tr></thead><tbody className="divide-y">{movements.map((movement)=><tr key={movement.id}><td className="px-4 py-3">{new Date(movement.created_at).toLocaleString("es-CL")}</td><td className="px-4 py-3 font-semibold">{movement.item_name}</td><td className="px-4 py-3">{movement.movement_type} · {movement.quantity}</td><td className="px-4 py-3">{movement.stock_before} → {movement.stock_after}</td><td className="px-4 py-3">{movement.vehicle_patente || movement.reason || "-"}</td><td className="px-4 py-3">{movement.mechanic_name || movement.user_name || "-"}</td></tr>)}</tbody></table></div></section>}

      {tab === "proveedores" && <div className="grid gap-6 xl:grid-cols-[380px_1fr]"><form onSubmit={saveSupplier} className="h-fit rounded-xl border bg-white p-5 shadow-sm"><h3 className="text-lg font-semibold">Nuevo proveedor</h3>{(["name","rut","phone","email","address"] as const).map((field)=><input key={field} value={supplierForm[field]} onChange={(event)=>setSupplierForm({...supplierForm,[field]:field==="rut"?formatRut(event.target.value):event.target.value})} className="mt-3 w-full rounded-lg border px-3 py-2 text-sm" placeholder={({name:"Razón social",rut:"12.345.678-9",phone:"Teléfono",email:"Correo",address:"Dirección"} as const)[field]} required={field==="name"} />)}<button className="mt-4 w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white">Guardar proveedor</button></form><section className="rounded-xl border bg-white p-5 shadow-sm"><h3 className="text-lg font-semibold">Proveedores</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{suppliers.map((supplier)=><div key={supplier.id} className="rounded-lg border p-4"><p className="font-semibold">{supplier.name}</p><p className="text-sm text-gray-500">{supplier.rut||"Sin RUT"}</p><p className="text-sm text-gray-500">{supplier.phone} {supplier.email}</p></div>)}</div></section></div>}

      {tab === "compras" && isAdmin && <div className="space-y-6"><form onSubmit={createOrder} className="grid gap-3 rounded-xl border bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-6"><h3 className="text-lg font-semibold md:col-span-2 xl:col-span-6">Nueva orden de compra</h3><select value={orderForm.supplier_id} onChange={(event)=>setOrderForm({...orderForm,supplier_id:event.target.value})} className="rounded-lg border px-3 py-2 text-sm"><option value="">Proveedor</option>{suppliers.map((supplier)=><option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select><select value={orderForm.inventory_item_id} onChange={(event)=>setOrderForm({...orderForm,inventory_item_id:event.target.value})} className="rounded-lg border px-3 py-2 text-sm"><option value="">Producto</option>{inventoryItems.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select><input type="number" min="1" value={orderForm.quantity} onChange={(event)=>setOrderForm({...orderForm,quantity:Number(event.target.value)||1})} className="rounded-lg border px-3 py-2 text-sm" placeholder="Cantidad" /><input type="number" min="0" value={orderForm.unit_cost} onChange={(event)=>setOrderForm({...orderForm,unit_cost:Number(event.target.value)||0})} className="rounded-lg border px-3 py-2 text-sm" placeholder="Costo unitario" /><input type="date" value={orderForm.expected_date} onChange={(event)=>setOrderForm({...orderForm,expected_date:event.target.value})} className="rounded-lg border px-3 py-2 text-sm" /><button className="rounded-lg bg-[#0f4471] px-4 py-2 text-sm font-semibold text-white">Crear orden</button></form><section className="rounded-xl border bg-white p-5 shadow-sm"><h3 className="text-lg font-semibold">Órdenes de compra</h3><div className="mt-4 space-y-3">{orders.map((order)=><div key={String(order.id)} className="flex items-center justify-between rounded-lg border p-4"><div><p className="font-semibold">{String(order.order_number)}</p><p className="text-sm text-gray-500">{String(order.supplier_name||"Sin proveedor")} · {String(order.status)}</p></div>{order.status==="pendiente"&&<button onClick={()=>receiveOrder(String(order.id))} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white">Recibir compra</button>}</div>)}</div></section></div>}

      {tab === "conteo" && isAdmin && <div className="space-y-6"><form onSubmit={createCount} className="grid gap-3 rounded-xl border bg-white p-5 shadow-sm md:grid-cols-[1fr_180px_1fr_auto]"><select value={countForm.inventory_item_id} onChange={(event)=>{const item=inventoryItems.find((entry)=>entry.id===event.target.value);setCountForm({...countForm,inventory_item_id:event.target.value,counted_quantity:item?.stock||0});}} className="rounded-lg border px-3 py-2 text-sm"><option value="">Producto a contar</option>{inventoryItems.map((item)=><option key={item.id} value={item.id}>{item.name} · sistema {item.stock}</option>)}</select><input type="number" min="0" value={countForm.counted_quantity} onChange={(event)=>setCountForm({...countForm,counted_quantity:Number(event.target.value)||0})} className="rounded-lg border px-3 py-2 text-sm" placeholder="Cantidad física" /><input value={countForm.notes} onChange={(event)=>setCountForm({...countForm,notes:event.target.value})} className="rounded-lg border px-3 py-2 text-sm" placeholder="Notas" /><button className="rounded-lg bg-[#0f4471] px-4 py-2 text-sm font-semibold text-white">Crear conteo</button></form><section className="rounded-xl border bg-white p-5 shadow-sm"><h3 className="text-lg font-semibold">Conteos físicos</h3><div className="mt-4 space-y-3">{counts.map((count)=><div key={String(count.id)} className="flex items-center justify-between rounded-lg border p-4"><div><p className="font-semibold">{new Date(String(count.created_at)).toLocaleString("es-CL")}</p><p className="text-sm text-gray-500">{String(count.status)} · {String(count.notes||"Sin notas")}</p></div>{count.status==="abierto"&&<button onClick={()=>completeCount(String(count.id))} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white">Confirmar ajustes</button>}</div>)}</div></section></div>}
    </div>
  );
}
