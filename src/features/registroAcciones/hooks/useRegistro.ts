import { useState } from "react";
import { AuditLog } from "../../../shared/lib/types";

export default function useRegistro() {
  const [auditLogs,] = useState<AuditLog[]>(() => {
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
    setAuditPage
  };
}
