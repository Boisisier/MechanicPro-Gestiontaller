import { AuditLog } from "../../../shared/lib/types";

interface RegistroTableProps {
  logs: AuditLog[];
}

export default function RegistroTable({ logs }: RegistroTableProps) {
  return (
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
          {logs.map((entry) => (
            <tr key={entry.id}>
              <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                {new Date(entry.created_at).toLocaleString("es-CL")}
              </td>
              <td className="px-4 py-3 font-semibold text-gray-900">
                {entry.user_name}
              </td>
              <td className="px-4 py-3 text-gray-700">{entry.module}</td>
              <td className="px-4 py-3 text-gray-700">{entry.action}</td>
              <td className="px-4 py-3 text-gray-600">{entry.detail || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
