import ConfiguracionApariencia from "./components/ConfiguracionApariencia";
import ConfiguracionHeader from "./components/ConfiguracionHeader";
import ConfiguracionUsuarioForm from "./components/ConfiguracionUsuarioForm";
import ConfiguracionUsuarioTable from "./components/ConfiguracionUsuarioTable";
import useConfiguracion from "./hooks/useConfiguracion";

export default function ConfiguracionPage() {
  const {
    userForm,
    editingUserId,
    workshopUsers,
    roleModules,

    accentColor,
    setAccentColor,

    handleUserSubmit,
    handleUserFormChange,
    handleCancelUserEdit,
    handleEditUser,
    handleDeleteUser,
  } = useConfiguracion();
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
      <ConfiguracionHeader editingUserId={editingUserId} />

      <ConfiguracionUsuarioForm
        editingUserId={editingUserId}
        onCancel={handleCancelUserEdit}
        onChange={handleUserFormChange}
        onSubmit={handleUserSubmit}
        roleModules={roleModules}
        userForm={userForm}
      />

      <ConfiguracionUsuarioTable
        onDelete={handleDeleteUser}
        onEdit={handleEditUser}
        roleModules={roleModules}
        workshopUsers={workshopUsers}
      />

      <ConfiguracionApariencia
        accentColor={accentColor}
        setAccentColor={setAccentColor}
      />
    </div>
  );
}
