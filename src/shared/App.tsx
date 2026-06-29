import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  clearAuthToken,
  createVehicle,
  createAuditLog,
  getAuthToken,
  getAuditLogs,
  getInventoryItems,
  getParkingReleases,
  getSession,
  getVehicles,
  getWorkshopUsers,
  login,
  loginDemo,
  setAuthToken,
  deleteParkingRelease,
  updateInventoryItem,
  updateVehicle,
  getServiceCatalog,
  getServiceCategories,
} from "./lib/api";

import type {
  CatalogService,
  ReviewPartItem,
  ReviewServiceItem,
  InventoryItem,
  UserRole,
  Vehicle,
  WorkshopUser,
  AuditLog,
  ServiceCategory,
} from "./lib/types";

import Sidebar from "./components/layout/Sidebar";

import Header from "./components/layout/Header";

import VehicleForm, {
  VehicleFormData,
} from "./components/vehicles/VehicleForm";

import VehicleTable from "./components/vehicles/VehicleTable";
import ExitPricingSection from "./components/vehicles/ExitPricingSection";
import ConfirmDialog from "./components/ui/ConfirmDialog";
import Toast from "./components/ui/Toast";

import { Search, Trash2, X, RotateCcw, Send, Clock } from "lucide-react";

import {
  parseStoredReviewServices,
  parseStoredReviewParts,
  serializeReviewService,
  serializeReviewPart,
} from "./utils/reviewParsers";

import { exportVehiclePdf } from "./utils/html";

import { useNotification } from "./hooks/useNotification";

import InventoryPage from "../features/inventario/InventoryPage";
import mechanicProLogo from "./assets/mechanic-pro-logo.png";
import PresupuestoPage from "../features/presupuesto/PresupuestoPage";
import DashboardPage from "../features/dashboard/DashboardPage";
import ConfiguracionPage from "../features/configuracion/ConfiguracionPage";
import ServiceCatalogManager from "./components/settings/ServiceCatalogManager";
import EstacionamientoPage from "../features/estacionamiento/EstacionamientoPage";
import RegistroPage from "../features/registroAcciones/RegistroPage";

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

const auditLogsPageSize = 15;
const mechanicHiddenSections = [
  "dashboard",
  "presupuesto",
  "inventario",
  "estacionamiento",
  "configuracion",
  "registro_acciones",
];

const apiErrorMessages: Record<string, string> = {
  invalid_attention_planning:
    "Revisa la planificación: prioridad, horas estimadas o fecha comprometida.",
  invalid_customer_advance: "El abono del cliente no es válido.",
  mechanic_cannot_confirm_exit:
    "El mecánico puede enviar a salida, pero no confirmar la salida final.",
  mechanic_cannot_close_vehicle:
    "El mecánico no puede cerrar económicamente el vehículo.",
  "Missing customer fields":
    "Faltan datos del cliente. Revisa nombre, RUT, teléfono, dirección y ciudad.",
  "Missing field: patente": "Falta la patente del vehículo.",
  "Invalid patente": "La patente no tiene un formato válido.",
  "Invalid estado": "El estado del vehículo no es válido.",
};

const getFriendlyApiError = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : "";
  return apiErrorMessages[message] || message || fallback;
};

