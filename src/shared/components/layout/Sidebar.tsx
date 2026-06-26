import { LayoutDashboard, Car, Package, FileText, Settings, X } from 'lucide-react';

import { Calculator } from 'lucide-react';
import mechanicProLogo from '../../assets/mechanic-pro-logo.png';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isOpen: boolean;
  isDesktopOpen: boolean;
  onClose: () => void;
  hiddenSections?: string[];
}

export default function Sidebar({
  activeSection,
  onSectionChange,
  isOpen,
  isDesktopOpen,
  onClose,
  hiddenSections = [],
}: SidebarProps) {
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
        className={`fixed left-0 top-0 z-50 flex h-dvh max-h-dvh w-[min(18rem,calc(100vw-1.5rem))] flex-col border-r border-white/15 bg-[#0f4471] shadow-2xl transition-transform duration-300 lg:w-64 lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isDesktopOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full'
        }`}
      >
        <div className="shrink-0 border-b border-white/15 p-4 lg:p-5">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-sm">
                <img
                  src={mechanicProLogo}
                  alt="Mechanic Pro"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold text-white lg:text-xl">Mechanic Pro</h1>
                <p className="text-xs text-white/85">Gestión de taller</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.45)_transparent]">
          <div className="space-y-2 pb-2">
            {menuSections.map((section) => {
              const visibleItems = section.items.filter(
                (item) => !hiddenSections.includes(item.id),
              );

              if (visibleItems.length === 0) {
                return null;
              }

              return (
                <div key={section.title}>
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-white/75">
                  {section.title}
                </p>
                <ul className="space-y-1.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;

                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => handleSectionChange(item.id)}
                          className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-white transition-colors ${
                            isActive
                              ? 'bg-white/20 font-semibold shadow-sm'
                              : 'hover:bg-white/10'
                          }`}
                        >
                          <Icon className="h-5 w-5 shrink-0 text-white" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
              );
            })}
          </div>
        </nav>

        <div className="shrink-0 border-t border-white/15 p-3 lg:p-4">
          <div className="rounded-lg bg-white/10 px-3 py-2.5">
            <p className="text-xs text-white mb-1">Sistema activo</p>
            <p className="text-sm font-medium text-white">Versión 1.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}
