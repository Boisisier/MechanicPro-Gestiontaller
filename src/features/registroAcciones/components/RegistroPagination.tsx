interface RegistroPaginationProps {
  visibleFrom: number;
  visibleTo: number;
  total: number;

  currentPage: number;
  totalPages: number;

  setPage: React.Dispatch<React.SetStateAction<number>>;
}

export default function RegistroPagination({
  visibleFrom,
  visibleTo,
  total,
  currentPage,
  totalPages,
  setPage,
}: RegistroPaginationProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-gray-500">
        Mostrando {visibleFrom}-{visibleTo} de {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPage((page) => Math.max(1, page - 1))}
          disabled={currentPage === 1}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="min-w-24 text-center text-sm font-semibold text-gray-700">
          Pagina {currentPage} de {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((page) => Math.min(totalPages, page + 1))}
          disabled={currentPage === totalPages}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
