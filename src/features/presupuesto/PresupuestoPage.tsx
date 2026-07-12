import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Copy,
  Edit2,
  FileDown,
  Link2,
  MessageCircle,
  Plus,
  RotateCcw,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { ConfirmDialogOptions } from "../../shared/hooks/useConfirmDialog";
import {
  createBudget,
  deleteBudget,
  getBudgets,
  updateBudget,
  updateBudgetStatus,
} from "../../shared/lib/api";
import type { CatalogService, InventoryItem } from "../../shared/lib/types";
import { CUSTOMER_NAME_MAX_LENGTH } from "../../shared/lib/validation";
import { formatRut, isValidRut } from "../../shared/utils/rut";
import mechanicProLogo from "../../shared/assets/mechanic-pro-logo.png";
import type {
  BudgetFormData,
  BudgetItem,
  BudgetQuote,
  BudgetStatus,
} from "./types/presupuesto";

interface PresupuestoPageProps {
  requestConfirmation: (options: ConfirmDialogOptions) => void;
  serviceCatalog: CatalogService[];
  inventoryItems: InventoryItem[];
  onConvertToVehicle: (budget: BudgetQuote) => void;
  onNotify: (type: "success" | "error", message: string) => void;
  onAudit: (action: string, detail: string) => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const defaultExpiry = () => {
  const date = new Date();
  date.setDate(date.getDate() + 15);
  return date.toISOString().slice(0, 10);
};
const emptyForm = (): BudgetFormData => ({
  customerName: "",
  customerRut: "",
  customerPhone: "",
  customerEmail: "",
  customerAddress: "",
  customerCity: "",
  patente: "",
  vehicle: "",
  notes: "",
  issueDate: today(),
  expiryDate: defaultExpiry(),
  discountPercent: 0,
  taxPercent: 19,
  advanceRequired: 0,
  paymentMethod: "",
  terms: "Presupuesto válido hasta la fecha indicada. Valores sujetos a revisión técnica.",
  status: "borrador",
});
const statusLabels: Record<BudgetStatus, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  vencido: "Vencido",
  convertido: "Convertido",
  anulado: "Anulado",
};
const statusStyles: Record<BudgetStatus, string> = {
  borrador: "bg-gray-100 text-gray-700",
  enviado: "bg-sky-100 text-sky-700",
  aprobado: "bg-emerald-100 text-emerald-700",
  rechazado: "bg-[#fc3d3c]/10 text-[#b42318]",
  vencido: "bg-amber-100 text-amber-700",
  convertido: "bg-[#0f4471]/10 text-[#0f4471]",
  anulado: "bg-gray-200 text-gray-500",
};
const money = (value: number) => `$${Math.round(value).toLocaleString("es-CL")}`;
const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] || character);

