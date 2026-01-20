import { LayoutDashboard, Car, Package, FileText, Settings, X } from 'lucide-react';



interface SidebarProps {

  activeSection: string;

  onSectionChange: (section: string) => void;

  isOpen: boolean;

  onClose: () => void;

}



export default function Sidebar({ activeSection, onSectionChange, isOpen, onClose }: SidebarProps) {

    const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'vehiculos', label: 'Vehculos', icon: Car },
    { id: 'inventario', label: 'Inventario', icon: Package },
    { id: 'reportes', label: 'Reportes', icon: FileText },
    { id: 'configuracion', label: 'Configuracin', icon: Settings },
  ];


  const handleSectionChange = (section: string) => {

    onSectionChange(section);

    onClose();

  };



  return (

    <>

      {isOpen && (

        <div

          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"

          onClick={onClose}

        />

      )}



      <aside

        className={`w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col z-50 transition-transform duration-300 ${

          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'

        }`}

      >

        <div className="p-6 border-b border-gray-200">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-2">

              <div

                className="w-10 h-10 rounded-lg flex items-center justify-center"

                style={{ backgroundColor: 'var(--accent)' }}

              >

                <Car className="w-6 h-6 text-white" />

              </div>

              <div>

                <h1 className="text-xl font-bold text-gray-900">MechanicPro</h1>

                <p className="text-xs text-gray-500">Gestin de taller</p>
              </div>

            </div>

            <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-gray-700">

              <X className="w-5 h-5" />

            </button>

          </div>

        </div>



        <nav className="flex-1 p-4 overflow-y-auto">

          <ul className="space-y-2">

            {menuItems.map((item) => {

              const Icon = item.icon;

              const isActive = activeSection === item.id;



              return (

                <li key={item.id}>

                  <button

                    onClick={() => handleSectionChange(item.id)}

                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${

                      isActive

                        ? 'bg-blue-50 text-blue-700 font-medium'

                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'

                    }`}

                  >

                    <Icon className="w-5 h-5" />

                    <span>{item.label}</span>

                  </button>

                </li>

              );

            })}

          </ul>

        </nav>



        <div className="p-4 border-t border-gray-200">

          <div className="px-4 py-3 bg-gray-50 rounded-lg">

            <p className="text-xs text-gray-500 mb-1">Sistema activo</p>

            <p className="text-sm font-medium text-gray-900">Versin 1.0</p>
          </div>

        </div>

      </aside>

    </>

  );

}





