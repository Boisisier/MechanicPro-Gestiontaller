interface RegistroFiltersProps {
  filteredCount: number;
  totalCount: number;

  auditDateFrom: string;
  auditDateTo: string;

  setAuditDateFrom: (value: string) => void;
  setAuditDateTo: (value: string) => void;
}

export default function RegistroFilters({
  filteredCount,
  totalCount,
  auditDateFrom,
  auditDateTo,
  setAuditDateFrom,
  setAuditDateTo,
}: RegistroFiltersProps) {
  return (
    <div className="border-b border-gray-200 px-5 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {filteredCount} acción(es) encontradas
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Total almacenado: {totalCount} registro(s)
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
  );
}
