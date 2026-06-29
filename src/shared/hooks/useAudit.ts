import { useState } from "react";
import { AuditLog, UserRole, WorkshopUser } from "../lib/types";
import { createAuditLog, getAuthToken } from "../lib/api";

export default function useAuditLog() {
  const [sessionUser, setSessionUser] = useState<{
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

  const [workshopUsers, setWorkshopUsers] = useState<WorkshopUser[]>(() => {
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

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const raw = localStorage.getItem("auditLogs");
    return raw ? JSON.parse(raw) : [];
  });

  const [authToken, setAuthTokenState] = useState<string | null>(() =>
    getAuthToken(),
  );

  const [sessionRole, setSessionRole] = useState<"member" | null>(null);

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

  return {
    logAction,
  };
}
