import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import mechanicProLogo from "../assets/mechanic-pro-logo.png";
import { clearAuthToken } from "../lib/api";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error no controlado en la interfaz", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetSession = () => {
    clearAuthToken();
    window.location.reload();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <img src={mechanicProLogo} alt="MechanicPro" className="mb-6 h-12 w-auto" />
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#fc3d3c]/10 text-[#fc3d3c]">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Ocurrió un error inesperado</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            La aplicación encontró un problema y no puede continuar. Puedes intentar recargar la
            página; si el problema persiste, cerrar la sesión suele resolverlo.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-lg bg-[#0f4471] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0b365c]"
            >
              Recargar página
            </button>
            <button
              type="button"
              onClick={this.handleResetSession}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cerrar sesión y recargar
            </button>
          </div>
        </div>
      </div>
    );
  }
}
