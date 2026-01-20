import { Bell, User, Menu, Moon, Sun, LogOut } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  onMenuClick: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  notifications: Array<{ id: string; title: string; body: string; time: string }>;
  onLogout: () => void;
}

export default function Header({ onMenuClick, theme, onToggleTheme, notifications, onLogout }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Bienvenido al sistema</h2>
            <p className="text-xs lg:text-sm text-gray-500 hidden sm:block">
              Gestiona tus vehículos de manera eficiente
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            title="Cambiar modo"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <div className="relative">
            <button
              className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => setOpen((prev) => !prev)}
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span
                  className="absolute top-1 right-1 w-2 h-2 rounded-full"
                  style={{ backgroundColor: 'var(--accent)' }}
                ></span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-900">Notificaciones</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-500">Sin notificaciones nuevas.</p>
                  ) : (
                    notifications.map((item) => (
                      <div key={item.id} className="px-4 py-3 border-b border-gray-100 last:border-b-0">
                        <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{item.body}</p>
                        <p className="text-xs text-gray-400 mt-1">{item.time}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3 pl-4 border-l border-gray-200">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">Admin Usuario</p>
              <p className="text-xs text-gray-500">admin@mechanicpro.com</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setUserOpen((prev) => !prev)}
                className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                <User className="w-5 h-5" style={{ color: 'var(--accent-contrast)' }} />
              </button>
              {userOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="md:hidden relative">
            <button
              onClick={() => setUserOpen((prev) => !prev)}
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <User className="w-5 h-5" style={{ color: 'var(--accent-contrast)' }} />
            </button>
            {userOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
