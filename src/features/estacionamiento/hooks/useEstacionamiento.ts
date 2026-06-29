import { useState } from "react";
import {
  AuditLog,
  UserRole,
  Vehicle,
  WorkshopUser,
} from "../../../shared/lib/types";
import {
  parseStoredReviewParts,
  parseStoredReviewServices,
} from "../../../shared/utils/reviewParsers";
import {
  createAuditLog,
  createParkingRelease,
  getAuthToken,
  updateVehicle,
} from "../../../shared/lib/api";
import { useNotification } from "../../../shared/hooks/useNotification";

export default function useEstacionamiento() {
  const { showNotification } =
    useNotification();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const vehiclesEntregados = vehicles.filter(
    (vehicle) => vehicle.estado === "Entregado",
  );

  const getVehicleExitDate = (vehicle: Vehicle) =>
    new Date(
      vehicle.fecha_salida_confirmada ||
        vehicle.updated_at ||
        vehicle.fecha_ingreso,
    );

  const getParkingDays = (vehicle: Vehicle) => {
    const exitDate = getVehicleExitDate(vehicle);
    return Math.max(
      0,
      Math.floor((Date.now() - exitDate.getTime()) / (1000 * 60 * 60 * 24)),
    );
  };

  const [manualParkingIds, setManualParkingIds] = useState<string[]>(() => {
    const raw = localStorage.getItem("manualParkingIds");
    return raw ? JSON.parse(raw) : [];
  });

  const [releasedParkingIds, setReleasedParkingIds] = useState<string[]>(() => {
    const raw = localStorage.getItem("releasedParkingIds");
    return raw ? JSON.parse(raw) : [];
  });

  const parkedVehicles = vehiclesEntregados.filter(
    (vehicle) =>
      (getParkingDays(vehicle) > 7 ||
        manualParkingIds.includes(vehicle.id) ||
        vehicle.en_estacionamiento_manual) &&
      !releasedParkingIds.includes(vehicle.id),
  );

  const getVehicleWorkTotal = (vehicle: Vehicle) => {
    const serviceTotal = parseStoredReviewServices(vehicle.servicios).reduce(
      (sum, service) => sum + (parseInt(service.price || "0", 10) || 0),
      0,
    );
    const partTotal = parseStoredReviewParts(vehicle.servicios).reduce(
      (sum, part) => sum + part.quantity * (part.unitCost || 0),
      0,
    );
    return serviceTotal + partTotal;
  };

  const [, setConfirmDialog] = useState<{
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

  const [authToken] = useState<string | null>(() =>
    getAuthToken(),
  );
  const [sessionRole] = useState<"member" | null>(null);
  const [sessionUser] = useState<{
    name: string;
    email: string;
    role: string;
  } | null>(null);

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

  const [workshopUsers] = useState<WorkshopUser[]>(() => {
    const raw = localStorage.getItem("workshopUsers");
    return raw ? JSON.parse(raw) : defaultWorkshopUsers;
  });
  const currentAuditUser = sessionUser
    ? {
        id: "session-user",
        name: sessionUser.name,
        email: sessionUser.email,
        role: sessionUser.role as UserRole,
      }
    : workshopUsers.find((user) => user.role === "Administrador de Taller") ||
      workshopUsers[0];

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

  const [, setAuditLogs] = useState<AuditLog[]>(() => {
    const raw = localStorage.getItem("auditLogs");
    return raw ? JSON.parse(raw) : [];
  });

  const logAction = (action: string, module: string, detail: string) => {
    const entry: AuditLog = {
      id: crypto.randomUUID(),
      user_name: currentAuditUser?.name || "Usuario general",
      module,
      action,
      detail,
      created_at: new Date().toISOString(),
    };
    setAuditLogs((prev) => [entry, ...prev].slice(0, 500));
    if (authToken && sessionRole === "member") {
      createAuditLog(entry).catch((error) => {
        console.error("Audit log sync failed", error);
      });
    }
  };

  const performReleaseFromParking = async (vehicle: Vehicle) => {
    try {
      if (authToken && sessionRole === "member") {
        await createParkingRelease({
          vehicle_id: vehicle.id,
          released_by: currentAuditUser?.name || "Usuario general",
          detail: `${vehicle.patente} retirado del estacionamiento`,
        });
      }

      await updateVehicleRecord(
        vehicle,
        { estado: "Entregado", en_estacionamiento_manual: false },
        "Vehículo retirado del estacionamiento",
      );

      setReleasedParkingIds((prev) =>
        prev.includes(vehicle.id) ? prev : [...prev, vehicle.id],
      );
      setManualParkingIds((prev) => prev.filter((id) => id !== vehicle.id));
      logAction(
        "Salida de estacionamiento",
        "Estacionamiento",
        `${vehicle.patente} fue retirado del listado de estacionamiento`,
      );
    } catch (error) {
      console.error("Parking release failed", error);
      showNotification(
        "error",
        "No se pudo guardar la salida de estacionamiento",
      );
    }
  };

  const handleReleaseFromParking = (vehicle: Vehicle) => {
    requestConfirmation({
      title: "Sacar del estacionamiento",
      message: `El vehículo ${vehicle.patente} dejará de aparecer como pendiente en Estacionamiento.`,
      confirmLabel: "Sacar",
      variant: "danger",
      onConfirm: () => performReleaseFromParking(vehicle),
    });
  };

  const sessionUserRole = sessionUser?.role || "";
  const isMechanicSession = sessionUserRole === "Mecánico";
  const canViewPrices = !isMechanicSession;

  return {
    parkedVehicles,
    getVehicleWorkTotal,
    getParkingDays,
    getVehicleExitDate,
    handleReleaseFromParking,
    canViewPrices,
  };
}
