import { useEffect, useState } from "react";
import { AuditLog } from "../../../shared/lib/types";
import { getAuditLogs, getAuthToken } from "../../../shared/lib/api";

export default function useRegistro() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const raw = localStorage.getItem("auditLogs");
    return raw ? JSON.parse(raw) : [];
  });
  const [auditDateFrom, setAuditDateFrom] = useState("");
  const [auditDateTo, setAuditDateTo] = useState("");
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

  const [auditPage, setAuditPage] = useState(1);
  const auditLogsPageSize = 15;
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

  const [authToken] = useState<string | null>(() =>
    getAuthToken(),
  );

  useEffect(() => {
    setAuditPage(1);
  }, [auditDateFrom, auditDateTo]);

  const [sessionRole] = useState<"member" | null>(null);
  const [sessionUser] = useState<{
    name: string;
    email: string;
    role: string;
  } | null>(null);
  const sessionUserRole = sessionUser?.role || "";
  const isMechanicSession = sessionUserRole === "Mecánico";

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

  return {
    filteredAuditLogs,
    auditLogs,
    auditDateFrom,
    auditDateTo,
    paginatedAuditLogs,
    auditVisibleFrom,
    auditVisibleTo,
    auditCurrentPage,
    auditTotalPages,
    setAuditDateFrom,
    setAuditDateTo,
    setAuditPage,
  };
}
