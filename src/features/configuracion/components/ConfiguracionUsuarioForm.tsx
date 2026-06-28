import { Edit2, Plus } from "lucide-react";
import { ChangeEvent, FormEvent } from "react";

interface UsuarioFormProps {
  userForm: UserForm;
  editingUserId: string | null;

  roleModules: Record<string, string[]>;

  onChange: (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;

  onSubmit: (event: FormEvent) => void;

  onCancel: () => void;
}

export default function ConfiguracionUsuarioForm({userForm, editingUserId, roleModules, onSubmit, onChange, onCancel}: UsuarioFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 p-4 lg:grid-cols-6"
    >
      <div>
        <label
          htmlFor="user-name"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Nombre
        </label>
        <input
          id="user-name"
          name="name"
          type="text"
          value={userForm.name}
          onChange={onChange}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Nombre del usuario"
          required
        />
      </div>

      <div>
        <label
          htmlFor="user-rut"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          RUT
        </label>
        <input
          id="user-rut"
          name="rut"
          type="text"
          value={userForm.rut}
          onChange={onChange}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="12.345.678-9"
          required
        />
      </div>

      <div>
        <label
          htmlFor="user-email"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Correo
        </label>
        <input
          id="user-email"
          name="email"
          type="email"
          value={userForm.email}
          onChange={onChange}
          pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="usuario@taller.cl"
          required
        />
      </div>

      <div>
        <label
          htmlFor="user-password"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Crear contraseña
        </label>
        <input
          id="user-password"
          name="password"
          type="password"
          value={userForm.password}
          onChange={onChange}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Contraseña"
          autoComplete="new-password"
          required={!editingUserId}
        />
      </div>

      <div>
        <label
          htmlFor="user-role"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Perfil
        </label>
        <select
          id="user-role"
          name="role"
          value={userForm.role}
          onChange={onChange}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          required
        >
          {Object.keys(roleModules).map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end gap-2">
        <button
          type="submit"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          {editingUserId ? (
            <Edit2 className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {editingUserId ? "Actualizar usuario" : "Crear usuario"}
        </button>
        {editingUserId && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
