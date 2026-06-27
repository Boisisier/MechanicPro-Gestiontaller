import { FormEvent, useState } from "react";
import { Edit2, Plus, Search } from "lucide-react";
import {
  createServiceCatalogItem,
  createServiceCategory,
  updateServiceCatalogItem,
  updateServiceCategory,
} from "../../lib/api";
import type { CatalogService, ServiceCategory } from "../../lib/types";

interface Props {
  categories: ServiceCategory[];
  services: CatalogService[];
  onChanged: () => Promise<void>;
  onNotify: (type: "success" | "error", message: string) => void;
  onAudit: (action: string, detail: string) => void;
}

const emptyForm = {
  code: "",
  name: "",
  category_id: "",
  description: "",
  base_price: "",
  estimated_hours: "",
  active: true,
};

export default function ServiceCatalogManager({
  categories,
  services,
  onChanged,
  onNotify,
  onAudit,
}: Props) {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const activeCategories = categories.filter((category) => category.active);
  const filteredServices = services.filter((service) =>
    `${service.code} ${service.name} ${service.category}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleCategorySubmit = async (event: FormEvent) => {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) return;
    try {
      await createServiceCategory({ name });
      setCategoryName("");
      await onChanged();
      onAudit("Categoría de servicio creada", name);
      onNotify("success", "Categoría creada");
    } catch (error) {
      console.error("Create service category failed", error);
      onNotify("error", "No se pudo crear la categoría");
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.category_id || !form.code.trim() || !form.name.trim()) {
      onNotify("error", "Completa código, nombre y categoría");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim(),
        base_price: Number(form.base_price),
        estimated_hours: Number(form.estimated_hours),
      };
      if (editingId) {
        await updateServiceCatalogItem(editingId, payload);
      } else {
        await createServiceCatalogItem(payload);
      }
      await onChanged();
      onAudit(
        editingId ? "Servicio actualizado" : "Servicio creado",
        `${payload.code} - ${payload.name}`,
      );
      onNotify(
        "success",
        editingId ? "Servicio actualizado" : "Servicio creado",
      );
      resetForm();
    } catch (error) {
      console.error("Save service failed", error);
      onNotify("error", "No se pudo guardar el servicio");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (service: CatalogService) => {
    setEditingId(service.id || null);
    setForm({
      code: service.code || "",
      name: service.name,
      category_id: service.category_id || "",
      description: service.description || "",
      base_price: String(service.base_price || 0),
      estimated_hours: String(service.estimated_hours || 0),
      active: service.active !== false,
    });
  };

  const handleToggleService = async (service: CatalogService) => {
    if (!service.id || !service.category_id) return;
    try {
      await updateServiceCatalogItem(service.id, {
        code: service.code,
        name: service.name,
        category_id: service.category_id,
        description: service.description,
        base_price: service.base_price || 0,
        estimated_hours: service.estimated_hours || 0,
        active: service.active === false,
      });
      await onChanged();
      onAudit(
        service.active === false ? "Servicio activado" : "Servicio desactivado",
        service.name,
      );
    } catch (error) {
      console.error("Toggle service failed", error);
      onNotify("error", "No se pudo cambiar el estado");
    }
  };

  const handleToggleCategory = async (category: ServiceCategory) => {
    try {
      await updateServiceCategory(category.id, {
        name: category.name,
        active: !category.active,
      });
      await onChanged();
      onAudit(
        category.active ? "Categoría desactivada" : "Categoría activada",
        category.name,
      );
    } catch (error) {
      console.error("Toggle category failed", error);
      onNotify("error", "No se pudo cambiar la categoría");
    }
  };

  return (
    <section className="space-y-5 border-t border-gray-200 pt-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Mantenedor de servicios
        </h3>
        <p className="text-sm text-gray-500">
          Define precios base y tiempos estimados para utilizarlos en todas las atenciones.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <div className="rounded-lg border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-900">Categorías</h4>
          <form onSubmit={handleCategorySubmit} className="mt-3 flex gap-2">
            <input
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Nueva categoría"
            />
            <button
              className="rounded-lg bg-[#0f4471] p-2 text-white"
              aria-label="Agregar categoría"
              title="Agregar categoría"
            >
              <Plus className="h-5 w-5" />
            </button>
          </form>
          <div className="mt-3 space-y-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
              >
                <span className="text-sm font-medium text-gray-800">
                  {category.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleCategory(category)}
                  className={`text-xs font-semibold ${
                    category.active ? "text-green-700" : "text-gray-500"
                  }`}
                >
                  {category.active ? "Activa" : "Inactiva"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-lg border border-gray-200 p-4 md:grid-cols-2 xl:grid-cols-3"
        >
          <input
            value={form.code}
            onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Código interno"
            required
          />
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Nombre del servicio"
            required
          />
          <select
            value={form.category_id}
            onChange={(event) => setForm((prev) => ({ ...prev, category_id: event.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            required
          >
            <option value="">Selecciona categoría</option>
            {activeCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            value={form.base_price}
            onChange={(event) => setForm((prev) => ({ ...prev, base_price: event.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Valor base"
            required
          />
          <input
            type="number"
            min="0"
            step="0.25"
            value={form.estimated_hours}
            onChange={(event) => setForm((prev) => ({ ...prev, estimated_hours: event.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Horas estimadas"
            required
          />
          <input
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Descripción"
          />
          <div className="flex gap-2 md:col-span-2 xl:col-span-3">
            <button
              disabled={saving}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {editingId ? "Actualizar servicio" : "Crear servicio"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 border-b border-gray-200 p-3">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full text-sm outline-none"
            placeholder="Buscar por código, servicio o categoría"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Servicio</th>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-right">Valor base</th>
                <th className="px-4 py-3 text-right">Horas</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredServices.map((service) => (
                <tr key={service.id || service.name} className={!service.active ? "opacity-55" : ""}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{service.name}</p>
                    <p className="text-xs text-gray-500">{service.code}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{service.category}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    ${(service.base_price || 0).toLocaleString("es-CL")}
                  </td>
                  <td className="px-4 py-3 text-right">{service.estimated_hours || 0} h</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(service)}
                        className="rounded-lg border border-gray-300 p-2 text-[#0f4471]"
                        title="Editar servicio"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleService(service)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold"
                      >
                        {service.active ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
