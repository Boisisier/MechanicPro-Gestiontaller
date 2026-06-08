import { LayoutDashboard, Car, Package, FileText, Settings, X } from 'lucide-react';

import { Calculator } from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ activeSection, onSectionChange, isOpen, onClose }: SidebarProps) {
  const menuSections = [
    {
      title: 'Principal',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Taller',
      items: [
        { id: 'vehiculos', label: 'Vehículos', icon: Car },
        { id: 'presupuesto', label: 'Presupuesto', icon: Calculator },
        { id: 'inventario', label: 'Inventario', icon: Package },
        { id: 'estacionamiento', label: 'Estacionamiento', icon: Car },
        { id: 'reportes', label: 'Reportes', icon: FileText },
      ],
    },
    {
      title: 'Sistema',
      items: [
        { id: 'configuracion', label: 'Configuración', icon: Settings },
        { id: 'registro_acciones', label: 'Registro de acciones', icon: FileText },
      ],
    },
  ];

  const handleSectionChange = (section: string) => {
    onSectionChange(section);
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`w-64 bg-[#0f3a63] border-r border-blue-900/30 h-screen fixed left-0 top-0 flex flex-col z-50 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-white/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/15 shadow-sm"
              >
                <Car className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">MechanicPro</h1>
                <p className="text-xs text-white">Gestión de taller</p>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-6">
            {menuSections.map((section) => (
              <div key={section.title}>
                <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wide text-white">
                  {section.title}
                </p>
                <ul className="space-y-2">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;

                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => handleSectionChange(item.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white transition-colors ${
                            isActive
                              ? 'bg-white/20 font-semibold shadow-sm'
                              : 'hover:bg-white/10'
                          }`}
                        >
                          <Icon className="w-5 h-5 text-white" />
                          <span>{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-white/15">
          <div className="px-4 py-3 bg-white/10 rounded-lg">
            <p className="text-xs text-white mb-1">Sistema activo</p>
            <p className="text-sm font-medium text-white">Versión 1.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}
