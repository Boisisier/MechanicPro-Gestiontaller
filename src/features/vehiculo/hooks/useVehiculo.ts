import { useState } from "react";
import {
  CatalogService,
  ReviewPartItem,
  ReviewServiceItem,
  Vehicle,
  WorkshopUser,
} from "../../../shared/lib/types";
import {
  parseStoredReviewParts,
  parseStoredReviewServices,
  serializeReviewService,
} from "../../../shared/utils/reviewParsers";
import { useNotification } from "../../../shared/hooks/useNotification";
import { VehicleFormData } from "../components/VehicleForm";
import { createVehicle, updateVehicle } from "../../../shared/lib/api";
import useAuditLog from "../../../shared/hooks/useAudit";

interface useVehiculoProps {
  isMechanicSession: Boolean;
}

export default function useVehiculo(isMechanicSession: useVehiculoProps) {
  const { logAction } = useAuditLog();

  const [vehicleTab, setVehicleTab] = useState<"ingreso" | "taller" | "salida">(
    "ingreso",
  );

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning" | "info";
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const requestConfirmation = (options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning" | "info";
    onConfirm: () => void | Promise<void>;
  }) => {
    setConfirmDialog(options);
  };

  const [reviewServices, setReviewServices] = useState<ReviewServiceItem[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reviewVehicleId, setReviewVehicleId] = useState<string | null>(null);
  const vehiclesEntaller = vehicles.filter(
    (vehicle) => vehicle.estado === "En Taller",
  );
  const activeReviewVehicle =
    vehicles.find((vehicle) => vehicle.id === reviewVehicleId) ||
    vehiclesEntaller[0] ||
    null;

  const [reviewParts, setReviewParts] = useState<ReviewPartItem[]>([]);
  const [reviewNotes, setReviewNotes] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [partSearch, setPartSearch] = useState("");
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  const [partPickerOpen, setPartPickerOpen] = useState(false);
  const { notification, showNotification, clearNotification } =
    useNotification();

  const performClearReviewRecord = () => {
    setReviewServices(
      isMechanicSession && activeReviewVehicle
        ? parseStoredReviewServices(activeReviewVehicle.servicios)
        : [],
    );
    setReviewParts([]);
    setReviewNotes("");
    setServiceSearch("");
    setPartSearch("");
    setServicePickerOpen(false);
    setPartPickerOpen(false);
    showNotification("success", "Registro de En Taller limpiado");
  };

  const handleClearReviewRecord = () => {
    requestConfirmation({
      title: "Limpiar registro",
      message:
        "Se limpiarán los servicios, repuestos y detalle del trabajo actual en taller.",
      confirmLabel: "Limpiar registro",
      variant: "danger",
      onConfirm: performClearReviewRecord,
    });
  };

  const [catalogServices, setCatalogServices] = useState<CatalogService[]>([]);

  const handleSubmit = async (formData: VehicleFormData) => {
    const selectedCatalogItems = formData.servicios.map((serviceText) => {
      const parsed = parseStoredReviewServices([serviceText])[0];
      const name = parsed?.name || serviceText;
      const catalogItem = catalogServices.find(
        (service) => service.name === name,
      );
      return {
        name,
        price: String(catalogItem?.base_price ?? parsed?.price ?? 0),
        estimatedHours: Number(catalogItem?.estimated_hours) || 0,
      };
    });
    const catalogHours = selectedCatalogItems.reduce(
      (sum, service) => sum + service.estimatedHours,
      0,
    );
    const payload = {
      ...formData,
      servicios: selectedCatalogItems.map(({ name, price }) =>
        serializeReviewService({ name, price }),
      ),
      estimated_work_hours:
        catalogHours > 0 ? catalogHours : formData.estimated_work_hours,
    };
    try {
      if (editingVehicle) {
        const updated = await updateVehicle(editingVehicle.id, payload);

        setVehicles((prev) =>
          prev.map((v) => (v.id === updated.id ? updated : v)),
        );

        showNotification("success", "vehículo actualizado correctamente");

        logAction(
          "Vehículo actualizado",
          "Vehículos",
          `${formData.patente} fue actualizado`,
        );

        setEditingVehicle(null);
      } else {
        const created = await createVehicle(payload);

        setVehicles((prev) => [created, ...prev]);

        logAction(
          "Vehículo registrado",
          "Vehículos",
          `${formData.patente} fue ingresado al taller`,
        );

        showNotification("success", "vehículo registrado correctamente");
      }
    } catch (error) {
      const message =
        (error as Error & { status?: number }).status === 409
          ? "La patente ya está registrada"
          : "Error al guardar el vehículo";

      showNotification("error", message);

      console.error("Error:", error);
    }
  };

  const [editingVehicle, setEditingVehicle] = useState<
    (VehicleFormData & { id: string }) | null
  >(null);

  const defaultWorkshopUsers: WorkshopUser[] = [
    {
      id: "admin-taller",
      name: "Administrador de Taller",
      email: "admin@taller.cl",
      role: "Administrador de Taller",
    },
    {
      id: "administrativo",
      name: "Administrativo",
      email: "administrativo@taller.cl",
      role: "Administrativo",
    },
    {
      id: "mecanico",
      name: "Mecánico",
      email: "mecanico@taller.cl",
      role: "Mecánico",
    },
  ];

  const [workshopUsers, setWorkshopUsers] = useState<WorkshopUser[]>(() => {
    const raw = localStorage.getItem("workshopUsers");
    return raw ? JSON.parse(raw) : defaultWorkshopUsers;
  });

  const mechanicOptions = workshopUsers
    .filter((user) => user.role === "Mecánico" || user.role_name === "Mecánico")
    .map((user) => ({ id: user.id, name: user.name }));

  const vehiclesEnTaller = vehicles.filter(
    (vehicle) => vehicle.estado === "Ingresado",
  );

  const vehiclesEntregados = vehicles.filter(
    (vehicle) => vehicle.estado === "Entregado",
  );

  const buildVehiclePayload = (
    vehicle: Vehicle,
    overrides: Partial<Vehicle>,
  ) => {
    const normalizePayloadDate = (value?: string | null) => {
      if (!value) {
        return null;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
      }
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime())
        ? null
        : parsed.toISOString().slice(0, 10);
    };

    return {
      patente: vehicle.patente,

      marca: vehicle.marca,

      modelo: vehicle.modelo,

      ano: vehicle.ano,

      tipo_vehiculo: vehicle.tipo_vehiculo,

      codigo_vin: vehicle.codigo_vin || "",

      codigo_motor: vehicle.codigo_motor || "",

      color: vehicle.color || "",

      kilometraje: vehicle.kilometraje,

      cantidad_combustible: vehicle.cantidad_combustible,

      estado: vehicle.estado,

      customer_name: vehicle.customer_name || "",

      customer_rut: vehicle.customer_rut || "",

      customer_phone: vehicle.customer_phone || "",

      customer_address: vehicle.customer_address || "",

      customer_city: vehicle.customer_city || "",

      customer_email: vehicle.customer_email || "",

      assigned_mechanic_id: vehicle.assigned_mechanic_id || "",

      assigned_mechanic_name: vehicle.assigned_mechanic_name || "",

      customer_advance: vehicle.customer_advance || 0,

      attention_priority: vehicle.attention_priority || "Normal",

      estimated_work_hours: vehicle.estimated_work_hours || 0,

      customer_authorized: vehicle.customer_authorized || false,

      servicios: vehicle.servicios || [],

      observaciones: vehicle.observaciones || "",

      comentario_tecnico: vehicle.comentario_tecnico || "",

      salida_confirmada: vehicle.salida_confirmada || false,

      fecha_salida_confirmada: vehicle.fecha_salida_confirmada || null,

      en_estacionamiento_manual: vehicle.en_estacionamiento_manual || false,

      ...overrides,

      promised_delivery_date:
        "promised_delivery_date" in overrides
          ? normalizePayloadDate(overrides.promised_delivery_date)
          : normalizePayloadDate(vehicle.promised_delivery_date),
    };
  };

  const updateVehicleRecord = async (
    vehicle: Vehicle,

    overrides: Partial<Vehicle>,

    successMessage: string,
  ) => {
    const payload = buildVehiclePayload(vehicle, overrides);

    const updated = await updateVehicle(vehicle.id, payload);

    setVehicles((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item)),
    );

    showNotification("success", successMessage);
  };

  const handleSendToTaller = async (vehicle: Vehicle) => {
    try {
      await updateVehicleRecord(
        vehicle,
        { estado: "En Taller" },
        "Vehículo enviado a En Taller",
      );

      setVehicleTab("taller");

      setReviewVehicleId(vehicle.id);

      setReviewServices(parseStoredReviewServices(vehicle.servicios));

      setReviewParts(parseStoredReviewParts(vehicle.servicios));

      setReviewNotes(vehicle.observaciones || "");

      logAction(
        "Enviado a En Taller",
        "Vehículos",
        `${vehicle.patente} fue enviado a En Taller`,
      );
    } catch (error) {
      console.error("Send to workshop failed", error);

      showNotification("error", "No se pudo enviar a En Taller");
    }
  };

  return {
    vehicleTab,
    setVehicleTab,
    requestConfirmation,
    handleClearReviewRecord,
    handleSubmit,
    editingVehicle,
    setEditingVehicle,
    vehicles,
    mechanicOptions,
    catalogServices,
    vehiclesEnTaller,
    vehiclesEntaller,
    handleSendToTaller,
  };
}