export default function PresupuestoPage({
  requestConfirmation,
  serviceCatalog,
  inventoryItems,
  onConvertToVehicle,
  onNotify,
  onAudit,
}: PresupuestoPageProps) {
  const [form, setForm] = useState<BudgetFormData>(emptyForm);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [budgets, setBudgets] = useState<BudgetQuote[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemType, setItemType] = useState<BudgetItem["item_type"]>("servicio");
  const [selectedReference, setSelectedReference] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadBudgets = useCallback(async () => {
    try {
      setBudgets(await getBudgets());
    } catch (error) {
      console.error("Budget load failed", error);
      onNotify("error", "No se pudieron cargar los presupuestos");
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );
  const discountAmount = subtotal * (form.discountPercent / 100);
  const netAmount = subtotal - discountAmount;
  const taxAmount = netAmount * (form.taxPercent / 100);
  const total = netAmount + taxAmount;
  const pendingAfterAdvance = Math.max(0, total - form.advanceRequired);

  const selectableItems = useMemo(() => {
    if (itemType === "servicio") {
      return serviceCatalog.map((service) => ({
        id: service.id || service.name,
        name: service.name,
        price: service.base_price || 0,
        hours: service.estimated_hours || 0,
      }));
    }
    return inventoryItems
      .filter((item) => (item.item_type === "insumo" ? "insumo" : "repuesto") === itemType)
      .map((item) => ({
        id: item.id,
        name: item.name,
        price: item.cost || 0,
        hours: 0,
      }));
  }, [inventoryItems, itemType, serviceCatalog]);

  const selectedItem = selectableItems.find((item) => item.id === selectedReference);

  const handleFormChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: ["discountPercent", "taxPercent", "advanceRequired"].includes(name)
        ? Number(value) || 0
        : name === "customerRut"
          ? formatRut(value)
          : value,
    }));
  };

  const handleReferenceChange = (value: string) => {
    setSelectedReference(value);
    const selected = selectableItems.find((item) => item.id === value);
    setUnitPrice(selected?.price || 0);
  };

  const handleAddItem = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedItem || quantity <= 0) {
      onNotify("error", "Selecciona un ítem válido");
      return;
    }
    setItems((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        item_type: itemType,
        reference_id: selectedItem.id,
        name: selectedItem.name,
        quantity,
        unit_price: unitPrice,
        estimated_hours: selectedItem.hours,
      },
    ]);
    setSelectedReference("");
    setQuantity(1);
    setUnitPrice(0);
  };

  const reset = () => {
    setForm(emptyForm());
    setItems([]);
    setEditingId(null);
    setSelectedReference("");
    setQuantity(1);
    setUnitPrice(0);
  };

  const buildPayload = (status = form.status) => ({
    customer_name: form.customerName.trim(),
    customer_rut: form.customerRut.trim(),
    customer_phone: form.customerPhone.trim(),
    customer_email: form.customerEmail.trim(),
    customer_address: form.customerAddress.trim(),
    customer_city: form.customerCity.trim(),
    patente: form.patente.trim().toUpperCase(),
    vehicle: form.vehicle.trim(),
    notes: form.notes.trim(),
    issue_date: form.issueDate,
    expiry_date: form.expiryDate || null,
    discount_percent: form.discountPercent,
    tax_percent: form.taxPercent,
    advance_required: form.advanceRequired,
    payment_method: form.paymentMethod,
    terms: form.terms.trim(),
    status,
    items,
  });

  const save = async (status: BudgetStatus = form.status) => {
    if (!form.customerName.trim() || !form.customerRut.trim() || items.length === 0) {
      onNotify("error", "Completa cliente, RUT y al menos un ítem");
      return;
    }
    if (!isValidRut(form.customerRut)) {
      onNotify("error", "Ingresa un RUT chileno válido, ej: 11.111.111-1");
      return;
    }
    if (form.customerName.trim().length > CUSTOMER_NAME_MAX_LENGTH) {
      onNotify(
        "error",
        `El nombre del cliente no puede superar ${CUSTOMER_NAME_MAX_LENGTH} caracteres`,
      );
      return;
    }
    const printWindow = window.open("", "_blank");
    setSaving(true);
    try {
      const saved = editingId
        ? await updateBudget(editingId, buildPayload(status))
        : await createBudget(buildPayload(status));
      exportPdf(saved, printWindow);
      onAudit(
        editingId ? "Presupuesto actualizado" : "Presupuesto creado",
        `${saved.customer_name} - ${saved.patente || "sin patente"}`,
      );
      onNotify("success", editingId ? "Presupuesto actualizado" : "Presupuesto guardado");
      reset();
      await loadBudgets();
    } catch (error) {
      printWindow?.close();
      console.error("Save budget failed", error);
      onNotify("error", "No se pudo guardar el presupuesto");
    } finally {
      setSaving(false);
    }
  };

  const editBudget = (budget: BudgetQuote) => {
    setEditingId(budget.id);
    setForm({
      customerName: budget.customer_name,
      customerRut: budget.customer_rut || "",
      customerPhone: budget.customer_phone || "",
      customerEmail: budget.customer_email || "",
      customerAddress: budget.customer_address || "",
      customerCity: budget.customer_city || "",
      patente: budget.patente || "",
      vehicle: budget.vehicle || "",
      notes: budget.notes || "",
      issueDate: budget.issue_date?.slice(0, 10) || today(),
      expiryDate: budget.expiry_date?.slice(0, 10) || "",
      discountPercent: Number(budget.discount_percent) || 0,
      taxPercent: Number(budget.tax_percent) || 0,
      advanceRequired: Number(budget.advance_required) || 0,
      paymentMethod: budget.payment_method || "",
      terms: budget.terms || "",
      status: budget.status,
    });
    setItems(budget.items || []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const duplicateBudget = (budget: BudgetQuote) => {
    editBudget({ ...budget, id: "", status: "borrador" });
    setEditingId(null);
    setForm((current) => ({
      ...current,
      issueDate: today(),
      expiryDate: defaultExpiry(),
      status: "borrador",
    }));
    onNotify("success", "Copia preparada como nuevo presupuesto");
  };

  const changeStatus = async (budget: BudgetQuote, status: BudgetStatus) => {
    try {
      await updateBudgetStatus(budget.id, { status });
      onAudit("Estado de presupuesto actualizado", `${budget.customer_name}: ${statusLabels[status]}`);
      await loadBudgets();
    } catch (error) {
      console.error("Budget status update failed", error);
      onNotify("error", "No se pudo actualizar el estado");
    }
  };

  const buildPublicBudgetLink = (budget: BudgetQuote) =>
    `${window.location.origin}/presupuesto.html?token=${budget.public_token}`;

  const copyBudgetLink = async (budget: BudgetQuote) => {
    if (!budget.public_token) {
      onNotify("error", "Este presupuesto todavía no tiene link público.");
      return;
    }
    const url = buildPublicBudgetLink(budget);
    try {
      await navigator.clipboard.writeText(url);
      onNotify("success", "Link copiado al portapapeles.");
    } catch {
      window.prompt("Copiá el link para el cliente:", url);
    }
  };

  const shareBudgetOnWhatsapp = (budget: BudgetQuote) => {
    if (!budget.public_token) {
      onNotify("error", "Este presupuesto todavía no tiene link público.");
      return;
    }
    const message = `Hola ${budget.customer_name}, te comparto el presupuesto de tu vehículo: ${buildPublicBudgetLink(budget)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  const annulBudget = (budget: BudgetQuote) =>
    requestConfirmation({
      title: "Anular presupuesto",
      message: `El presupuesto de ${budget.customer_name} quedará anulado y conservará su historial.`,
      confirmLabel: "Anular",
      variant: "danger",
      onConfirm: async () => {
        await deleteBudget(budget.id);
        onAudit("Presupuesto anulado", budget.customer_name);
        await loadBudgets();
      },
    });

  const convertBudget = (budget: BudgetQuote) => {
    if (budget.status !== "aprobado") {
      onNotify("error", "Solo un presupuesto aprobado puede convertirse en ingreso");
      return;
    }
    onConvertToVehicle(budget);
  };

  const exportPdf = (
    budget: BudgetQuote,
    targetWindow?: Window | null,
  ) => {
    const itemRows = budget.items
      .map(
        (item) => `<tr><td>${escapeHtml(item.name)}</td><td>${item.item_type}</td><td>${item.quantity}</td><td>${money(item.unit_price)}</td><td>${money(item.quantity * item.unit_price)}</td></tr>`,
      )
      .join("");
    const printWindow = targetWindow || window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!doctype html><html><head><title>Presupuesto</title><style>
      body{font-family:Arial,sans-serif;color:#101828;padding:32px}header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #0f4471;padding-bottom:16px}
      img{width:72px;height:72px;object-fit:contain}h1{color:#0f4471}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border-bottom:1px solid #ddd;padding:9px;text-align:left}
      .total{margin-top:24px;text-align:right;font-size:20px;font-weight:bold}.muted{color:#667085}.terms{margin-top:28px;padding:16px;background:#f3f4f8}
    </style></head><body><header><img src="${mechanicProLogo}"/><div><h1>Presupuesto de reparación</h1><p class="muted">Mechanic Pro</p></div></header>
      <h2>${escapeHtml(budget.customer_name)}</h2><p>RUT: ${escapeHtml(budget.customer_rut || "-")} · Patente: ${escapeHtml(budget.patente || "-")}</p>
      <p>Emisión: ${budget.issue_date?.slice(0, 10)} · Vigencia: ${budget.expiry_date?.slice(0, 10) || "-"}</p>
      <table><thead><tr><th>Ítem</th><th>Tipo</th><th>Cantidad</th><th>Valor unitario</th><th>Total</th></tr></thead><tbody>${itemRows}</tbody></table>
      <div class="total">Total: ${money(Number(budget.total) || 0)}</div><div class="terms">${escapeHtml(budget.terms || "")}</div>
      <script>window.onload=()=>window.print()</script></body></html>`);
    printWindow.document.close();
  };

  const filteredBudgets = budgets.filter((budget) => {
    const normalized = search.toLowerCase();
    const matchesSearch = `${budget.customer_name} ${budget.customer_rut} ${budget.patente}`
      .toLowerCase()
      .includes(normalized);
    const issueDate = budget.issue_date?.slice(0, 10) || "";
    return (
      matchesSearch &&
      (!statusFilter || budget.status === statusFilter) &&
      (!dateFrom || issueDate >= dateFrom) &&
      (!dateTo || issueDate <= dateTo)
    );
  });
  const totalPages = Math.max(1, Math.ceil(filteredBudgets.length / 8));
  const currentPage = Math.min(page, totalPages);
  const paginatedBudgets = filteredBudgets.slice((currentPage - 1) * 8, currentPage * 8);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Presupuestos</h2>
        <p className="text-sm text-gray-500">
          Cotiza servicios, repuestos e insumos y conviértelos en una atención.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Cliente y vehículo</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[
                ["customerName", "Nombre del cliente", "text"],
                ["customerRut", "RUT", "text"],
                ["customerPhone", "Teléfono", "text"],
                ["customerEmail", "Correo", "email"],
                ["customerAddress", "Dirección", "text"],
                ["customerCity", "Ciudad", "text"],
                ["patente", "Patente", "text"],
                ["vehicle", "Marca y modelo", "text"],
              ].map(([name, label, type]) => (
                <label key={name} className="text-sm font-medium text-gray-700">
                  {label}
                  <input
                    name={name}
                    type={type}
                    value={String(form[name as keyof BudgetFormData])}
                    onChange={handleFormChange}
                    maxLength={name === "customerName" ? CUSTOMER_NAME_MAX_LENGTH : undefined}
                    className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0f4471] focus:outline-none"
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Datos comerciales</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm font-medium text-gray-700">Emisión<input name="issueDate" type="date" value={form.issueDate} onChange={handleFormChange} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
              <label className="text-sm font-medium text-gray-700">Vencimiento<input name="expiryDate" type="date" value={form.expiryDate} onChange={handleFormChange} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
              <label className="text-sm font-medium text-gray-700">Forma de pago<select name="paymentMethod" value={form.paymentMethod} onChange={handleFormChange} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="">Seleccionar</option><option>Transferencia</option><option>Débito</option><option>Crédito</option><option>Efectivo</option></select></label>
              <label className="text-sm font-medium text-gray-700">Estado<select name="status" value={form.status} onChange={handleFormChange} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="text-sm font-medium text-gray-700">Descuento %<input name="discountPercent" type="number" min="0" max="100" value={form.discountPercent} onChange={handleFormChange} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
              <label className="text-sm font-medium text-gray-700">IVA %<input name="taxPercent" type="number" min="0" max="100" value={form.taxPercent} onChange={handleFormChange} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
              <label className="text-sm font-medium text-gray-700">Abono solicitado<input name="advanceRequired" type="number" min="0" value={form.advanceRequired} onChange={handleFormChange} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
            </div>
            <textarea name="terms" value={form.terms} onChange={handleFormChange} rows={2} className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Condiciones comerciales" />
            <textarea name="notes" value={form.notes} onChange={handleFormChange} rows={2} className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Observaciones internas" />
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Detalle del presupuesto</h3>
            <form onSubmit={handleAddItem} className="mt-4 grid gap-3 md:grid-cols-[150px_1fr_110px_150px_auto]">
              <select value={itemType} onChange={(event) => { setItemType(event.target.value as BudgetItem["item_type"]); setSelectedReference(""); setUnitPrice(0); }} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="servicio">Servicio</option><option value="repuesto">Repuesto</option><option value="insumo">Insumo</option></select>
              <select value={selectedReference} onChange={(event) => handleReferenceChange(event.target.value)} className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="">Seleccionar ítem</option>{selectableItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <input type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => setQuantity(Number(event.target.value) || 1)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" aria-label="Cantidad" />
              <input type="number" min="0" value={unitPrice} onChange={(event) => setUnitPrice(Number(event.target.value) || 0)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" aria-label="Valor unitario" />
              <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0f4471] px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Agregar</button>
            </form>
            <div className="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200">
              {items.length === 0 ? <p className="p-5 text-sm text-gray-500">No hay ítems agregados.</p> : items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 p-3">
                  <div><p className="font-semibold text-gray-900">{item.name}</p><p className="text-xs text-gray-500">{item.item_type} · {item.quantity} × {money(item.unit_price)}</p></div>
                  <div className="flex items-center gap-3"><strong>{money(item.quantity * item.unit_price)}</strong><button type="button" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} className="p-2 text-[#fc3d3c]" aria-label={`Quitar ${item.name}`}><Trash2 className="h-4 w-4" /></button></div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-[#0f4471]/20 bg-white p-5 shadow-sm xl:sticky xl:top-24">
          <h3 className="text-lg font-semibold text-gray-900">Resumen</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
            <div className="flex justify-between text-[#fc3d3c]"><dt>Descuento</dt><dd>-{money(discountAmount)}</dd></div>
            <div className="flex justify-between"><dt>IVA</dt><dd>{money(taxAmount)}</dd></div>
            <div className="flex justify-between border-t pt-3 text-lg font-bold text-[#0f4471]"><dt>Total</dt><dd>{money(total)}</dd></div>
            <div className="flex justify-between"><dt>Abono solicitado</dt><dd>{money(form.advanceRequired)}</dd></div>
            <div className="flex justify-between font-semibold"><dt>Saldo proyectado</dt><dd>{money(pendingAfterAdvance)}</dd></div>
          </dl>
          <button type="button" disabled={saving} onClick={() => save()} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><FileDown className="h-4 w-4" />{editingId ? "Actualizar y exportar PDF" : "Guardar y exportar PDF"}</button>
          <button type="button" onClick={() => requestConfirmation({ title: "Limpiar presupuesto", message: "Se eliminarán los datos ingresados en pantalla.", confirmLabel: "Limpiar", variant: "danger", onConfirm: reset })} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"><RotateCcw className="h-4 w-4" />Limpiar</button>
        </aside>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-900">Historial de presupuestos</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3"><Search className="h-4 w-4 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full py-2 text-sm outline-none" placeholder="Cliente, RUT o patente" /></div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="">Todos los estados</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <button type="button" onClick={() => { setSearch(""); setStatusFilter(""); setDateFrom(""); setDateTo(""); }} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold">Limpiar filtros</button>
          </div>
        </div>
        {loading ? <p className="p-8 text-sm text-gray-500">Cargando presupuestos...</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Cliente / vehículo</th><th className="px-4 py-3 text-left">Emisión</th><th className="px-4 py-3 text-left">Estado</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead>
              <tbody className="divide-y divide-gray-200">{paginatedBudgets.map((budget) => (
                <tr key={budget.id}><td className="px-4 py-3"><p className="font-semibold">{budget.customer_name}</p><p className="text-xs text-gray-500">{budget.customer_rut || "-"} · {budget.patente || "Sin patente"} · {budget.vehicle || "Sin vehículo"}</p></td><td className="px-4 py-3">{budget.issue_date?.slice(0, 10)}</td><td className="px-4 py-3"><select value={budget.status} onChange={(event) => changeStatus(budget, event.target.value as BudgetStatus)} disabled={budget.status === "anulado" || budget.status === "convertido"} className={`rounded-full border-0 px-3 py-1 text-xs font-semibold ${statusStyles[budget.status]}`}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td className="px-4 py-3 text-right font-bold">{money(Number(budget.total) || 0)}</td><td className="px-4 py-3"><div className="flex justify-end gap-1"><button onClick={() => editBudget(budget)} className="p-2 text-[#0f4471]" title="Editar"><Edit2 className="h-4 w-4" /></button><button onClick={() => duplicateBudget(budget)} className="p-2 text-sky-600" title="Duplicar"><Copy className="h-4 w-4" /></button><button onClick={() => exportPdf(budget)} className="p-2 text-gray-600" title="PDF"><FileDown className="h-4 w-4" /></button><button onClick={() => copyBudgetLink(budget)} className="p-2 text-gray-600" title="Copiar link para el cliente"><Link2 className="h-4 w-4" /></button><button onClick={() => shareBudgetOnWhatsapp(budget)} className="p-2 text-emerald-600" title="Enviar por WhatsApp"><MessageCircle className="h-4 w-4" /></button><button onClick={() => convertBudget(budget)} className="p-2 text-green-600" title="Crear ingreso"><Send className="h-4 w-4" /></button><button onClick={() => annulBudget(budget)} className="p-2 text-[#fc3d3c]" title="Anular"><Trash2 className="h-4 w-4" /></button></div></td></tr>
              ))}</tbody>
            </table>
            {paginatedBudgets.length === 0 && <p className="p-8 text-center text-sm text-gray-500">No hay presupuestos para los filtros seleccionados.</p>}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-gray-200 p-4"><p className="text-sm text-gray-500">{filteredBudgets.length} presupuesto(s)</p><div className="flex items-center gap-2"><button disabled={currentPage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Anterior</button><span className="text-sm font-semibold">Página {currentPage} de {totalPages}</span><button disabled={currentPage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Siguiente</button></div></div>
      </section>
    </div>
  );
}
