import { Edit2, Trash2 } from "lucide-react";
import { WorkshopUser } from "../../../shared/lib/types";

interface UsuarioTableProps {
  workshopUsers: WorkshopUser[];

  roleModules: Record<string, string[]>;

  onEdit: (user: WorkshopUser) => void;

  onDelete: (id: string) => void;
}

export default function ConfiguracionUsuarioTable({
  workshopUsers,
  roleModules,
  onEdit,
  onDelete,
}: UsuarioTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">
              Usuario
            </th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">
              Perfil
            </th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">
              Accesos
            </th>
            <th className="px-4 py-3 text-right font-semibold text-gray-700">
              Acción
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {workshopUsers.map((user) => (
            <tr key={user.id}>
              <td className="px-4 py-3">
                <p className="font-semibold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">RUT: {user.rut || "-"}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </td>
              <td className="px-4 py-3 font-medium text-gray-900">
                {user.role}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {roleModules[user.role].join(", ")}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(user)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    <Edit2 className="h-4 w-4" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(user.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#fc3d3c]/30 px-3 py-2 text-xs font-semibold text-[#b42318] hover:bg-[#fc3d3c]/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