function App() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  const lowStockItems = inventoryItems.filter(
    (item) => item.minStock > 0 && item.stock <= item.minStock,
  );

  const { notification, showNotification, clearNotification } =
    useNotification();

  const [activeSection, setActiveSection] = useState("vehiculos");

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [catalogServices, setCatalogServices] = useState<CatalogService[]>([]);

  const [editingVehicle, setEditingVehicle] = useState<
    (VehicleFormData & { id: string }) | null
  >(null);

  const [loading, setLoading] = useState(true);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  const [authToken, setAuthTokenState] = useState<string | null>(() =>
    getAuthToken(),
  );

  const [sessionRole, setSessionRole] = useState<"member" | null>(null);

  const [sessionUser, setSessionUser] = useState<{
    name: string;
    email: string;
    role: string;
  } | null>(null);

  const [authError, setAuthError] = useState<string | null>(null);

  const [demoLoading, setDemoLoading] = useState(false);

  const [loginLoading, setLoginLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({
    email: "demo@local",
    password: "demo1234",
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning" | "info";
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const [workshopUsers, setWorkshopUsers] = useState<WorkshopUser[]>(() => {
    const raw = localStorage.getItem("workshopUsers");
    return raw ? JSON.parse(raw) : defaultWorkshopUsers;
  });

  const [vehicleTab, setVehicleTab] = useState<"ingreso" | "taller" | "salida">(
    "ingreso",
  );

  const [reviewVehicleId, setReviewVehicleId] = useState<string | null>(null);

  const [reviewServices, setReviewServices] = useState<ReviewServiceItem[]>([]);

  const [reviewParts, setReviewParts] = useState<ReviewPartItem[]>([]);

  const [workClockNow, setWorkClockNow] = useState(() => Date.now());

  const [serviceSearch, setServiceSearch] = useState("");

  const [servicePickerOpen, setServicePickerOpen] = useState(false);

  const [partSearch, setPartSearch] = useState("");

  const [partPickerOpen, setPartPickerOpen] = useState(false);
  const [inventoryPickerType, setInventoryPickerType] = useState<
    "repuesto" | "insumo"
  >("repuesto");

  const [reviewNotes, setReviewNotes] = useState("");

  const [readyVehicleIds, setReadyVehicleIds] = useState<string[]>([]);

  const [hiddenSalidaIds, setHiddenSalidaIds] = useState<string[]>([]);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const raw = localStorage.getItem("auditLogs");
    return raw ? JSON.parse(raw) : [];
  });
  const [auditDateFrom, setAuditDateFrom] = useState("");
  const [auditDateTo, setAuditDateTo] = useState("");
  const [auditPage, setAuditPage] = useState(1);

  const [releasedParkingIds, setReleasedParkingIds] = useState<string[]>(() => {
    const raw = localStorage.getItem("releasedParkingIds");
    return raw ? JSON.parse(raw) : [];
  });

  const [manualParkingIds, setManualParkingIds] = useState<string[]>(() => {
    const raw = localStorage.getItem("manualParkingIds");
    return raw ? JSON.parse(raw) : [];
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

  const isSessionAdmin =
    sessionUser?.role === "admin" ||
    sessionUser?.role === "Administrador de Taller";

  const sessionUserRole = sessionUser?.role || "";
  const isMechanicSession = sessionUserRole === "Mecánico";
  const canViewPrices = !isMechanicSession;
  const canEditPrices =
    sessionUserRole === "admin" ||
    sessionUserRole === "Administrador de Taller" ||
    sessionUserRole === "Administrativo";
  const canSendToSalida = Boolean(sessionUser);
  const canAccessSalida = canEditPrices;
  const canAccessBudget = canViewPrices;

  const handleSidebarToggle = () => {
    if (window.innerWidth >= 1024) {
      setDesktopSidebarOpen((prev) => !prev);
      return;
    }
    setSidebarOpen(true);
  };

  useEffect(() => {
    if (isMechanicSession && mechanicHiddenSections.includes(activeSection)) {
      setActiveSection("vehiculos");
    }
  }, [activeSection, isMechanicSession]);

  useEffect(() => {
    if (isMechanicSession && vehicleTab !== "taller") {
      setVehicleTab("taller");
      return;
    }
    if (!canAccessSalida && vehicleTab === "salida") {
      setVehicleTab("taller");
    }
  }, [canAccessSalida, isMechanicSession, vehicleTab]);

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

  const handleConfirmDialog = async () => {
    if (!confirmDialog) {
      return;
    }
    const action = confirmDialog.onConfirm;
    setConfirmDialog(null);
    await action();
  };

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

  useEffect(() => {
    if (!authToken) {
      setSessionRole(null);
      setSessionUser(null);
      return;
    }
    const loadSession = async () => {
      try {
        const session = await getSession();
        setSessionRole("member");
        setSessionUser({
          name: session.user?.full_name || "Usuario",
          email: session.user?.email || "",
          role: session.role || "member",
        });
      } catch {
        clearAuthToken();
        setAuthTokenState(null);
        setSessionRole(null);
        setSessionUser(null);
      }
    };
    loadSession();
  }, [authToken]);

  useEffect(() => {
    localStorage.setItem("workshopUsers", JSON.stringify(workshopUsers));
  }, [workshopUsers]);

  useEffect(() => {
    localStorage.setItem("auditLogs", JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    const timer = window.setInterval(() => setWorkClockNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setAuditPage(1);
  }, [auditDateFrom, auditDateTo]);

  useEffect(() => {
    localStorage.setItem(
      "releasedParkingIds",
      JSON.stringify(releasedParkingIds),
    );
  }, [releasedParkingIds]);

  useEffect(() => {
    localStorage.setItem("manualParkingIds", JSON.stringify(manualParkingIds));
  }, [manualParkingIds]);

  useEffect(() => {
    if (!authToken || sessionRole !== "member") {
      setVehicles([]);
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const data = await getVehicles();
        setVehicles(data);
      } catch (error) {
        if ((error as Error & { status?: number }).status === 401) {
          clearAuthToken();
          setAuthTokenState(null);
          setSessionRole(null);
          return;
        }
        showNotification("error", "Error al cargar los vehículos");
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    setLoading(true);
    load();
  }, [authToken, sessionRole, showNotification]);

  useEffect(() => {
    if (!authToken || sessionRole !== "member" || isMechanicSession) {
      return;
    }

    getWorkshopUsers()
      .then((rows) =>
        setWorkshopUsers(
          rows.map((user: WorkshopUser) => ({
            ...user,
            role: (user.role_name || user.role) as UserRole,
          })),
        ),
      )
      .catch((error) => console.error("Workshop users load failed", error));

    getInventoryItems()
      .then((rows) => setInventoryItems(rows))
      .catch((error) => console.error("Inventory load failed", error));

    getParkingReleases()
      .then((rows) =>
        setReleasedParkingIds(
          rows.map((item: { vehicle_id: string }) => item.vehicle_id),
        ),
      )
      .catch((error) => console.error("Parking releases load failed", error));
  }, [authToken, sessionRole, isMechanicSession]);

  useEffect(() => {
    if (!authToken || sessionRole !== "member" || isMechanicSession) {
      return;
    }

    getAuditLogs({
      date_from: auditDateFrom || undefined,
      date_to: auditDateTo || undefined,
    })
      .then((rows) => setAuditLogs(rows))
      .catch((error) => console.error("Audit logs load failed", error));
  }, [authToken, sessionRole, isMechanicSession, auditDateFrom, auditDateTo]);

  useEffect(() => {
    if (
      reviewVehicleId &&
      !vehicles.find((item) => item.id === reviewVehicleId)
    ) {
      setReviewVehicleId(null);
      setReviewServices([]);
      setReviewParts([]);
      setReviewNotes("");
    }
  }, [vehicles, reviewVehicleId]);

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      const session = await loginDemo();
      setAuthToken(session.token);
      setAuthTokenState(session.token);
      setSessionRole("member");
      setSessionUser({
        name: session.user?.full_name || "Usuario demo",
        email: session.user?.email || "",
        role: session.role || "admin",
      });
      showNotification("success", "Acceso demo listo");
    } catch (error) {
      console.error("Demo login failed", error);
      setAuthError("No se pudo iniciar el acceso demo");
    } finally {
      setDemoLoading(false);
    }
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoginLoading(true);
    setAuthError(null);

    try {
      const session = await login({
        email: loginForm.email.trim(),
        password: loginForm.password,
      });
      setAuthToken(session.token);
      setAuthTokenState(session.token);
      setSessionRole("member");
      setSessionUser({
        name: session.user?.full_name || "Usuario",
        email: session.user?.email || "",
        role: session.role || "member",
      });
      showNotification("success", "Sesión iniciada");
    } catch (error) {
      console.error("Login failed", error);
      setAuthError("Usuario o contraseña incorrectos");
    } finally {
      setLoginLoading(false);
    }
  };

  const performLogout = () => {
    clearAuthToken();
    setAuthTokenState(null);
    setSessionRole(null);
    setSessionUser(null);
  };

  const handleLogout = () => {
    requestConfirmation({
      title: "Cerrar sesión",
      message:
        "Se cerrará la sesión actual y volverás a la pantalla de acceso.",
      confirmLabel: "Cerrar sesión",
      variant: "warning",
      onConfirm: performLogout,
    });
  };
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>(
    [],
  );

  const loadServiceCatalog = useCallback(async () => {
    if (!authToken || sessionRole !== "member") return;
    const [services, categories] = await Promise.all([
      getServiceCatalog(isSessionAdmin),
      getServiceCategories(),
    ]);
    setCatalogServices(services);
    setServiceCategories(categories);
  }, [authToken, sessionRole, isSessionAdmin]);

  useEffect(() => {
    if (!authToken || sessionRole !== "member") return;
    loadServiceCatalog().catch((error) => {
      console.error("Service catalog load failed", error);
      showNotification("error", "No se pudo cargar el catálogo de servicios");
    });
  }, [authToken, sessionRole, loadServiceCatalog, showNotification]);

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

  const handleReviewSelect = (vehicle: Vehicle) => {
    setReviewVehicleId(vehicle.id);

    setReviewServices(parseStoredReviewServices(vehicle.servicios));

    setReviewParts(parseStoredReviewParts(vehicle.servicios));

    setReviewNotes(vehicle.observaciones || "");
  };

  const handleAddReviewService = (serviceName: string) => {
    const catalogService = catalogServices.find(
      (service) => service.name === serviceName,
    );
    setReviewServices((prev) =>
      prev.some((item) => item.name === serviceName)
        ? prev
        : [
            ...prev,
            {
              name: serviceName,
              price: String(catalogService?.base_price || 0),
            },
          ],
    );

    setServiceSearch("");

    setServicePickerOpen(false);
  };

  const handleReviewServicePriceChange = (
    serviceName: string,
    price: string,
  ) => {
    const normalizedPrice = price.replace(/[^\d]/g, "");

    setReviewServices((prev) =>
      prev.map((item) =>
        item.name === serviceName ? { ...item, price: normalizedPrice } : item,
      ),
    );
  };

  const isStoredReviewService = (serviceName: string) =>
    Boolean(
      activeReviewVehicle &&
      parseStoredReviewServices(activeReviewVehicle.servicios).some(
        (service) => service.name === serviceName,
      ),
    );

  const handleRemoveReviewService = (serviceName: string) => {
    if (isMechanicSession && isStoredReviewService(serviceName)) {
      showNotification(
        "error",
        "El mecánico no puede eliminar servicios ya ingresados",
      );
      return;
    }

    setReviewServices((prev) =>
      prev.filter((item) => item.name !== serviceName),
    );
  };

  const handleAddReviewPart = (item: (typeof inventoryItems)[number]) => {
    if (item.stock <= 0) {
      showNotification(
        "error",
        `Este ${item.item_type === "insumo" ? "insumo" : "repuesto"} no tiene stock disponible`,
      );
      return;
    }

    setReviewParts((prev) => {
      const existing = prev.find((part) => part.inventoryItemId === item.id);
      const savedQuantity =
        parseStoredReviewParts(
          vehicles.find((vehicle) => vehicle.id === reviewVehicleId)?.servicios,
        ).find((part) => part.inventoryItemId === item.id)?.quantity || 0;
      const availableQuantity = item.stock + savedQuantity;
      if (existing) {
        if (existing.quantity >= availableQuantity) {
          showNotification(
            "error",
            "No hay mas stock disponible para este repuesto",
          );
          return prev;
        }
        return prev.map((part) =>
          part.inventoryItemId === item.id
            ? { ...part, quantity: part.quantity + 1 }
            : part,
        );
      }

      return [
        ...prev,
        {
          inventoryItemId: item.id,
          itemType: item.item_type === "insumo" ? "insumo" : "repuesto",
          name: item.name,
          sku: item.sku,
          quantity: 1,
          unit: item.unit || "unidad",
          unitCost: canEditPrices ? item.cost || 0 : 0,
          location: item.location,
        },
      ];
    });
    setPartSearch("");
    setPartPickerOpen(false);
  };

  const openInventoryPicker = (type: "repuesto" | "insumo") => {
    setInventoryPickerType(type);
    setPartSearch("");
    setPartPickerOpen((prev) => (inventoryPickerType === type ? !prev : true));
  };

  const handleReviewPartQuantityChange = (
    inventoryItemId: string,
    quantity: number,
  ) => {
    const inventoryItem = inventoryItems.find(
      (item) => item.id === inventoryItemId,
    );
    const nextQuantity = Math.max(1, quantity || 1);
    const savedQuantity =
      parseStoredReviewParts(
        vehicles.find((vehicle) => vehicle.id === reviewVehicleId)?.servicios,
      ).find((part) => part.inventoryItemId === inventoryItemId)?.quantity || 0;
    if (inventoryItem && nextQuantity > inventoryItem.stock + savedQuantity) {
      showNotification("error", "La cantidad supera el stock disponible");
      return;
    }
    setReviewParts((prev) =>
      prev.map((part) =>
        part.inventoryItemId === inventoryItemId
          ? { ...part, quantity: nextQuantity }
          : part,
      ),
    );
  };

  const handleReviewPartUnitCostChange = (
    inventoryItemId: string,
    unitCost: string,
  ) => {
    const normalizedCost = unitCost.replace(/[^\d]/g, "");
    setReviewParts((prev) =>
      prev.map((part) =>
        part.inventoryItemId === inventoryItemId
          ? { ...part, unitCost: parseInt(normalizedCost, 10) || 0 }
          : part,
      ),
    );
  };

  const handleRemoveReviewPart = (inventoryItemId: string) => {
    setReviewParts((prev) =>
      prev.filter((part) => part.inventoryItemId !== inventoryItemId),
    );
  };

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

  const handleSaveReview = async (statusOverride?: Vehicle["estado"]) => {
    if (statusOverride === "Entregado" && !canSendToSalida) {
      showNotification("error", "Tu perfil no puede enviar vehículos a salida");
      return;
    }

    const vehicle = vehicles.find((item) => item.id === reviewVehicleId);

    if (!vehicle) {
      showNotification("error", "Selecciona un vehículo para actualizar");

      return;
    }

    const savedParts = parseStoredReviewParts(vehicle.servicios);
    const partDeltas = reviewParts.map((part) => {
      const previousQuantity =
        savedParts.find(
          (savedPart) => savedPart.inventoryItemId === part.inventoryItemId,
        )?.quantity || 0;
      return {
        inventoryItemId: part.inventoryItemId,
        delta: part.quantity - previousQuantity,
      };
    });
    savedParts.forEach((savedPart) => {
      if (
        !reviewParts.some(
          (part) => part.inventoryItemId === savedPart.inventoryItemId,
        )
      ) {
        partDeltas.push({
          inventoryItemId: savedPart.inventoryItemId,
          delta: -savedPart.quantity,
        });
      }
    });

    const missingStock = partDeltas.find((partDelta) => {
      if (partDelta.delta <= 0) {
        return false;
      }
      const inventoryItem = inventoryItems.find(
        (item) => item.id === partDelta.inventoryItemId,
      );
      return !inventoryItem || inventoryItem.stock < partDelta.delta;
    });

    if (missingStock) {
      const inventoryItem = inventoryItems.find(
        (item) => item.id === missingStock.inventoryItemId,
      );
      showNotification(
        "error",
        inventoryItem
          ? `Stock insuficiente para ${inventoryItem.name}`
          : "Uno de los repuestos ya no existe en inventario",
      );
      return;
    }

    try {
      await updateVehicleRecord(
        vehicle,

        {
          estado: statusOverride || vehicle.estado,
          fecha_salida_confirmada:
            statusOverride === "Entregado"
              ? vehicle.fecha_salida_confirmada || new Date().toISOString()
              : vehicle.fecha_salida_confirmada || null,

          servicios: [
            ...reviewServices.map(serializeReviewService),
            ...reviewParts.map(serializeReviewPart),
          ],

          observaciones: reviewNotes,
        },

        statusOverride ? "vehículo enviado a salida" : "Servicios guardados",
      );

      setInventoryItems((prev) =>
        prev.map((item) => {
          const partDelta = partDeltas.find(
            (delta) => delta.inventoryItemId === item.id,
          );
          if (!partDelta || partDelta.delta === 0) {
            return item;
          }
          return {
            ...item,
            stock: item.stock - partDelta.delta,
            updated_at: new Date().toISOString(),
          };
        }),
      );

      await Promise.all(
        partDeltas
          .filter((partDelta) => partDelta.delta !== 0)
          .map((partDelta) => {
            const inventoryItem = inventoryItems.find(
              (item) => item.id === partDelta.inventoryItemId,
            );
            if (!inventoryItem) {
              return Promise.resolve();
            }
            return updateInventoryItem(inventoryItem.id, {
              ...inventoryItem,
              stock: inventoryItem.stock - partDelta.delta,
            });
          }),
      );

      logAction(
        statusOverride === "Entregado" ? "Enviado a salida" : "Taller guardado",
        "En Taller",
        `${vehicle.patente} - ${reviewServices.length} servicio(s), ${reviewParts.length} item(s) de inventario`,
      );

      if (statusOverride === "Entregado") {
        setVehicleTab(canAccessSalida ? "salida" : "taller");
      }
    } catch (error) {
      console.error("Review update failed", error);

      showNotification(
        "error",
        getFriendlyApiError(error, "No se pudo actualizar el vehículo"),
      );
    }
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

  const performReturnFromTaller = async (vehicle: Vehicle) => {
    try {
      await updateVehicleRecord(
        vehicle,
        { estado: "Ingresado" },
        "Vehículo devuelto a ingreso",
      );

      if (reviewVehicleId === vehicle.id) {
        setReviewVehicleId(null);
        setReviewServices([]);
        setReviewParts([]);
        setReviewNotes("");
      }

      logAction(
        "Devuelto a ingreso",
        "En Taller",
        `${vehicle.patente} fue devuelto a ingreso`,
      );
    } catch (error) {
      console.error("Return from workshop failed", error);
      showNotification("error", "No se pudo devolver el vehículo");
    }
  };

  const handleReturnFromTaller = (vehicle: Vehicle) => {
    requestConfirmation({
      title: "Devolver a ingreso",
      message: `El vehículo ${vehicle.patente} volverá al ingreso y saldrá del listado En Taller.`,
      confirmLabel: "Devolver",
      variant: "warning",
      onConfirm: () => performReturnFromTaller(vehicle),
    });
  };

  const performVehicleReady = async (vehicle: Vehicle) => {
    setReadyVehicleIds((prev) =>
      prev.includes(vehicle.id) ? prev : [...prev, vehicle.id],
    );

    try {
      await updateVehicleRecord(
        vehicle,
        {
          salida_confirmada: true,
          fecha_salida_confirmada: new Date().toISOString(),
          en_estacionamiento_manual: false,
        },
        `Vehículo ${vehicle.patente} listo`,
      );

      setManualParkingIds((prev) => prev.filter((id) => id !== vehicle.id));

      setTimeout(() => {
        setHiddenSalidaIds((prev) =>
          prev.includes(vehicle.id) ? prev : [...prev, vehicle.id],
        );

        showNotification("success", `vehículo ${vehicle.patente} listo`);

        setVehicleTab("ingreso");
      }, 400);
    } catch (error) {
      setReadyVehicleIds((prev) => prev.filter((id) => id !== vehicle.id));
      console.error("Vehicle ready failed", error);
      showNotification("error", "No se pudo marcar el vehículo como listo");
    }
  };

  const handleVehicleReady = (vehicle: Vehicle) => {
    const hasServicesWithoutValue = parseStoredReviewServices(
      vehicle.servicios,
    ).some((service) => (parseInt(service.price || "0", 10) || 0) <= 0);
    const hasItemsWithoutValue = parseStoredReviewParts(vehicle.servicios).some(
      (part) => (part.unitCost || 0) <= 0,
    );

    if (hasServicesWithoutValue || hasItemsWithoutValue) {
      showNotification(
        "error",
        "Completa los valores de todos los servicios, repuestos e insumos antes de marcar el vehículo listo",
      );
      return;
    }

    requestConfirmation({
      title: "Marcar vehículo listo",
      message: `El vehículo ${vehicle.patente} se ocultará de salida y quedará marcado como listo.`,
      confirmLabel: "Marcar listo",
      variant: "info",
      onConfirm: () => performVehicleReady(vehicle),
    });
  };

  const performReturnToTallerFromSalida = async (vehicle: Vehicle) => {
    try {
      await updateVehicleRecord(
        vehicle,
        {
          estado: "En Taller",
          salida_confirmada: false,
          fecha_salida_confirmada: null,
          en_estacionamiento_manual: false,
        },
        `Vehículo ${vehicle.patente} devuelto a En Taller`,
      );
      if (authToken && sessionRole === "member") {
        await deleteParkingRelease(vehicle.id).catch((error) => {
          if ((error as Error & { status?: number }).status !== 404) {
            throw error;
          }
        });
      }

      setReadyVehicleIds((prev) => prev.filter((id) => id !== vehicle.id));
      setHiddenSalidaIds((prev) => prev.filter((id) => id !== vehicle.id));
      setManualParkingIds((prev) => prev.filter((id) => id !== vehicle.id));
      setReleasedParkingIds((prev) => prev.filter((id) => id !== vehicle.id));
      setVehicleTab("taller");
      handleReviewSelect(vehicle);

      logAction(
        "Devuelto a En Taller",
        "Salida",
        `${vehicle.patente} fue devuelto desde Salida para agregar mas trabajos, repuestos o insumos`,
      );
    } catch (error) {
      console.error("Return to workshop from salida failed", error);
      showNotification("error", "No se pudo devolver el vehículo a En Taller");
    }
  };

  const handleReturnToTallerFromSalida = (vehicle: Vehicle) => {
    requestConfirmation({
      title: "Devolver a Taller",
      message: `El vehículo ${vehicle.patente} volverá a En Taller con sus servicios, repuestos, insumos y observaciones actuales para seguir editando el trabajo.`,
      confirmLabel: "Devolver a Taller",
      variant: "warning",
      onConfirm: () => performReturnToTallerFromSalida(vehicle),
    });
  };

  const handleSaveExitPricing = async (
    vehicle: Vehicle,
    services: ReviewServiceItem[],
    parts: ReviewPartItem[],
  ) => {
    try {
      await updateVehicleRecord(
        vehicle,
        {
          servicios: [
            ...services.map(serializeReviewService),
            ...parts.map(serializeReviewPart),
          ],
        },
        `Valores de ${vehicle.patente} actualizados en Salida`,
      );
      logAction(
        "Valores actualizados",
        "Salida",
        `${vehicle.patente} - ${services.length} servicio(s), ${parts.length} item(s) valorizados`,
      );
      showNotification("success", "Valores de la atención guardados");
    } catch (error) {
      console.error("Exit pricing update failed", error);
      showNotification("error", "No se pudieron guardar los valores");
      throw error;
    }
  };

  const handleNotify = (vehicle: Vehicle) => {
    const contact = vehicle.customer_phone || "cliente";

    showNotification("success", `Aviso enviado a ${contact}`);
  };

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

  const mechanicOptions = workshopUsers
    .filter((user) => user.role === "Mecánico" || user.role_name === "Mecánico")
    .map((user) => ({ id: user.id, name: user.name }));

  // const handleEdit = (vehicle: Vehicle) => {

  //   setEditingVehicle(vehicle);

  //   window.scrollTo({ top: 0, behavior: 'smooth' });
  // };

  const vehiclesEnTaller = vehicles.filter(
    (vehicle) => vehicle.estado === "Ingresado",
  );

  const vehiclesEntaller = vehicles.filter(
    (vehicle) => vehicle.estado === "En Taller",
  );

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

  const parkedVehicles = vehiclesEntregados.filter(
    (vehicle) =>
      (getParkingDays(vehicle) > 7 ||
        manualParkingIds.includes(vehicle.id) ||
        vehicle.en_estacionamiento_manual) &&
      !releasedParkingIds.includes(vehicle.id),
  );

  const vehiclesEnSalida = vehiclesEntregados.filter(
    (vehicle) =>
      !hiddenSalidaIds.includes(vehicle.id) &&
      !vehicle.salida_confirmada &&
      !vehicle.en_estacionamiento_manual &&
      !manualParkingIds.includes(vehicle.id),
  );

  const isParkingNotificationDay = [1, 4].includes(new Date().getDay());

  const getVehicleWorkElapsedSeconds = (vehicle: Vehicle) => {
    const accumulated = Math.max(0, Number(vehicle.work_elapsed_seconds) || 0);
    if (!vehicle.work_timer_started_at) {
      return accumulated;
    }
    const startedAt = new Date(vehicle.work_timer_started_at).getTime();
    if (Number.isNaN(startedAt)) {
      return accumulated;
    }
    return (
      accumulated + Math.max(0, Math.floor((workClockNow - startedAt) / 1000))
    );
  };

  const formatVehicleWorkTime = (vehicle: Vehicle) => {
    const totalMinutes = Math.floor(getVehicleWorkElapsedSeconds(vehicle) / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} h ${minutes.toString().padStart(2, "0")} min`;
  };

  const formatPromisedDeliveryDate = (value?: string | null) => {
    if (!value) {
      return "Sin fecha";
    }
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return "Sin fecha";
    }
    return date.toLocaleDateString("es-CL");
  };

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

  const reviewServiceTotal = reviewServices.reduce(
    (sum, service) => sum + (parseInt(service.price || "0", 10) || 0),
    0,
  );

  const reviewPartTotal = reviewParts
    .filter((part) => part.itemType !== "insumo")
    .reduce((sum, part) => sum + part.quantity * (part.unitCost || 0), 0);

  const reviewSupplyTotal = reviewParts
    .filter((part) => part.itemType === "insumo")
    .reduce((sum, part) => sum + part.quantity * (part.unitCost || 0), 0);

  const reviewAttentionTotal =
    reviewServiceTotal + reviewPartTotal + reviewSupplyTotal;

  const auditFromTime = auditDateFrom
    ? new Date(`${auditDateFrom}T00:00:00`).getTime()
    : null;
  const auditToTime = auditDateTo
    ? new Date(`${auditDateTo}T23:59:59.999`).getTime()
    : null;
  const filteredAuditLogs = auditLogs.filter((entry) => {
    const createdTime = new Date(entry.created_at).getTime();
    if (Number.isNaN(createdTime)) {
      return false;
    }
    if (auditFromTime !== null && createdTime < auditFromTime) {
      return false;
    }
    if (auditToTime !== null && createdTime > auditToTime) {
      return false;
    }
    return true;
  });
  const auditTotalPages = Math.max(
    1,
    Math.ceil(filteredAuditLogs.length / auditLogsPageSize),
  );
  const auditCurrentPage = Math.min(auditPage, auditTotalPages);
  const auditStartIndex = (auditCurrentPage - 1) * auditLogsPageSize;
  const paginatedAuditLogs = filteredAuditLogs.slice(
    auditStartIndex,
    auditStartIndex + auditLogsPageSize,
  );
  const auditVisibleFrom =
    filteredAuditLogs.length === 0 ? 0 : auditStartIndex + 1;
  const auditVisibleTo = Math.min(
    auditStartIndex + auditLogsPageSize,
    filteredAuditLogs.length,
  );


  const performSendToParking = async (vehicle: Vehicle) => {
    try {
      await updateVehicleRecord(
        vehicle,
        {
          estado: "Entregado",
          en_estacionamiento_manual: true,
          fecha_salida_confirmada:
            vehicle.fecha_salida_confirmada || new Date().toISOString(),
        },
        "Vehículo enviado a estacionamiento",
      );
      if (authToken && sessionRole === "member") {
        await deleteParkingRelease(vehicle.id).catch((error) => {
          if ((error as Error & { status?: number }).status !== 404) {
            throw error;
          }
        });
      }
    } catch (error) {
      console.error("Send to parking failed", error);
      showNotification("error", "No se pudo guardar el estacionamiento");
      return;
    }

    setManualParkingIds((prev) =>
      prev.includes(vehicle.id) ? prev : [...prev, vehicle.id],
    );
    setHiddenSalidaIds((prev) =>
      prev.includes(vehicle.id) ? prev : [...prev, vehicle.id],
    );
    setReleasedParkingIds((prev) => prev.filter((id) => id !== vehicle.id));
    logAction(
      "Enviado a estacionamiento",
      "Salida",
      `${vehicle.patente} fue enviado manualmente a estacionamiento`,
    );
  };

  const handleSendToParking = (vehicle: Vehicle) => {
    requestConfirmation({
      title: "Pasar a estacionamiento",
      message: `El vehículo ${vehicle.patente} se moverá desde Salida al módulo Estacionamiento.`,
      confirmLabel: "Pasar a estacionamiento",
      variant: "danger",
      onConfirm: () => performSendToParking(vehicle),
    });
  };

  const activeReviewVehicle =
    vehicles.find((vehicle) => vehicle.id === reviewVehicleId) ||
    vehiclesEntaller[0] ||
    null;

  const filteredServiceCatalog = catalogServices
    .filter((service) => service.active !== false)
    .filter((service) => {
      const normalizedSearch = serviceSearch.toLowerCase();
      const matchesSearch =
        service.name.toLowerCase().includes(normalizedSearch) ||
        service.category.toLowerCase().includes(normalizedSearch);
      const alreadySelected = reviewServices.some(
        (item) => item.name === service.name,
      );
      return matchesSearch && !alreadySelected;
    });

  const filteredServiceCatalogByCategory = filteredServiceCatalog.reduce<
    Array<{ category: string; services: CatalogService[] }>
  >((groups, service) => {
    const existingGroup = groups.find(
      (group) => group.category === service.category,
    );
    if (existingGroup) {
      existingGroup.services.push(service);
      return groups;
    }
    return [...groups, { category: service.category, services: [service] }];
  }, []);

  const filteredInventoryParts = inventoryItems.filter((item) => {
    const normalizedSearch = partSearch.toLowerCase();
    const itemType = item.item_type === "insumo" ? "insumo" : "repuesto";
    return (
      itemType === inventoryPickerType &&
      (item.name.toLowerCase().includes(normalizedSearch) ||
        item.category.toLowerCase().includes(normalizedSearch) ||
        item.sku.toLowerCase().includes(normalizedSearch) ||
        item.barcode.toLowerCase().includes(normalizedSearch) ||
        item.location.toLowerCase().includes(normalizedSearch))
    );
  });

  useEffect(() => {
    if (!reviewVehicleId && vehiclesEntaller.length > 0) {
      handleReviewSelect(vehiclesEntaller[0]);
    }
  }, [reviewVehicleId, vehiclesEntaller]);

  const notifications = [
    lowStockItems.length > 0
      ? {
          id: "stock",

          title: "Stock bajo",

          body: `${lowStockItems.length} insumos bajo mínimo.`,

          time: "Hoy",
        }
      : null,

    vehiclesEntaller.length > 0
      ? {
          id: "taller",

          title: "Vehículos En Taller",

          body: `${vehiclesEntaller.length} trabajos en curso.`,

          time: "Hoy",
        }
      : null,

    parkedVehicles.length > 0 && isParkingNotificationDay
      ? {
          id: "parking",

          title: "Estacionamiento",

          body: `${parkedVehicles.length} vehículo(s) llevan más de 1 semana.`,

          time: "Hoy",
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string;
    title: string;
    body: string;
    time: string;
  }>;

  if (!authToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
              <img
                src={mechanicProLogo}
                alt="Mechanic Pro"
                className="h-full w-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Mechanic Pro</h1>
            <p className="mt-1 text-sm text-gray-500">
              Acceso al sistema de taller.
            </p>
          </div>

          {authError && (
            <div className="mt-4 rounded-lg border border-[#fc3d3c]/30 bg-[#fc3d3c]/10 px-4 py-3 text-sm text-[#b42318]">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Usuario
              </label>
              <input
                id="login-email"
                type="email"
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-[#0f4471] focus:outline-none"
                placeholder="usuario@taller.cl"
                autoComplete="username"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Contraseña
              </label>
              <input
                id="login-password"
                type="password"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-[#0f4471] focus:outline-none"
                placeholder="Contraseña"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full rounded-lg btn-primary px-4 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {loginLoading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="mt-3 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {demoLoading ? "Preparando acceso..." : "Entrar con demo"}
          </button>

          <div className="mt-5 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-600">
            <p className="font-semibold text-gray-800">Acceso administrador</p>
            <p>Usuario: demo@local</p>
            <p>Contraseña: demo1234</p>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionRole) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <p className="text-gray-500">Cargando Sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        isOpen={sidebarOpen}
        isDesktopOpen={desktopSidebarOpen}
        hiddenSections={isMechanicSession ? mechanicHiddenSections : []}
        onClose={() => setSidebarOpen(false)}
      />

      <div
        className={`transition-[margin] duration-300 ${
          desktopSidebarOpen ? "lg:ml-64" : "lg:ml-0"
        }`}
      >
        <Header
          onMenuClick={handleSidebarToggle}
          notifications={notifications}
          onLogout={handleLogout}
          userName={sessionUser?.name || "Usuario general"}
          userRole={sessionUser?.role || "acceso general"}
        />

        <Toast notification={notification} onClose={clearNotification} />
        <ConfirmDialog
          open={Boolean(confirmDialog)}
          title={confirmDialog?.title || ""}
          message={confirmDialog?.message || ""}
          confirmLabel={confirmDialog?.confirmLabel}
          cancelLabel={confirmDialog?.cancelLabel}
          variant={confirmDialog?.variant}
          onConfirm={handleConfirmDialog}
          onCancel={() => setConfirmDialog(null)}
        />

        <main className="p-4 sm:p-6 lg:p-8">
          {activeSection === "vehiculos" && (
            <>
              <div className="sticky top-4 z-20 mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  {[
                    { id: "ingreso", label: "Ingreso de vehículos" },

                    { id: "taller", label: "En Taller" },

                    { id: "salida", label: "Salida vehículos" },
                  ]
                    .filter((tab) => !isMechanicSession || tab.id === "taller")
                    .filter((tab) => canAccessSalida || tab.id !== "salida")
                    .map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() =>
                          setVehicleTab(tab.id as typeof vehicleTab)
                        }
                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                          vehicleTab === tab.id
                            ? "bg-[#0f4471] text-white shadow-sm hover:bg-[#0b365c]"
                            : "border border-[#0f4471]/30 text-[#0f4471] hover:bg-[#0f4471]/10"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}

                  {vehicleTab === "ingreso" && (
                    <div className="flex flex-wrap gap-3 lg:ml-auto">
                      <button
                        type="button"
                        onClick={() =>
                          requestConfirmation({
                            title: "Limpiar formulario",
                            message:
                              "Se borrarán los datos cargados del ingreso de vehículo actual.",
                            confirmLabel: "Limpiar formulario",
                            variant: "danger",
                            onConfirm: () => {
                              window.dispatchEvent(
                                new Event("vehicle-form-clear"),
                              );
                            },
                          })
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fc3d3c] px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#df2f2f] focus:ring-4 focus:ring-[#fc3d3c]/20"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Limpiar formulario
                      </button>
                      <button
                        type="submit"
                        form="vehicle-entry-form"
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-green-700 focus:ring-4 focus:ring-green-200"
                      >
                        <Send className="h-4 w-4" />
                        Ingresar Vehículo
                      </button>
                    </div>
                  )}
                  {vehicleTab === "taller" && (
                    <div className="flex flex-wrap gap-3 lg:ml-auto">
                      <button
                        type="button"
                        onClick={handleClearReviewRecord}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fc3d3c] px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#df2f2f] focus:ring-4 focus:ring-[#fc3d3c]/20"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Limpiar registro
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {vehicleTab === "ingreso" && (
                <>
                  <div className="mb-8">
                    <VehicleForm
                      onSubmit={handleSubmit}
                      editingVehicle={editingVehicle}
                      onCancelEdit={() => setEditingVehicle(null)}
                      existingVehicles={vehicles}
                      mechanics={mechanicOptions}
                      canManageAdvance={isSessionAdmin}
                      serviceCatalog={catalogServices.filter(
                        (service) => service.active !== false,
                      )}
                    />
                  </div>

                  <div className="hidden">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      vehículos en taller
                    </h3>

                    {vehiclesEnTaller.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No hay vehículos en taller.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {vehiclesEnTaller.map((vehicle) => (
                          <div
                            key={vehicle.id}
                            className="flex flex-col gap-3 rounded-lg border border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="text-sm font-semibold text-gray-900 uppercase">
                                {vehicle.patente}
                              </p>

                              <p className="text-sm text-gray-500">
                                {vehicle.marca} {vehicle.modelo} ·{" "}
                                {vehicle.customer_name || "Sin cliente"}
                              </p>
                            </div>

                            <button
                              onClick={() => handleSendToTaller(vehicle)}
                              className="rounded-lg btn-primary px-4 py-2 text-sm font-semibold"
                            >
                              Enviar a En Taller
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {vehicleTab === "taller" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <h3 className="text-2xl font-bold text-gray-900">
                        Vehículos en Taller
                      </h3>

                      <span className="text-xs text-gray-500">
                        {vehiclesEntaller.length} activos
                      </span>
                    </div>

                    {vehiclesEntaller.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No hay vehículos En Taller.
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-1">
                        {vehiclesEntaller.map((vehicle) => (
                          <div
                            key={vehicle.id}
                            className={`rounded-lg border px-4 py-3 transition-colors ${
                              reviewVehicleId === vehicle.id
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleReviewSelect(vehicle)}
                              className="w-full text-left"
                            >
                              <p className="text-sm font-semibold text-gray-900 uppercase">
                                {vehicle.patente}
                              </p>

                              <p className="text-xs text-gray-500">
                                {vehicle.marca} {vehicle.modelo} ·{" "}
                                {vehicle.customer_name || "Sin cliente"}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-blue-800">
                                Mecánico:{" "}
                                {vehicle.assigned_mechanic_name ||
                                  "Sin asignar"}
                              </p>

                              <p className="mt-2 text-xs font-semibold text-gray-500">
                                Sigue En Taller hasta pasar a salida
                              </p>
                              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                                <span>
                                  Prioridad:{" "}
                                  <strong>
                                    {vehicle.attention_priority || "Normal"}
                                  </strong>
                                </span>
                                <span>
                                  Plan:{" "}
                                  <strong>
                                    {Number(vehicle.estimated_work_hours) || 0}{" "}
                                    h
                                  </strong>
                                </span>
                                <span>
                                  Entrega:{" "}
                                  <strong>
                                    {formatPromisedDeliveryDate(
                                      vehicle.promised_delivery_date,
                                    )}
                                  </strong>
                                </span>
                              </div>
                            </button>
                            <div className="mt-3 flex flex-col items-end gap-2">
                              <div className="flex items-center gap-2 text-right">
                                <Clock className="h-4 w-4 text-[#0f4471]" />
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                    Tiempo de trabajo
                                  </p>
                                  <p className="text-sm font-bold text-[#0f4471]">
                                    {formatVehicleWorkTime(vehicle)}
                                  </p>
                                </div>
                              </div>
                              {!isMechanicSession && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleReturnFromTaller(vehicle)
                                  }
                                  className="rounded-md border border-[#fc3d3c]/30 px-2.5 py-1.5 text-xs font-semibold text-[#b42318] hover:bg-[#fc3d3c]/10"
                                  title="Devolver a ingreso"
                                >
                                  Devolver
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm lg:col-span-2">
                    {activeReviewVehicle ? (
                      <>
                        <div className="mb-4 flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              Servicios realizados
                            </h3>

                            <p className="text-sm text-gray-500">
                              Busca procedimientos, agrégalos con valor y guarda
                              el trabajo ejecutado.
                            </p>
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                              type="button"
                              onClick={() =>
                                setServicePickerOpen((prev) => !prev)
                              }
                              className="rounded-lg bg-[#0f4471] px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0b365c]"
                            >
                              {servicePickerOpen
                                ? "Cerrar buscador"
                                : "Buscar servicios"}
                            </button>
                            <button
                              type="button"
                              onClick={() => openInventoryPicker("repuesto")}
                              className="rounded-lg bg-[#0f4471] px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0b365c]"
                            >
                              {partPickerOpen &&
                              inventoryPickerType === "repuesto"
                                ? "Cerrar repuestos"
                                : "Buscar repuestos"}
                            </button>
                            <button
                              type="button"
                              onClick={() => openInventoryPicker("insumo")}
                              className="rounded-lg bg-[#0f4471] px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0b365c]"
                            >
                              {partPickerOpen &&
                              inventoryPickerType === "insumo"
                                ? "Cerrar insumos"
                                : "Buscar insumos"}
                            </button>
                          </div>
                        </div>

                        <div className="relative mb-6">
                          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <div className="relative">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                              <input
                                value={serviceSearch}
                                onFocus={() => setServicePickerOpen(true)}
                                onChange={(event) => {
                                  setServiceSearch(event.target.value);

                                  setServicePickerOpen(true);
                                }}
                                className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
                                placeholder="Buscar procedimiento o sistema..."
                              />
                            </div>

                            {servicePickerOpen && (
                              <div className="mt-3 rounded-xl border border-gray-200 bg-white shadow-lg">
                                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Catálogo de procedimientos
                                  </p>

                                  <button
                                    type="button"
                                    onClick={() => setServicePickerOpen(false)}
                                    className="rounded p-1 text-gray-500 hover:bg-gray-100"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>

                                <div className="max-h-72 overflow-y-auto p-2">
                                  {filteredServiceCatalog.length === 0 ? (
                                    <p className="px-3 py-2 text-sm text-gray-500">
                                      No hay servicios disponibles con esa
                                      búsqueda.
                                    </p>
                                  ) : (
                                    filteredServiceCatalogByCategory.map(
                                      (group) => (
                                        <div
                                          key={group.category}
                                          className="py-1"
                                        >
                                          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            {group.category}
                                          </p>
                                          {group.services.map((service) => (
                                            <button
                                              key={service.name}
                                              type="button"
                                              onClick={() =>
                                                handleAddReviewService(
                                                  service.name,
                                                )
                                              }
                                              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
                                            >
                                              <span>{service.name}</span>
                                              <span className="text-xs font-semibold text-blue-600">
                                                Agregar
                                              </span>
                                            </button>
                                          ))}
                                        </div>
                                      ),
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {partPickerOpen && (
                          <div className="relative mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <div className="relative">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                              <input
                                value={partSearch}
                                onChange={(event) =>
                                  setPartSearch(event.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
                                placeholder={`Buscar ${inventoryPickerType === "insumo" ? "insumo" : "repuesto"} por nombre, SKU, código o ubicación...`}
                              />
                            </div>

                            <div className="mt-3 rounded-xl border border-gray-200 bg-white shadow-lg">
                              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  {inventoryPickerType === "insumo"
                                    ? "Insumos en inventario"
                                    : "Repuestos en inventario"}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setPartPickerOpen(false)}
                                  className="rounded p-1 text-gray-500 hover:bg-gray-100"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="max-h-72 overflow-y-auto p-2">
                                {filteredInventoryParts.length === 0 ? (
                                  <p className="px-3 py-2 text-sm text-gray-500">
                                    No hay{" "}
                                    {inventoryPickerType === "insumo"
                                      ? "insumos"
                                      : "repuestos"}{" "}
                                    disponibles con esa busqueda.
                                  </p>
                                ) : (
                                  filteredInventoryParts.map((item) => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => handleAddReviewPart(item)}
                                      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
                                    >
                                      <span>
                                        <span className="block font-semibold text-gray-900">
                                          {item.name}
                                        </span>
                                        <span
                                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                            item.item_type === "insumo"
                                              ? "bg-emerald-50 text-emerald-700"
                                              : "bg-blue-50 text-blue-700"
                                          }`}
                                        >
                                          {item.item_type === "insumo"
                                            ? "Insumo"
                                            : "Repuesto"}
                                        </span>
                                        <span className="block text-xs text-gray-500">
                                          {item.category} · SKU:{" "}
                                          {item.sku || "-"} · Bodega:{" "}
                                          {item.location || "-"}
                                        </span>
                                      </span>
                                      <span
                                        className={`text-xs font-semibold ${
                                          item.stock > 0
                                            ? "text-emerald-700"
                                            : "text-[#fc3d3c]"
                                        }`}
                                      >
                                        Stock {item.stock} {item.unit || ""}
                                      </span>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="mb-6 space-y-3">
                          {reviewServices.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-500">
                              No hay servicios seleccionados todavía.
                            </p>
                          ) : (
                            reviewServices.map((service) => (
                              <div
                                key={service.name}
                                className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 p-4 md:grid-cols-[minmax(0,1fr)_44px]"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {service.name}
                                  </p>

                                  <p className="text-xs text-gray-500">
                                    Servicio aplicable a sistemas automotrices.
                                  </p>
                                </div>

                                <div className="hidden">
                                  <div className="flex items-center justify-between gap-3">
                                    <h4 className="text-sm font-semibold text-gray-900">
                                      Repuestos e insumos utilizados
                                    </h4>
                                    <span className="text-xs text-gray-500">
                                      {reviewParts.length} seleccionado(s)
                                    </span>
                                  </div>

                                  {reviewParts.length === 0 ? (
                                    <p className="rounded-lg border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-500">
                                      No hay repuestos ni insumos seleccionados
                                      todavía.
                                    </p>
                                  ) : (
                                    reviewParts.map((part) => {
                                      const inventoryItem = inventoryItems.find(
                                        (item) =>
                                          item.id === part.inventoryItemId,
                                      );
                                      const savedQuantity =
                                        parseStoredReviewParts(
                                          activeReviewVehicle.servicios,
                                        ).find(
                                          (savedPart) =>
                                            savedPart.inventoryItemId ===
                                            part.inventoryItemId,
                                        )?.quantity || 0;
                                      const availableQuantity =
                                        (inventoryItem?.stock || 0) +
                                        savedQuantity;
                                      return (
                                        <div
                                          key={part.inventoryItemId}
                                          className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-[minmax(0,1fr)_140px_44px]"
                                        >
                                          <div>
                                            <p className="text-sm font-semibold text-gray-900">
                                              {part.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              SKU: {part.sku || "-"} · Bodega:{" "}
                                              {part.location || "-"} · Stock
                                              disponible: {availableQuantity}{" "}
                                              {part.unit}
                                            </p>
                                          </div>
                                          <div>
                                            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                                              Cantidad
                                            </label>
                                            <input
                                              type="number"
                                              min="1"
                                              max={Math.max(
                                                1,
                                                availableQuantity,
                                              )}
                                              value={part.quantity}
                                              onChange={(event) =>
                                                handleReviewPartQuantityChange(
                                                  part.inventoryItemId,
                                                  parseInt(
                                                    event.target.value,
                                                  ) || 1,
                                                )
                                              }
                                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                            />
                                          </div>
                                          <div className="flex items-end">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleRemoveReviewPart(
                                                  part.inventoryItemId,
                                                )
                                              }
                                              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#fc3d3c]/30 text-[#fc3d3c] hover:bg-[#fc3d3c]/10"
                                              title="Eliminar item"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>

                                <div className="flex items-end">
                                  {(!isMechanicSession ||
                                    !isStoredReviewService(service.name)) && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveReviewService(service.name)
                                      }
                                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#fc3d3c]/30 text-[#fc3d3c] hover:bg-[#fc3d3c]/10"
                                      title="Eliminar servicio"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <h4 className="text-sm font-semibold text-gray-900">
                              Repuestos e insumos utilizados
                            </h4>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600">
                              {reviewParts.length} seleccionado(s)
                            </span>
                          </div>

                          {reviewParts.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-5 text-sm text-gray-500">
                              No hay repuestos ni insumos seleccionados todavía.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {reviewParts.map((part) => {
                                const inventoryItem = inventoryItems.find(
                                  (item) => item.id === part.inventoryItemId,
                                );
                                const savedQuantity =
                                  parseStoredReviewParts(
                                    activeReviewVehicle.servicios,
                                  ).find(
                                    (savedPart) =>
                                      savedPart.inventoryItemId ===
                                      part.inventoryItemId,
                                  )?.quantity || 0;
                                const availableQuantity =
                                  (inventoryItem?.stock || 0) + savedQuantity;

                                return (
                                  <div
                                    key={part.inventoryItemId}
                                    className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_120px_44px]"
                                  >
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-semibold text-gray-900">
                                          {part.name}
                                        </p>
                                        <span
                                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                            part.itemType === "insumo"
                                              ? "bg-emerald-50 text-emerald-700"
                                              : "bg-blue-50 text-blue-700"
                                          }`}
                                        >
                                          {part.itemType === "insumo"
                                            ? "Insumo"
                                            : "Repuesto"}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-500">
                                        SKU: {part.sku || "-"} · Bodega:{" "}
                                        {part.location || "-"} · Stock
                                        disponible: {availableQuantity}{" "}
                                        {part.unit}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                                        Cantidad
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        max={Math.max(1, availableQuantity)}
                                        value={part.quantity}
                                        onChange={(event) =>
                                          handleReviewPartQuantityChange(
                                            part.inventoryItemId,
                                            parseInt(event.target.value, 10) ||
                                              1,
                                          )
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                      />
                                    </div>
                                    <div className="flex items-end">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveReviewPart(
                                            part.inventoryItemId,
                                          )
                                        }
                                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#fc3d3c]/30 text-[#fc3d3c] hover:bg-[#fc3d3c]/10"
                                        title="Eliminar item"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {canEditPrices && (
                          <div className="mb-6 rounded-xl border border-[#0f4471]/20 bg-white p-4 shadow-sm">
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold text-gray-900">
                                Valores de la atención
                              </h4>
                              <p className="mt-1 text-xs text-gray-500">
                                Completa los valores de servicios, repuestos e
                                insumos antes de finalizar.
                              </p>
                            </div>

                            {reviewServices.length === 0 &&
                            reviewParts.length === 0 ? (
                              <p className="rounded-lg border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-500">
                                Agrega servicios o items de inventario para
                                completar sus valores.
                              </p>
                            ) : (
                              <div className="divide-y divide-gray-200 rounded-lg border border-gray-200">
                                {reviewServices.map((service) => (
                                  <div
                                    key={`value-service-${service.name}`}
                                    className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center"
                                  >
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900">
                                        {service.name}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        Servicio
                                      </p>
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Valor
                                      </label>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={service.price}
                                        onChange={(event) =>
                                          handleReviewServicePriceChange(
                                            service.name,
                                            event.target.value,
                                          )
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                        placeholder="0"
                                      />
                                    </div>
                                  </div>
                                ))}

                                {reviewParts.map((part) => (
                                  <div
                                    key={`value-part-${part.inventoryItemId}`}
                                    className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center"
                                  >
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900">
                                        {part.name}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {part.itemType === "insumo"
                                          ? "Insumo"
                                          : "Repuesto"}{" "}
                                        · Cantidad {part.quantity}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Valor unitario
                                      </label>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={part.unitCost || ""}
                                        onChange={(event) =>
                                          handleReviewPartUnitCostChange(
                                            part.inventoryItemId,
                                            event.target.value,
                                          )
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                        placeholder="0"
                                      />
                                      <p className="mt-1 text-xs font-semibold text-gray-500">
                                        Subtotal: $
                                        {(
                                          part.quantity * (part.unitCost || 0)
                                        ).toLocaleString("es-CL")}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div>
                          {canEditPrices && (
                            <div className="mb-6 rounded-xl border border-[#0f4471]/20 bg-white p-4 shadow-sm">
                              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900">
                                    Resumen de atención
                                  </h4>
                                  <p className="text-xs text-gray-500">
                                    Total actualizado con servicios, repuestos e
                                    insumos seleccionados.
                                  </p>
                                </div>
                                <p className="text-2xl font-bold text-[#0f4471]">
                                  $
                                  {reviewAttentionTotal.toLocaleString("es-CL")}
                                </p>
                              </div>

                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Servicios
                                  </p>
                                  <p className="mt-1 text-lg font-bold text-gray-900">
                                    $
                                    {reviewServiceTotal.toLocaleString("es-CL")}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Repuestos
                                  </p>
                                  <p className="mt-1 text-lg font-bold text-gray-900">
                                    ${reviewPartTotal.toLocaleString("es-CL")}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Insumos
                                  </p>
                                  <p className="mt-1 text-lg font-bold text-gray-900">
                                    ${reviewSupplyTotal.toLocaleString("es-CL")}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                    Abono cliente
                                  </p>
                                  <p className="mt-1 text-lg font-bold text-emerald-800">
                                    $
                                    {(
                                      Number(
                                        activeReviewVehicle?.customer_advance,
                                      ) || 0
                                    ).toLocaleString("es-CL")}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-[#0f4471]/20 bg-[#0f4471]/5 px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-[#0f4471]">
                                    Saldo pendiente
                                  </p>
                                  <p className="mt-1 text-lg font-bold text-[#0f4471]">
                                    $
                                    {Math.max(
                                      0,
                                      reviewAttentionTotal -
                                        (Number(
                                          activeReviewVehicle?.customer_advance,
                                        ) || 0),
                                    ).toLocaleString("es-CL")}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Detalle del trabajo
                          </label>

                          <textarea
                            value={reviewNotes}
                            onChange={(event) =>
                              setReviewNotes(event.target.value)
                            }
                            rows={5}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                            placeholder="Describe el trabajo realizado..."
                          />
                        </div>

                        <div className="sticky bottom-4 z-10 mt-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
                          <button
                            onClick={() => handleSaveReview()}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            {canEditPrices
                              ? "Guardar selección"
                              : "Guardar trabajo"}
                          </button>

                          {canSendToSalida && (
                            <button
                              onClick={() =>
                                requestConfirmation({
                                  title: "Enviar a salida",
                                  message:
                                    "El vehículo pasará a Salida y se guardarán los servicios y repuestos registrados.",
                                  confirmLabel: "Enviar a salida",
                                  variant: "info",
                                  onConfirm: () =>
                                    handleSaveReview("Entregado"),
                                })
                              }
                              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-green-700 focus:ring-4 focus:ring-green-200"
                            >
                              Enviar a salida
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Envia un vehículo a En Taller para registrar servicios.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {vehicleTab === "salida" && (
                <div className="space-y-4">
                  {vehiclesEnSalida.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm text-sm text-gray-500">
                      No hay vehículos en salida.
                    </div>
                  ) : (
                    vehiclesEnSalida.map((vehicle) => (
                      <div
                        key={vehicle.id}
                        className={`bg-white rounded-xl border border-gray-200 p-6 shadow-sm fade-item ${
                          readyVehicleIds.includes(vehicle.id) ? "fade-out" : ""
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 uppercase">
                              {vehicle.patente}
                            </h3>

                            <p className="text-sm text-gray-500">
                              {vehicle.marca} {vehicle.modelo} ·{" "}
                              {vehicle.customer_name || "Sin cliente"}
                            </p>
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                              onClick={() => exportVehiclePdf(vehicle)}
                              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              Exportar PDF
                            </button>

                            <button
                              onClick={() =>
                                handleReturnToTallerFromSalida(vehicle)
                              }
                              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                            >
                              Devolver a Taller
                            </button>

                            <button
                              onClick={() => handleSendToParking(vehicle)}
                              className="rounded-lg bg-[#fc3d3c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#df2f2f]"
                            >
                              Pasar a estacionamiento
                            </button>

                            <button
                              onClick={() => handleVehicleReady(vehicle)}
                              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                            >
                              vehículo listo
                            </button>
                          </div>
                        </div>

                        {canEditPrices && (
                          <ExitPricingSection
                            vehicle={vehicle}
                            onSave={(services, parts) =>
                              handleSaveExitPricing(vehicle, services, parts)
                            }
                          />
                        )}

                        {isSessionAdmin && (
                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Total atención
                              </p>
                              <p className="mt-1 text-lg font-bold text-gray-900">
                                $
                                {getVehicleWorkTotal(vehicle).toLocaleString(
                                  "es-CL",
                                )}
                              </p>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Abono cliente
                              </p>
                              <p className="mt-1 text-lg font-bold text-green-700">
                                $
                                {(
                                  Number(vehicle.customer_advance) || 0
                                ).toLocaleString("es-CL")}
                              </p>
                            </div>
                            <div className="rounded-lg border border-[#0f4471]/20 bg-[#0f4471]/5 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Saldo pendiente
                              </p>
                              <p className="mt-1 text-lg font-bold text-[#0f4471]">
                                $
                                {Math.max(
                                  0,
                                  getVehicleWorkTotal(vehicle) -
                                    (Number(vehicle.customer_advance) || 0),
                                ).toLocaleString("es-CL")}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                          <div className="rounded-lg border border-gray-200 p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-500">
                              Cliente
                            </p>

                            <p className="text-sm font-semibold text-gray-900">
                              {vehicle.customer_name || "Sin cliente"}
                            </p>

                            <p className="text-xs text-gray-500">
                              {vehicle.customer_rut || "-"}
                            </p>

                            <p className="text-xs text-gray-500">
                              {vehicle.customer_phone || "-"}
                            </p>

                            <p className="text-xs text-gray-500">
                              {vehicle.customer_address || "-"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {vehicle.customer_city || "-"}
                            </p>
                          </div>

                          <div className="rounded-lg border border-gray-200 p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-500">
                              vehículo
                            </p>

                            <p className="text-sm text-gray-700">
                              {vehicle.tipo_vehiculo} · {vehicle.ano}
                            </p>

                            <p className="text-xs text-gray-500">
                              KM: {vehicle.kilometraje} · Combustible:{" "}
                              {vehicle.cantidad_combustible}%
                            </p>

                            <p className="text-xs text-gray-500">
                              Color ingreso: {vehicle.color || "-"}
                            </p>

                            <p className="text-xs text-gray-500">
                              Estado: {vehicle.estado}
                            </p>
                          </div>

                          <div className="rounded-lg border border-gray-200 p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-500">
                              Servicios
                            </p>

                            {parseStoredReviewServices(vehicle.servicios)
                              .length > 0 ? (
                              <ul className="text-xs text-gray-700 list-disc pl-4 mt-2 space-y-1">
                                {parseStoredReviewServices(
                                  vehicle.servicios,
                                ).map((service) => (
                                  <li key={service.name}>
                                    {serializeReviewService(service)}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-gray-500 mt-2">
                                Sin servicios registrados.
                              </p>
                            )}

                            <p className="mt-4 text-xs uppercase tracking-wide text-gray-500">
                              Repuestos
                            </p>

                            {parseStoredReviewParts(vehicle.servicios).length >
                            0 ? (
                              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-gray-700">
                                {parseStoredReviewParts(vehicle.servicios).map(
                                  (part) => (
                                    <li key={part.inventoryItemId}>
                                      {part.name} x{part.quantity} {part.unit}
                                    </li>
                                  ),
                                )}
                              </ul>
                            ) : (
                              <p className="mt-2 text-xs text-gray-500">
                                Sin repuestos registrados.
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 rounded-lg border border-gray-200 p-4">
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            Detalle del trabajo
                          </p>

                          <p className="text-sm text-gray-700 mt-2">
                            {vehicle.observaciones || "Sin observaciones."}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}

          {activeSection === "dashboard" && !isMechanicSession && (
            <DashboardPage vehicles={vehicles} canViewPrices={canViewPrices} />
          )}

          {activeSection === "inventario" && !isMechanicSession && (
            <InventoryPage
              inventoryItems={inventoryItems}
              setInventoryItems={setInventoryItems}
              showNotification={showNotification}
            />
          )}

          {activeSection === "presupuesto" && canAccessBudget && (
            <PresupuestoPage
              requestConfirmation={requestConfirmation}
              serviceCatalog={catalogServices.filter(
                (service) => service.active !== false,
              )}
            />
          )}

          {activeSection === "estacionamiento" && !isMechanicSession && (
            <EstacionamientoPage/>
          )}

          {activeSection === "reportes" && (
            <>
              {loading ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>

                  <p className="text-gray-500 mt-4">Cargando vehículos...</p>
                </div>
              ) : (
                <VehicleTable
                  vehicles={vehicles}
                  title="Reporte de vehículos"
                  showEdit={false}
                  showDelete={false}
                  onNotify={handleNotify}
                  onExportPdf={canViewPrices ? exportVehiclePdf : undefined}
                  pageSize={8}
                  enableDateFilter
                />
              )}
            </>
          )}

          {activeSection === "registro_acciones" && !isMechanicSession && (
            <RegistroPage
              isSessionAdmin={isSessionAdmin}
            />
          )}

          {activeSection === "configuracion" && !isMechanicSession && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
              <ConfiguracionPage />
              {isSessionAdmin && (
                <ServiceCatalogManager
                  categories={serviceCategories}
                  services={catalogServices}
                  onChanged={loadServiceCatalog}
                  onNotify={showNotification}
                  onAudit={(action, detail) =>
                    logAction(action, "Configuración", detail)
                  }
                />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
