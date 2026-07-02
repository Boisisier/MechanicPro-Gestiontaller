import RegistroAccessDenied from "./components/RegistroAccessDenied";
import RegistroEmptyState from "./components/RegistroEmptyState";
import RegistroFilters from "./components/RegistroFilters";
import RegistroHeader from "./components/RegistroHeader";
import RegistroPagination from "./components/RegistroPagination";
import RegistroTable from "./components/RegistroTable";
import useRegistro from "./hooks/useRegistro";

interface RegistroPageProps {
  isSessionAdmin: Boolean;
}

export default function RegistroPage({ isSessionAdmin }: RegistroPageProps) {
  const {
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
  } = useRegistro();
  return (
    <div className="space-y-6">
      <RegistroHeader />

      {!isSessionAdmin ? (
        <RegistroAccessDenied />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <RegistroFilters
            filteredCount={filteredAuditLogs.length}
            totalCount={auditLogs.length}
            auditDateFrom={auditDateFrom}
            auditDateTo={auditDateTo}
            setAuditDateFrom={setAuditDateFrom}
            setAuditDateTo={setAuditDateTo}
          />

          {filteredAuditLogs.length === 0 ? (
            <RegistroEmptyState />
          ) : (
            <>
              <RegistroTable logs={paginatedAuditLogs} />
              <RegistroPagination
                currentPage={auditCurrentPage}
                setPage={setAuditPage}
                total={filteredAuditLogs.length}
                totalPages={auditTotalPages}
                visibleFrom={auditVisibleFrom}
                visibleTo={auditVisibleTo}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
