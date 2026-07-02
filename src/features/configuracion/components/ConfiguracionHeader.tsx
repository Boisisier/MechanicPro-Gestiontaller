interface ConfiguracionHeaderProps {
  editingUserId: string | null;
}

export default function ConfiguracionHeader({
  editingUserId,
}: ConfiguracionHeaderProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900">
        Mantenedor de usuarios
      </h3>

      <p className="text-sm text-gray-500">
        {editingUserId
          ? "Edita los datos del usuario. La contraseña solo cambia si escribes una nueva."
          : "Crea usuarios y asigna perfiles de acceso por rol."}
      </p>
    </div>
  );
}
