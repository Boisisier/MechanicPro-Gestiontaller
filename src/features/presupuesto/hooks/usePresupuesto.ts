import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import {
  AuditLog,
  BudgetServiceItem,
  UserRole,
  WorkshopUser,
} from "../../../shared/lib/types";
import { createAuditLog, createBudget, getAuthToken } from "../../../shared/lib/api";
import { useNotification } from "../../../shared/hooks/useNotification";
import { ConfirmDialogOptions } from "../../../shared/hooks/useConfirmDialog";

export default function usePresupuesto(
  requestConfirmation: (options: ConfirmDialogOptions) => void,
) {
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

  const [, setAuditLogs] = useState<AuditLog[]>(() => {
    const raw = localStorage.getItem("auditLogs");
    return raw ? JSON.parse(raw) : [];
  });
  
  const [authToken] = useState<string | null>(() => getAuthToken());
  const [sessionRole] = useState<"member" | null>(null);
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

  const { showNotification } = useNotification();

  const [budgetForm, setBudgetForm] = useState({
    customerName: "",
    customerPhone: "",
    patente: "",
    vehicle: "",
    notes: "",
  });

  const [budgetService, setBudgetService] = useState({
    id: "",
    name: "",
    price: 0,
  });

  const [budgetItems, setBudgetItems] = useState<BudgetServiceItem[]>([]);

  const budgetTotal = useMemo(() => {
    return budgetItems.reduce((sum, item) => sum + item.price, 0);
  }, [budgetItems]);

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
    setBudgetService({ id: "", name: "", price: 0 });
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
    setBudgetService({ id: "", name: "", price: 0 });
    setBudgetItems([]);
    showNotification("success", "Presupuesto limpiado");
  };

  const handleClearBudget = () => {
    requestConfirmation({
      title: "Limpiar presupuesto",
      message:
        "Se borraran los datos ingresados y los servicios presupuestados en pantalla.",
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

  return {
    budgetForm,
    budgetService,
    budgetItems,
    budgetTotal,

    handleBudgetFormChange,
    handleBudgetServiceChange,
    handleAddBudgetService,
    handleRemoveBudgetService,
    handleSaveBudget,
    handleClearBudget,
  };
}
