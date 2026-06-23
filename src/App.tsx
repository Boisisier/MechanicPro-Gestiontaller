import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import {
  clearAuthToken,
  createBudget,
  createVehicle,
  createAuditLog,
  createParkingRelease,
  createWorkshopUser,
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
  deleteWorkshopUser,
  updateWorkshopUser,
  updateInventoryItem,
  updateVehicle,
} from "./lib/api";

import type {
  BudgetServiceItem,
  CatalogService,
  ReviewPartItem,
  ReviewServiceItem,
  InventoryItem,
  UserRole,
  Vehicle,
  WorkshopUser,
  AuditLog,
} from "./lib/types";

import Sidebar from "./components/layout/Sidebar";

import Header from "./components/layout/Header";

import MetricsCards from "./components/dashboard/MetricsCards";

import VehicleForm, {
  VehicleFormData,
} from "./components/vehicles/VehicleForm";

import VehicleTable from "./components/vehicles/VehicleTable";
import ExitPricingSection from "./components/vehicles/ExitPricingSection";
import ConfirmDialog from "./components/ui/ConfirmDialog";
import Toast from "./components/ui/Toast";

import {
  Search,
  Trash2,
  X,
  Plus,
  Calculator,
  RotateCcw,
  Send,
  Edit2,
  TrendingUp,
  History,
  Package,
  Wrench,
  Clock,
} from "lucide-react";

import { toSoftAccent } from "./utils/colors";

import {
  parseStoredReviewServices,
  parseStoredReviewParts,
  serializeReviewService,
  serializeReviewPart,
} from "./utils/reviewParsers";

import { exportVehiclePdf } from "./utils/html";

import {
  serviceCatalogByCategory,
  serviceCatalog,
} from "./features/vehicles/serviceCatalog";

import { useNotification } from "./hooks/useNotification";

import InventoryPage from "./features/inventory/InventoryPage";
import mechanicProLogo from "./assets/mechanic-pro-logo.png";

const roleModules: Record<UserRole, string[]> = {
  "Administrador de Taller": [
    "Dashboard",
    "Vehículos",
    "Presupuesto",
    "Inventario",
    "Reportes",
    "Configuración",
  ],
  Administrativo: ["Dashboard", "Vehículos", "Presupuesto", "Reportes"],
  "Mecánico": ["Vehículos", "Reportes"],
};

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

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const auditLogsPageSize = 15;

