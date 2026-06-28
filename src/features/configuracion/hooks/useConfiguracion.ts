import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { AuditLog, UserRole, WorkshopUser } from "../../../shared/lib/types";
import {
  createAuditLog,
  createWorkshopUser,
  deleteWorkshopUser,
  getAuthToken,
  updateWorkshopUser,
} from "../../../shared/lib/api";
import { useNotification } from "../../../shared/hooks/useNotification";
import { toSoftAccent } from "../../../shared/utils/colors";

export default function useConfiguracion() {
  const { showNotification } = useNotification();
  const roleModules: Record<UserRole, string[]> = {
    "Administrador de Taller": [
      "Dashboard",
      "Vehículos",
      "Presupuesto",
      "Inventario",
      "Estacionamiento",
      "Reportes",
      "Configuración",
      "Registro de acciones",
    ],
    Administrativo: [
      "Dashboard",
      "Vehículos",
      "Presupuesto",
      "Estacionamiento",
      "Reportes",
    ],
    Mecánico: ["Vehículos", "Reportes"],
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

  const [workshopUsers, setWorkshopUsers] = useState<WorkshopUser[]>(() => {
    const raw = localStorage.getItem("workshopUsers");
    return raw ? JSON.parse(raw) : defaultWorkshopUsers;
  });

  const [accentColor, setAccentColor] = useState(
    () => localStorage.getItem("accentColor") || "#0f4471",
  );

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const [authToken] = useState<string | null>(() => getAuthToken());

  const [sessionRole] = useState<"member" | null>(null);

  const [, setAuditLogs] = useState<AuditLog[]>(() => {
    const raw = localStorage.getItem("auditLogs");
    return raw ? JSON.parse(raw) : [];
  });
  const [sessionUser] = useState<{
    name: string;
    email: string;
    role: string;
  } | null>(null);
  const currentAuditUser = sessionUser
    ? {
        id: "session-user",
        name: sessionUser.name,
        email: sessionUser.email,
        role: sessionUser.role as UserRole,
      }
    : workshopUsers.find((user) => user.role === "Administrador de Taller") ||
      workshopUsers[0];

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
      showNotification("error", "Ingresa un correo electrónico válido");
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
                    role:
                      savedUser.role_name || savedUser.role || userForm.role,
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
      "Configuración",
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

  const handleUserFormChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setUserForm((prev) => ({
      ...prev,
      [name]: value,
    }));
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

  const handleDeleteUser = (id: string) => {
    const user = workshopUsers.find((item) => item.id === id);
    requestConfirmation({
      title: "Eliminar usuario",
      message: `Se eliminará ${user?.name || "este usuario"} del mantenedor. Esta acción no se puede deshacer desde la pantalla actual.`,
      confirmLabel: "Eliminar usuario",
      variant: "danger",
      onConfirm: () => performDeleteUser(id),
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
      "Configuración",
      deletedUser
        ? `${deletedUser.name} fue eliminado`
        : `Usuario ${id} eliminado`,
    );
    showNotification("success", "Usuario eliminado");
  };

  const isSessionAdmin =
    sessionUser?.role === "admin" ||
    sessionUser?.role === "Administrador de Taller";

  console.log(isSessionAdmin);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accentColor);
    document.documentElement.style.setProperty(
      "--accent-soft",
      toSoftAccent(accentColor),
    );
    localStorage.setItem("accentColor", accentColor);
  }, [accentColor]);
  return {
    userForm,
    editingUserId,
    workshopUsers,
    roleModules,

    accentColor,
    setAccentColor,

    handleUserSubmit,
    handleUserFormChange,
    handleCancelUserEdit,
    handleEditUser,
    handleDeleteUser,

  };
}
