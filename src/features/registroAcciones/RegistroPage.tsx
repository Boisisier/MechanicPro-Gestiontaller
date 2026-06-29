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
    setAuditPage
  } = useRegistro();
  return (
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
          Solo el Administrador de Taller puede ingresar a este módulo.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {filteredAuditLogs.length} acción(es) encontradas
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
                        Acción
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
  );
}