function App() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  const lowStockItems = inventoryItems.filter(
    (item) => item.minStock > 0 && item.stock <= item.minStock,
  );

  const { notification, showNotification, clearNotification } =
    useNotification();

  const [accentColor, setAccentColor] = useState(
    () => localStorage.getItem("accentColor") || "#0f4471",
  );

  const [activeSection, setActiveSection] = useState("vehiculos");

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

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

  const [userForm, setUserForm] = useState<{
    name: string;
    rut: string;
    email: string;
    password: string;
    role: UserRole;
  }>({
    name: "",
    rut: "",
    email: "",
    password: "",
    role: "Administrativo",
  });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [vehicleTab, setVehicleTab] = useState<
    "ingreso" | "taller" | "salida"
  >("ingreso");

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

  const [budgetForm, setBudgetForm] = useState({
    customerName: "",
    customerPhone: "",
    patente: "",
    vehicle: "",
    notes: "",
  });

  const [budgetService, setBudgetService] = useState({
    name: "",
    price: 0,
  });

  const [budgetItems, setBudgetItems] = useState<BudgetServiceItem[]>([]);

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

  const currentAuditUser =
    sessionUser
      ? {
          id: "session-user",
          name: sessionUser.name,
          email: sessionUser.email,
          role: sessionUser.role as UserRole,
        }
      : (workshopUsers.find((user) => user.role === "Administrador de Taller") ||
          workshopUsers[0]);

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
    if (
      isMechanicSession &&
      (activeSection === "dashboard" || activeSection === "presupuesto")
    ) {
      setActiveSection("vehiculos");
    }
  }, [activeSection, isMechanicSession]);

  useEffect(() => {
    if (!canAccessSalida && vehicleTab === "salida") {
      setVehicleTab("taller");
    }
  }, [canAccessSalida, vehicleTab]);

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
      } catch (error) {
        clearAuthToken();
        setAuthTokenState(null);
        setSessionRole(null);
        setSessionUser(null);
      }
    };
    loadSession();
  }, [authToken]);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accentColor);
    document.documentElement.style.setProperty(
      "--accent-soft",
      toSoftAccent(accentColor),
    );
    localStorage.setItem("accentColor", accentColor);
  }, [accentColor]);

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
    localStorage.setItem("releasedParkingIds", JSON.stringify(releasedParkingIds));
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
  }, [authToken, sessionRole]);

  useEffect(() => {
    if (!authToken || sessionRole !== "member") {
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
        setReleasedParkingIds(rows.map((item: { vehicle_id: string }) => item.vehicle_id)),
      )
      .catch((error) => console.error("Parking releases load failed", error));
  }, [authToken, sessionRole]);

  useEffect(() => {
    if (!authToken || sessionRole !== "member") {
      return;
    }

    getAuditLogs({
      date_from: auditDateFrom || undefined,
      date_to: auditDateTo || undefined,
    })
      .then((rows) => setAuditLogs(rows))
      .catch((error) => console.error("Audit logs load failed", error));
  }, [authToken, sessionRole, auditDateFrom, auditDateTo]);

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
      showNotification("success", "Sesion iniciada");
    } catch (error) {
      console.error("Login failed", error);
      setAuthError("Usuario o contrasena incorrectos");
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
      title: "Cerrar sesion",
      message: "Se cerrara la sesion actual y volveras a la pantalla de acceso.",
      confirmLabel: "Cerrar sesion",
      variant: "warning",
      onConfirm: performLogout,
    });
  };

  const handleUserFormChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setUserForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUserSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const name = userForm.name.trim();
    const rut = userForm.rut.trim();
    const email = userForm.email.trim();
    const password = userForm.password.trim();

    if (!name || !rut || !email || (!editingUserId && !password)) {
      showNotification("error", "Completa nombre, RUT, correo y contraseña");
      return;
    }

    if (!emailRegex.test(email)) {
      showNotification("error", "Ingresa un correo electronico valido");
      return;
    }

    const exists = workshopUsers.some(
      (user) =>
        user.email.toLowerCase() === email.toLowerCase() &&
        user.id !== editingUserId,
    );
    if (exists) {
      showNotification("error", "Ya existe un usuario con ese correo");
      return;
    }

    const nextUser = {
      id: crypto.randomUUID(),
      name,
      rut,
      email,
      role: userForm.role,
    };

    try {
      if (editingUserId) {
        if (authToken && sessionRole === "member") {
          const savedUser = await updateWorkshopUser(editingUserId, {
            name,
            rut,
            email,
            password,
            role: userForm.role,
          });
          setWorkshopUsers((prev) =>
            prev.map((user) =>
              user.id === editingUserId
                ? {
                    ...user,
                    name: savedUser.name,
                    rut: savedUser.rut,
                    email: savedUser.email,
                    role: savedUser.role_name || savedUser.role || userForm.role,
                  }
                : user,
            ),
          );
        } else {
          setWorkshopUsers((prev) =>
            prev.map((user) =>
              user.id === editingUserId
                ? {
                    ...user,
                    name,
                    rut,
                    email,
                    role: userForm.role,
                  }
                : user,
            ),
          );
        }
      } else if (authToken && sessionRole === "member") {
        const savedUser = await createWorkshopUser({
          name,
          rut,
          email,
          password,
          role: userForm.role,
        });
        setWorkshopUsers((prev) => [
          ...prev,
          {
            id: savedUser.id,
            name: savedUser.name,
            rut: savedUser.rut,
            email: savedUser.email,
            role: savedUser.role_name || savedUser.role || userForm.role,
          },
        ]);
      } else {
        setWorkshopUsers((prev) => [...prev, nextUser]);
      }
    } catch (error) {
      console.error("Save workshop user failed", error);
      showNotification(
        "error",
        editingUserId
          ? "No se pudo actualizar el usuario"
          : "No se pudo crear el usuario",
      );
      return;
    }

    const wasEditing = Boolean(editingUserId);
    setUserForm({
      name: "",
      rut: "",
      email: "",
      password: "",
      role: "Administrativo",
    });
    setEditingUserId(null);
    logAction(
      wasEditing ? "Usuario actualizado" : "Usuario creado",
      "Configuracion",
      `${name} fue ${wasEditing ? "actualizado" : "creado"} con perfil ${userForm.role}`,
    );
    showNotification(
      "success",
      wasEditing
        ? "Usuario actualizado correctamente"
        : "Usuario creado correctamente",
    );
  };

  const handleEditUser = (user: WorkshopUser) => {
    setEditingUserId(user.id);
    setUserForm({
      name: user.name,
      rut: user.rut || "",
      email: user.email,
      password: "",
      role: (user.role_name || user.role) as UserRole,
    });
  };

  const handleCancelUserEdit = () => {
    setEditingUserId(null);
    setUserForm({
      name: "",
      rut: "",
      email: "",
      password: "",
      role: "Administrativo",
    });
  };

  const performDeleteUser = async (id: string) => {
    const deletedUser = workshopUsers.find((user) => user.id === id);
    if (authToken && sessionRole === "member") {
      try {
        await deleteWorkshopUser(id);
      } catch (error) {
        console.error("Delete workshop user failed", error);
        showNotification("error", "No se pudo eliminar el usuario");
        return;
      }
    }
    setWorkshopUsers((prev) => prev.filter((user) => user.id !== id));
    if (editingUserId === id) {
      handleCancelUserEdit();
    }
    logAction(
      "Usuario eliminado",
      "Configuracion",
      deletedUser ? `${deletedUser.name} fue eliminado` : `Usuario ${id} eliminado`,
    );
    showNotification("success", "Usuario eliminado");
  };

  const handleDeleteUser = (id: string) => {
    const user = workshopUsers.find((item) => item.id === id);
    requestConfirmation({
      title: "Eliminar usuario",
      message: `Se eliminara ${user?.name || "este usuario"} del mantenedor. Esta accion no se puede deshacer desde la pantalla actual.`,
      confirmLabel: "Eliminar usuario",
      variant: "danger",
      onConfirm: () => performDeleteUser(id),
    });
  };

  const handleBudgetFormChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setBudgetForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBudgetServiceChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setBudgetService((prev) => ({
      ...prev,
      [name]: name === "price" ? parseInt(value) || 0 : value,
    }));
  };

  const handleAddBudgetService = (event: FormEvent) => {
    event.preventDefault();
    const name = budgetService.name.trim();
    if (!name || budgetService.price <= 0) {
      showNotification("error", "Agrega un servicio y un valor valido");
      return;
    }

    setBudgetItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name,
        price: budgetService.price,
      },
    ]);
    setBudgetService({ name: "", price: 0 });
    showNotification("success", "Servicio agregado al presupuesto");
  };

  const handleRemoveBudgetService = (id: string) => {
    setBudgetItems((prev) => prev.filter((item) => item.id !== id));
  };

  const performClearBudget = () => {
    setBudgetForm({
      customerName: "",
      customerPhone: "",
      patente: "",
      vehicle: "",
      notes: "",
    });
    setBudgetService({ name: "", price: 0 });
    setBudgetItems([]);
    showNotification("success", "Presupuesto limpiado");
  };

  const handleClearBudget = () => {
    requestConfirmation({
      title: "Limpiar presupuesto",
      message: "Se borraran los datos ingresados y los servicios presupuestados en pantalla.",
      confirmLabel: "Limpiar presupuesto",
      variant: "danger",
      onConfirm: performClearBudget,
    });
  };

  const handleSaveBudget = async () => {
    if (!budgetForm.customerName.trim() || budgetItems.length === 0) {
      showNotification(
        "error",
        "Agrega cliente y al menos un servicio al presupuesto",
      );
      return;
    }

    try {
      await createBudget({
        customerName: budgetForm.customerName.trim(),
        customerPhone: budgetForm.customerPhone.trim(),
        patente: budgetForm.patente.trim(),
        vehicle: budgetForm.vehicle.trim(),
        notes: budgetForm.notes.trim(),
        items: budgetItems,
        status: "guardado",
      });
      logAction(
        "Presupuesto guardado",
        "Presupuesto",
        `${budgetForm.customerName} - ${budgetItems.length} servicio(s)`,
      );
      showNotification("success", "Presupuesto guardado");
    } catch (error) {
      console.error("Save budget failed", error);
      showNotification("error", "No se pudo guardar el presupuesto");
    }
  };
  const buildVehiclePayload = (
    vehicle: Vehicle,
    overrides: Partial<Vehicle>,
  ) => ({
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

    promised_delivery_date: vehicle.promised_delivery_date || null,

    customer_authorized: vehicle.customer_authorized || false,

    servicios: vehicle.servicios || [],

    observaciones: vehicle.observaciones || "",

    comentario_tecnico: vehicle.comentario_tecnico || "",

    salida_confirmada: vehicle.salida_confirmada || false,

    fecha_salida_confirmada: vehicle.fecha_salida_confirmada || null,

    en_estacionamiento_manual: vehicle.en_estacionamiento_manual || false,

    ...overrides,
  });

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
    setReviewServices((prev) =>
      prev.some((item) => item.name === serviceName)
        ? prev
        : [...prev, { name: serviceName, price: "" }],
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

  const handleRemoveReviewService = (serviceName: string) => {
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
    setReviewServices([]);
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
      message: "Se limpiaran los servicios, repuestos y detalle del trabajo actual en taller.",
      confirmLabel: "Limpiar registro",
      variant: "danger",
      onConfirm: performClearReviewRecord,
    });
  };

  const handleSaveReview = async (statusOverride?: Vehicle["estado"]) => {
    if (statusOverride === "Entregado" && !canSendToSalida) {
      showNotification("error", "Tu perfil no puede enviar vehiculos a salida");
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

      showNotification("error", "No se pudo actualizar el vehículo");
    }
  };

  const handleSendToTaller = async (vehicle: Vehicle) => {
    try {
      await updateVehicleRecord(
        vehicle,
        { estado: "En Taller" },
        "Vehiculo enviado a En Taller",
      );

      setVehicleTab("taller");

      setReviewVehicleId(vehicle.id);

      setReviewServices(parseStoredReviewServices(vehicle.servicios));

      setReviewParts(parseStoredReviewParts(vehicle.servicios));

      setReviewNotes(vehicle.observaciones || "");

      logAction(
        "Enviado a En Taller",
        "Vehiculos",
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
      message: `El vehiculo ${vehicle.patente} volvera al ingreso y saldra del listado En Taller.`,
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
      `Vehiculo ${vehicle.patente} listo`,
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
      showNotification("error", "No se pudo marcar el vehiculo como listo");
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
        "Completa los valores de todos los servicios, repuestos e insumos antes de marcar el vehiculo listo",
      );
      return;
    }

    requestConfirmation({
      title: "Marcar vehiculo listo",
      message: `El vehiculo ${vehicle.patente} se ocultara de salida y quedara marcado como listo.`,
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
        `Vehiculo ${vehicle.patente} devuelto a En Taller`,
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
      showNotification("error", "No se pudo devolver el vehiculo a En Taller");
    }
  };

  const handleReturnToTallerFromSalida = (vehicle: Vehicle) => {
    requestConfirmation({
      title: "Devolver a Taller",
      message: `El vehiculo ${vehicle.patente} volvera a En Taller con sus servicios, repuestos, insumos y observaciones actuales para seguir editando el trabajo.`,
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
      showNotification("success", "Valores de la atencion guardados");
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
    try {
      if (editingVehicle) {
        const updated = await updateVehicle(editingVehicle.id, formData);

        setVehicles((prev) =>
          prev.map((v) => (v.id === updated.id ? updated : v)),
        );

        showNotification("success", "vehículo actualizado correctamente");

        logAction(
          "Vehiculo actualizado",
          "Vehiculos",
          `${formData.patente} fue actualizado`,
        );

        setEditingVehicle(null);
      } else {
        const created = await createVehicle(formData);

        setVehicles((prev) => [created, ...prev]);

        logAction(
          "Vehiculo registrado",
          "Vehiculos",
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

  const metrics = {
    total: vehicles.length,

    enTaller: vehicles.filter((v) => v.estado === "Ingresado").length,

    entregados: vehicles.filter((v) => v.estado === "Entregado").length,

    entaller: vehicles.filter((v) => v.estado === "En Taller").length,
  };

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
      vehicle.fecha_salida_confirmada || vehicle.updated_at || vehicle.fecha_ingreso,
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
    return accumulated + Math.max(0, Math.floor((workClockNow - startedAt) / 1000));
  };

  const formatVehicleWorkTime = (vehicle: Vehicle) => {
    const totalMinutes = Math.floor(getVehicleWorkElapsedSeconds(vehicle) / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} h ${minutes.toString().padStart(2, "0")} min`;
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
        { en_estacionamiento_manual: false },
        "Vehiculo retirado del estacionamiento",
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
      showNotification("error", "No se pudo guardar la salida de estacionamiento");
    }
  };

  const handleReleaseFromParking = (vehicle: Vehicle) => {
    requestConfirmation({
      title: "Sacar del estacionamiento",
      message: `El vehiculo ${vehicle.patente} dejara de aparecer como pendiente en Estacionamiento.`,
      confirmLabel: "Sacar",
      variant: "danger",
      onConfirm: () => performReleaseFromParking(vehicle),
    });
  };

  const performSendToParking = async (vehicle: Vehicle) => {
    try {
      await updateVehicleRecord(
        vehicle,
        {
          en_estacionamiento_manual: true,
          fecha_salida_confirmada:
            vehicle.fecha_salida_confirmada || new Date().toISOString(),
        },
        "Vehiculo enviado a estacionamiento",
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
      message: `El vehiculo ${vehicle.patente} se movera desde Salida al modulo Estacionamiento.`,
      confirmLabel: "Pasar a estacionamiento",
      variant: "danger",
      onConfirm: () => performSendToParking(vehicle),
    });
  };

  const activeReviewVehicle =
    vehicles.find((vehicle) => vehicle.id === reviewVehicleId) ||
    vehiclesEntaller[0] ||
    null;

  const filteredServiceCatalog = serviceCatalogByCategory.flatMap(
    ({ category, services }) =>
      services
        .filter((service) => {
          const normalizedSearch = serviceSearch.toLowerCase();
          const matchesSearch =
            service.toLowerCase().includes(normalizedSearch) ||
            category.toLowerCase().includes(normalizedSearch);
          const alreadySelected = reviewServices.some(
            (item) => item.name === service,
          );
          return matchesSearch && !alreadySelected;
        })
        .map((service) => ({ category, name: service })),
  );

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

          title: "Vehiculos En Taller",

          body: `${vehiclesEntaller.length} trabajos en curso.`,

          time: "Hoy",
        }
      : null,

    parkedVehicles.length > 0 && isParkingNotificationDay
      ? {
          id: "parking",

          title: "Estacionamiento",

          body: `${parkedVehicles.length} vehiculo(s) llevan mas de 1 semana.`,

          time: "Hoy",
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string;
    title: string;
    body: string;
    time: string;
  }>;

  const budgetTotal = budgetItems.reduce((sum, item) => sum + item.price, 0);

  const completedServices = vehicles.flatMap((vehicle) =>
    parseStoredReviewServices(vehicle.servicios).map((service) => ({
      ...service,
      vehicle,
      priceValue: parseInt(service.price || "0", 10) || 0,
    })),
  );

  const salesByMonth = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const month = date.getMonth();
    const year = date.getFullYear();
    const total = vehicles
      .filter((vehicle) => {
        const vehicleDate = new Date(vehicle.updated_at || vehicle.fecha_ingreso);
        return vehicleDate.getMonth() === month && vehicleDate.getFullYear() === year;
      })
      .flatMap((vehicle) => parseStoredReviewServices(vehicle.servicios))
      .reduce((sum, service) => sum + (parseInt(service.price || "0", 10) || 0), 0);
    return {
      label: date.toLocaleDateString("es-CL", { month: "short" }).replace(".", ""),
      total,
    };
  });

  const maxSales = Math.max(...salesByMonth.map((item) => item.total), 1);
  const weeklySales = vehicles
    .filter((vehicle) => {
      const vehicleDate = new Date(vehicle.updated_at || vehicle.fecha_ingreso);
      const now = new Date();
      const diffMs = now.getTime() - vehicleDate.getTime();
      return diffMs >= 0 && diffMs <= 7 * 24 * 60 * 60 * 1000;
    })
    .flatMap((vehicle) => parseStoredReviewServices(vehicle.servicios))
    .reduce((sum, service) => sum + (parseInt(service.price || "0", 10) || 0), 0);

  const mostRequestedServices = Object.entries(
    completedServices.reduce<Record<string, number>>((acc, service) => {
      acc[service.name] = (acc[service.name] || 0) + 1;
      return acc;
    }, {}),
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxRequestedServiceCount = Math.max(...mostRequestedServices.map((item) => item.count), 1);

  const latestMaintenances = vehicles
    .filter((vehicle) => parseStoredReviewServices(vehicle.servicios).length > 0)
    .sort(
      (a, b) =>
        new Date(b.updated_at || b.fecha_ingreso).getTime() -
        new Date(a.updated_at || a.fecha_ingreso).getTime(),
    )
    .slice(0, 5);

  const inventoryMovements = vehicles
    .flatMap((vehicle) =>
      parseStoredReviewParts(vehicle.servicios).map((part) => ({
        id: `${vehicle.id}-${part.inventoryItemId}`,
        name: part.name,
        quantity: part.quantity,
        vehicle,
        date: vehicle.updated_at || vehicle.fecha_ingreso,
      })),
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

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
            <h1 className="text-2xl font-bold text-gray-900">
              Mechanic Pro
            </h1>
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
        hiddenSections={
          isMechanicSession ? ["dashboard", "presupuesto"] : []
        }
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
                    .filter((tab) => canAccessSalida || tab.id !== "salida")
                    .map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setVehicleTab(tab.id as typeof vehicleTab)}
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
                              "Se borraran los datos cargados del ingreso de vehiculo actual.",
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      En Taller
                    </h3>

                    {activeReviewVehicle && (
                      <div className="mb-6 rounded-lg border border-blue-500 bg-blue-50 px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900 uppercase">
                          {activeReviewVehicle.patente}
                        </p>

                        <p className="mt-1 text-xs text-gray-600">
                          {activeReviewVehicle.marca}{" "}
                          {activeReviewVehicle.modelo} ·{" "}
                          {activeReviewVehicle.customer_name || "Sin cliente"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-blue-800">
                          Mecánico: {activeReviewVehicle.assigned_mechanic_name || "Sin asignar"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                          <span>Prioridad: <strong>{activeReviewVehicle.attention_priority || "Normal"}</strong></span>
                          <span>Plan: <strong>{Number(activeReviewVehicle.estimated_work_hours) || 0} h</strong></span>
                          <span>Entrega: <strong>{activeReviewVehicle.promised_delivery_date ? new Date(`${activeReviewVehicle.promised_delivery_date}T00:00:00`).toLocaleDateString("es-CL") : "Sin fecha"}</strong></span>
                        </div>
                      </div>
                    )}

                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-gray-900">
                        Vehiculos En Taller
                      </h4>

                      <span className="text-xs text-gray-500">
                        {vehiclesEntaller.length} activos
                      </span>
                    </div>

                    {vehiclesEntaller.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No hay vehiculos En Taller.
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

                            <p className="mt-2 text-xs font-semibold text-gray-500">
                              Sigue En Taller hasta pasar a salida
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {vehicle.attention_priority || "Normal"} · {Number(vehicle.estimated_work_hours) || 0} h estimadas
                            </p>
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
                              <button
                                type="button"
                                onClick={() => handleReturnFromTaller(vehicle)}
                                className="rounded-md border border-[#fc3d3c]/30 px-2.5 py-1.5 text-xs font-semibold text-[#b42318] hover:bg-[#fc3d3c]/10"
                                title="Devolver a ingreso"
                              >
                                Devolver
                              </button>
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
                              Busca procedimientos, agrégalos con valor y
                              guarda el trabajo ejecutado.
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
                              {partPickerOpen && inventoryPickerType === "repuesto"
                                ? "Cerrar repuestos"
                                : "Buscar repuestos"}
                            </button>
                            <button
                              type="button"
                              onClick={() => openInventoryPicker("insumo")}
                              className="rounded-lg bg-[#0f4471] px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0b365c]"
                            >
                              {partPickerOpen && inventoryPickerType === "insumo"
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
                                placeholder={`Buscar ${inventoryPickerType === "insumo" ? "insumo" : "repuesto"} por nombre, SKU, codigo o ubicacion...`}
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
                                    No hay {inventoryPickerType === "insumo" ? "insumos" : "repuestos"} disponibles con esa
                                    busqueda.
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
                                        <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                          item.item_type === "insumo"
                                            ? "bg-emerald-50 text-emerald-700"
                                            : "bg-blue-50 text-blue-700"
                                        }`}>
                                          {item.item_type === "insumo" ? "Insumo" : "Repuesto"}
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
                                      No hay repuestos ni insumos seleccionados todavia.
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
                                  parseStoredReviewParts(activeReviewVehicle.servicios).find(
                                    (savedPart) =>
                                      savedPart.inventoryItemId === part.inventoryItemId,
                                  )?.quantity || 0;
                                const availableQuantity = (inventoryItem?.stock || 0) + savedQuantity;

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
                                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                          part.itemType === "insumo"
                                            ? "bg-emerald-50 text-emerald-700"
                                            : "bg-blue-50 text-blue-700"
                                        }`}>
                                          {part.itemType === "insumo" ? "Insumo" : "Repuesto"}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-500">
                                        SKU: {part.sku || "-"} · Bodega: {part.location || "-"} · Stock disponible: {availableQuantity} {part.unit}
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
                                            parseInt(event.target.value, 10) || 1,
                                          )
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                      />
                                    </div>
                                    <div className="flex items-end">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveReviewPart(part.inventoryItemId)}
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
                                Valores de la atencion
                              </h4>
                              <p className="mt-1 text-xs text-gray-500">
                                Completa los valores de servicios, repuestos e insumos antes de finalizar.
                              </p>
                            </div>

                            {reviewServices.length === 0 && reviewParts.length === 0 ? (
                              <p className="rounded-lg border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-500">
                                Agrega servicios o items de inventario para completar sus valores.
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
                                      <p className="text-xs text-gray-500">Servicio</p>
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
                                        {part.itemType === "insumo" ? "Insumo" : "Repuesto"} · Cantidad {part.quantity}
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
                                        Subtotal: ${(part.quantity * (part.unitCost || 0)).toLocaleString("es-CL")}
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
                                  Total actualizado con servicios, repuestos e insumos seleccionados.
                                </p>
                              </div>
                              <p className="text-2xl font-bold text-[#0f4471]">
                                ${reviewAttentionTotal.toLocaleString("es-CL")}
                              </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Servicios
                                </p>
                                <p className="mt-1 text-lg font-bold text-gray-900">
                                  ${reviewServiceTotal.toLocaleString("es-CL")}
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
                                  ${(Number(activeReviewVehicle?.customer_advance) || 0).toLocaleString("es-CL")}
                                </p>
                              </div>
                              <div className="rounded-lg border border-[#0f4471]/20 bg-[#0f4471]/5 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-[#0f4471]">
                                  Saldo pendiente
                                </p>
                                <p className="mt-1 text-lg font-bold text-[#0f4471]">
                                  ${Math.max(
                                    0,
                                    reviewAttentionTotal -
                                      (Number(activeReviewVehicle?.customer_advance) || 0),
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
                            {canEditPrices ? "Guardar selección" : "Guardar trabajo"}
                          </button>

                          {canSendToSalida && (
                            <button
                              onClick={() =>
                                requestConfirmation({
                                  title: "Enviar a salida",
                                  message:
                                    "El vehiculo pasara a Salida y se guardaran los servicios y repuestos registrados.",
                                  confirmLabel: "Enviar a salida",
                                  variant: "info",
                                  onConfirm: () => handleSaveReview("Entregado"),
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
                        Envia un vehiculo a En Taller para registrar servicios.
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
                            readyVehicleIds.includes(vehicle.id)
                              ? "fade-out"
                              : ""
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
                                onClick={() => handleReturnToTallerFromSalida(vehicle)}
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
                                  Total atencion
                                </p>
                                <p className="mt-1 text-lg font-bold text-gray-900">
                                  ${getVehicleWorkTotal(vehicle).toLocaleString("es-CL")}
                                </p>
                              </div>
                              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Abono cliente
                                </p>
                                <p className="mt-1 text-lg font-bold text-green-700">
                                  ${(Number(vehicle.customer_advance) || 0).toLocaleString("es-CL")}
                                </p>
                              </div>
                              <div className="rounded-lg border border-[#0f4471]/20 bg-[#0f4471]/5 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Saldo pendiente
                                </p>
                                <p className="mt-1 text-lg font-bold text-[#0f4471]">
                                  ${Math.max(0, getVehicleWorkTotal(vehicle) - (Number(vehicle.customer_advance) || 0)).toLocaleString("es-CL")}
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

                              {parseStoredReviewParts(vehicle.servicios)
                                .length > 0 ? (
                                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-gray-700">
                                  {parseStoredReviewParts(
                                    vehicle.servicios,
                                  ).map((part) => (
                                    <li key={part.inventoryItemId}>
                                      {part.name} x{part.quantity} {part.unit}
                                    </li>
                                  ))}
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
            <div className="space-y-6">
              <MetricsCards
                totalvehicles={metrics.total}
                ingresados={metrics.enTaller}
                entregados={metrics.entregados}
                enTaller={metrics.entaller}
              />

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="space-y-6 xl:col-span-2">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {canViewPrices && (
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Flujo semanal</p>
                          <p className="mt-1 text-2xl font-bold text-gray-900">
                            ${weeklySales.toLocaleString("es-CL")}
                          </p>
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0f4471]/10">
                          <TrendingUp className="h-5 w-5 text-[#0f4471]" />
                        </div>
                      </div>
                    </div>
                    )}

                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Mantenciones registradas</p>
                          <p className="mt-1 text-2xl font-bold text-gray-900">
                            {completedServices.length}
                          </p>
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0f4471]/10">
                          <Wrench className="h-5 w-5 text-[#0f4471]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {canViewPrices && (
                  <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Flujo de ventas mensual</h3>
                        <p className="text-sm text-gray-500">Total estimado por servicios realizados</p>
                      </div>
                      <span className="rounded-lg bg-[#0f4471]/10 px-3 py-1 text-xs font-semibold text-[#0f4471]">
                        Últimos 6 meses
                      </span>
                    </div>
                    <div className="flex h-64 items-end gap-4 border-b border-gray-200 pb-4">
                      {salesByMonth.map((item) => (
                        <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                          <div className="flex h-48 w-full items-end rounded-lg bg-gray-50 px-2">
                            <div
                              className="w-full rounded-t-lg bg-[#0f4471]"
                              style={{ height: `${Math.max(8, (item.total / maxSales) * 100)}%` }}
                              title={`$${item.total.toLocaleString("es-CL")}`}
                            />
                          </div>
                          <p className="text-xs font-semibold capitalize text-gray-500">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  )}

                  <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Historial de mantenciones</h3>
                      <History className="h-5 w-5 text-[#0f4471]" />
                    </div>
                    {latestMaintenances.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                        No hay mantenciones registradas.
                      </p>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {latestMaintenances.map((vehicle) => {
                          const services = parseStoredReviewServices(vehicle.servicios);
                          return (
                            <div key={vehicle.id} className="py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold uppercase text-gray-900">{vehicle.patente}</p>
                                  <p className="text-xs text-gray-500">
                                    {vehicle.marca} {vehicle.modelo} · {vehicle.customer_name || "Sin cliente"}
                                  </p>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {new Date(vehicle.updated_at || vehicle.fecha_ingreso).toLocaleDateString("es-CL")}
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-gray-700">
                                {services.map((service) => service.name).slice(0, 3).join(", ")}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Servicios más solicitados</h3>
                      <Wrench className="h-5 w-5 text-[#0f4471]" />
                    </div>
                    {mostRequestedServices.length === 0 ? (
                      <p className="text-sm text-gray-500">Sin servicios registrados.</p>
                    ) : (
                      <div className="space-y-4">
                        {mostRequestedServices.map((service) => (
                          <div key={service.name}>
                            <div className="mb-1 flex items-center justify-between gap-3">
                              <p className="truncate text-sm font-medium text-gray-800">{service.name}</p>
                              <span className="text-xs font-semibold text-[#0f4471]">{service.count}</span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-100">
                              <div
                                className="h-2 rounded-full bg-[#0f4471]"
                                style={{ width: `${(service.count / maxRequestedServiceCount) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Movimientos de inventario</h3>
                      <Package className="h-5 w-5 text-[#0f4471]" />
                    </div>
                    {inventoryMovements.length === 0 ? (
                      <p className="text-sm text-gray-500">Sin movimientos de repuestos.</p>
                    ) : (
                      <div className="space-y-3">
                        {inventoryMovements.map((movement) => (
                          <div key={movement.id} className="rounded-lg bg-gray-50 px-3 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-gray-900">{movement.name}</p>
                              <span className="rounded-full bg-[#fc3d3c]/10 px-2 py-1 text-xs font-semibold text-[#b42318]">
                                -{movement.quantity}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                              {movement.vehicle.patente} · {new Date(movement.date).toLocaleDateString("es-CL")}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900">Estado del taller</h3>
                    <div className="mt-4 space-y-3">
                      {[
                        { label: "En Taller", value: metrics.entaller, color: "bg-[#0f4471]" },
                        { label: "Ingresado", value: metrics.enTaller, color: "bg-blue-300" },
                        { label: "Entregados", value: metrics.entregados, color: "bg-emerald-500" },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-sm text-gray-600">{item.label}</span>
                            <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100">
                            <div
                              className={`h-2 rounded-full ${item.color}`}
                              style={{ width: `${metrics.total ? (item.value / metrics.total) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "inventario" && (
            <InventoryPage
              inventoryItems={inventoryItems}
              setInventoryItems={setInventoryItems}
              showNotification={showNotification}
            />
          )}

          {activeSection === "presupuesto" && canAccessBudget && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  Presupuesto
                </h2>

                <p className="text-sm text-gray-500">
                  Arma un presupuesto simple de servicios mecánicos.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm lg:col-span-2">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="rounded-lg bg-accent-soft p-3 text-accent">
                      <Calculator className="h-5 w-5" />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Datos del presupuesto
                      </h3>

                      <p className="text-sm text-gray-500">
                        Cliente, vehículo y detalle del trabajo solicitado.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      name="customerName"
                      value={budgetForm.customerName}
                      onChange={handleBudgetFormChange}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="Nombre del cliente"
                    />

                    <input
                      name="customerPhone"
                      value={budgetForm.customerPhone}
                      onChange={handleBudgetFormChange}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="Teléfono"
                    />

                    <input
                      name="patente"
                      value={budgetForm.patente}
                      onChange={handleBudgetFormChange}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm uppercase focus:border-blue-500 focus:outline-none"
                      placeholder="Patente"
                    />

                    <input
                      name="vehicle"
                      value={budgetForm.vehicle}
                      onChange={handleBudgetFormChange}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="Vehículo"
                    />

                    <textarea
                      name="notes"
                      value={budgetForm.notes}
                      onChange={handleBudgetFormChange}
                      rows={4}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm resize-none focus:border-blue-500 focus:outline-none md:col-span-2"
                      placeholder="Observaciones del presupuesto"
                    />
                  </div>

                  <form
                    onSubmit={handleAddBudgetService}
                    className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3"
                  >
                    <select
                      name="name"
                      value={budgetService.name}
                      onChange={handleBudgetServiceChange}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Selecciona un servicio</option>

                      {serviceCatalog.map((service) => (
                        <option key={service} value={service}>
                          {service}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      name="price"
                      value={budgetService.price}
                      onChange={handleBudgetServiceChange}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="Valor"
                      min="0"
                    />

                    <button
                      type="submit"
                      className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Resumen
                  </h3>

                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-gray-500">Cliente</p>

                    <p className="text-sm font-semibold text-gray-900">
                      {budgetForm.customerName || "-"}
                    </p>

                    <p className="text-sm text-gray-500">Vehículo</p>

                    <p className="text-sm font-semibold text-gray-900">
                      {[budgetForm.patente, budgetForm.vehicle]
                        .filter(Boolean)
                        .join(" - ") || "-"}
                    </p>
                  </div>

                  <div className="mt-6 border-t border-gray-200 pt-4">
                    <p className="text-sm text-gray-500">Total estimado</p>

                    <p className="mt-1 text-3xl font-bold text-gray-900">
                      ${budgetTotal.toLocaleString("es-CL")}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveBudget}
                    className="mt-6 w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Guardar presupuesto
                  </button>

                  <button
                    type="button"
                    onClick={handleClearBudget}
                    className="mt-3 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Limpiar presupuesto
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="border-b border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Servicios presupuestados
                  </h3>
                </div>

                {budgetItems.length === 0 ? (
                  <div className="p-6 text-sm text-gray-500">
                    No hay servicios agregados.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {budgetItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {item.name}
                          </p>

                          <p className="text-sm text-gray-500">
                            ${item.price.toLocaleString("es-CL")}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveBudgetService(item.id)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#fc3d3c]/30 px-3 py-2 text-sm font-semibold text-[#b42318] hover:bg-[#fc3d3c]/10 sm:w-auto"
                        >
                          <Trash2 className="h-4 w-4" />
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === "estacionamiento" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  Estacionamiento
                </h2>
                <p className="text-sm text-gray-500">
                  Vehiculos entregados que llevan mas de una semana en el taller.
                </p>
              </div>

              {parkedVehicles.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white p-8 text-sm text-gray-500 shadow-sm">
                  No hay vehiculos pendientes en estacionamiento.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  {parkedVehicles.map((vehicle) => {
                    const services = parseStoredReviewServices(vehicle.servicios);
                    const parts = parseStoredReviewParts(vehicle.servicios);
                    const total = getVehicleWorkTotal(vehicle);

                    return (
                      <div
                        key={vehicle.id}
                        className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#0f4471]">
                              {getParkingDays(vehicle)} dias estacionado
                            </p>
                            <h3 className="mt-1 text-lg font-bold uppercase text-gray-900">
                              {vehicle.patente}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {vehicle.marca} {vehicle.modelo} · {vehicle.ano}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleReleaseFromParking(vehicle)}
                            className="rounded-lg bg-[#fc3d3c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#df2f2f]"
                          >
                            Sacar del estacionamiento
                          </button>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                          {canViewPrices && (
                          <div className="rounded-lg border border-gray-200 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Cliente
                            </p>
                            <p className="mt-2 text-sm font-semibold text-gray-900">
                              {vehicle.customer_name || "Sin cliente"}
                            </p>
                            <p className="text-xs text-gray-500">{vehicle.customer_rut || "-"}</p>
                            <p className="text-xs text-gray-500">{vehicle.customer_phone || "-"}</p>
                            <p className="text-xs text-gray-500">{vehicle.customer_city || "-"}</p>
                          </div>
                          )}

                          <div className="rounded-lg border border-gray-200 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Usuario
                            </p>
                            <p className="mt-2 text-sm font-semibold text-gray-900">
                              {vehicle.assigned_mechanic_name || "Sin mecanico asignado"}
                            </p>
                            <p className="text-xs text-gray-500">
                              Salida: {getVehicleExitDate(vehicle).toLocaleDateString("es-CL")}
                            </p>
                          </div>

                          {canViewPrices && (
                            <div className="rounded-lg border border-gray-200 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Valor total
                              </p>
                              <p className="mt-2 text-2xl font-bold text-gray-900">
                                ${total.toLocaleString("es-CL")}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="rounded-lg border border-gray-200 p-4">
                            <p className="text-sm font-semibold text-gray-900">
                              Trabajos realizados
                            </p>
                            {services.length === 0 ? (
                              <p className="mt-2 text-sm text-gray-500">
                                Sin servicios registrados.
                              </p>
                            ) : (
                              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                                {services.map((service) => (
                                  <li key={service.name} className="flex justify-between gap-3">
                                    <span>{service.name}</span>
                                    {canViewPrices && (
                                      <span className="font-semibold">
                                        ${(parseInt(service.price || "0", 10) || 0).toLocaleString("es-CL")}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div className="rounded-lg border border-gray-200 p-4">
                            <p className="text-sm font-semibold text-gray-900">
                              Repuestos e insumos
                            </p>
                            {parts.length === 0 ? (
                              <p className="mt-2 text-sm text-gray-500">
                                Sin repuestos registrados.
                              </p>
                            ) : (
                              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                                {parts.map((part) => (
                                  <li key={part.inventoryItemId} className="flex justify-between gap-3">
                                    <span>
                                      {part.name} x{part.quantity} {part.unit}
                                    </span>
                                    {canViewPrices && (
                                      <span className="font-semibold">
                                        ${(part.quantity * (part.unitCost || 0)).toLocaleString("es-CL")}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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
                />
              )}
            </>
          )}

          {activeSection === "registro_acciones" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  Registro de acciones
                </h2>
                <p className="text-sm text-gray-500">
                  Historial de acciones realizadas por usuarios del sistema.
                </p>
              </div>

              {!isSessionAdmin ? (
                <div className="rounded-xl border border-[#fc3d3c]/30 bg-[#fc3d3c]/10 p-6 text-sm font-semibold text-[#b42318]">
                  Solo el Administrador de Taller puede ingresar a este modulo.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-200 px-5 py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {filteredAuditLogs.length} accion(es) encontradas
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Total almacenado: {auditLogs.length} registro(s)
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <label
                            htmlFor="audit-date-from"
                            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500"
                          >
                            Desde
                          </label>
                          <input
                            id="audit-date-from"
                            type="date"
                            value={auditDateFrom}
                            onChange={(event) => setAuditDateFrom(event.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0f4471] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="audit-date-to"
                            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500"
                          >
                            Hasta
                          </label>
                          <input
                            id="audit-date-to"
                            type="date"
                            value={auditDateTo}
                            onChange={(event) => setAuditDateTo(event.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0f4471] focus:outline-none"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => {
                              setAuditDateFrom("");
                              setAuditDateTo("");
                            }}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Limpiar filtro
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {filteredAuditLogs.length === 0 ? (
                    <div className="p-8 text-sm text-gray-500">
                      No hay acciones registradas para el rango seleccionado.
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                Fecha y hora
                              </th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                Usuario
                              </th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                Modulo
                              </th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                Accion
                              </th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                Detalle
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {paginatedAuditLogs.map((entry) => (
                              <tr key={entry.id}>
                                <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                  {new Date(entry.created_at).toLocaleString("es-CL")}
                                </td>
                                <td className="px-4 py-3 font-semibold text-gray-900">
                                  {entry.user_name}
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                  {entry.module}
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                  {entry.action}
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                  {entry.detail || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-gray-500">
                          Mostrando {auditVisibleFrom}-{auditVisibleTo} de{" "}
                          {filteredAuditLogs.length}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setAuditPage((page) => Math.max(1, page - 1))
                            }
                            disabled={auditCurrentPage === 1}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Anterior
                          </button>
                          <span className="min-w-24 text-center text-sm font-semibold text-gray-700">
                            Pagina {auditCurrentPage} de {auditTotalPages}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setAuditPage((page) =>
                                Math.min(auditTotalPages, page + 1),
                              )
                            }
                            disabled={auditCurrentPage === auditTotalPages}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Siguiente
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                    </div>
              )}
            </div>
          )}

          {activeSection === "configuracion" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Mantenedor de usuarios
                </h3>
                <p className="text-sm text-gray-500">
                  {editingUserId
                    ? "Edita los datos del usuario. La contrasena solo cambia si escribes una nueva."
                    : "Crea usuarios y asigna perfiles de acceso por rol."}
                </p>
              </div>

              <form
                onSubmit={handleUserSubmit}
                className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 p-4 lg:grid-cols-6"
              >
                <div>
                  <label
                    htmlFor="user-name"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Nombre
                  </label>
                  <input
                    id="user-name"
                    name="name"
                    type="text"
                    value={userForm.name}
                    onChange={handleUserFormChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Nombre del usuario"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="user-rut"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    RUT
                  </label>
                  <input
                    id="user-rut"
                    name="rut"
                    type="text"
                    value={userForm.rut}
                    onChange={handleUserFormChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="12.345.678-9"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="user-email"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Correo
                  </label>
                  <input
                    id="user-email"
                    name="email"
                    type="email"
                    value={userForm.email}
                    onChange={handleUserFormChange}
                    pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="usuario@taller.cl"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="user-password"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Crear contraseña
                  </label>
                  <input
                    id="user-password"
                    name="password"
                    type="password"
                    value={userForm.password}
                    onChange={handleUserFormChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Contraseña"
                    autoComplete="new-password"
                    required={!editingUserId}
                  />
                </div>

                <div>
                  <label
                    htmlFor="user-role"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Perfil
                  </label>
                  <select
                    id="user-role"
                    name="role"
                    value={userForm.role}
                    onChange={handleUserFormChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  >
                    {Object.keys(roleModules).map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <button
                    type="submit"
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    {editingUserId ? (
                      <Edit2 className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {editingUserId ? "Actualizar usuario" : "Crear usuario"}
                  </button>
                  {editingUserId && (
                    <button
                      type="button"
                      onClick={handleCancelUserEdit}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>

              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Usuario
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Perfil
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Accesos
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {workshopUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            RUT: {user.rut || "-"}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {user.role}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {roleModules[user.role].join(", ")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditUser(user)}
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                            >
                              <Edit2 className="h-4 w-4" />
                              Editar
                            </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#fc3d3c]/30 px-3 py-2 text-xs font-semibold text-[#b42318] hover:bg-[#fc3d3c]/10"
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Apariencia
                </h3>

                <p className="text-sm text-gray-500">
                  Personaliza el color principal de la interfaz.
                </p>
              </div>

              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(event) => setAccentColor(event.target.value)}
                    className="h-10 w-14 rounded border border-gray-300"
                  />

                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Color principal
                    </p>

                    <p className="text-xs text-gray-500">{accentColor}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAccentColor("#0f4471")}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Restaurar color
                </button>
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;


