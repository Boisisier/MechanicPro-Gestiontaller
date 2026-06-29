import { RotateCcw, Send } from "lucide-react";

interface VehiculoHeaderProps {
  isMechanicSession: Boolean;
  canAccessSalida: Boolean;

  vehicleTab: "ingreso" | "taller" | "salida";
  setVehicleTab: React.Dispatch<
    React.SetStateAction<"ingreso" | "taller" | "salida">
  >;

  handleClearReviewRecord: () => void;
  requestConfirmation: (options: {
    title: string;
    message: string;
    confirmLabel?: string | undefined;
    cancelLabel?: string | undefined;
    variant?: "danger" | "warning" | "info" | undefined;
    onConfirm: () => void | Promise<void>;
  }) => void;
}

export default function VehiculoHeader({
  isMechanicSession,
  canAccessSalida,
  vehicleTab,
  setVehicleTab,
  handleClearReviewRecord,
  requestConfirmation,
}: VehiculoHeaderProps) {
  return (
    <div className="sticky top-4 z-20 mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {[
          { id: "ingreso", label: "Ingreso de vehículos" },

          { id: "taller", label: "En Taller" },

          { id: "salida", label: "Salida vehículos" },
        ]
          .filter((tab) => !isMechanicSession || tab.id === "taller")
          .filter((tab) => canAccessSalida || tab.id !== "salida")
          .map((tab) => (
            <button
              key={tab.id}
              onClick={() => setVehicleTab(tab.id as typeof vehicleTab)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                vehicleTab === tab.id
                  ? "bg-[#0f4471] text-white shadow-sm hover:bg-[#0b365c]"
                  : "border border-[#0f4471]/30 text-[#0f4471] hover:bg-[#0f4471]/10"
              }`}
            >
              {tab.label}
            </button>
          ))}

        {vehicleTab === "ingreso" && (
          <div className="flex flex-wrap gap-3 lg:ml-auto">
            <button
              type="button"
              onClick={() =>
                requestConfirmation({
                  title: "Limpiar formulario",
                  message:
                    "Se borrarán los datos cargados del ingreso de vehículo actual.",
                  confirmLabel: "Limpiar formulario",
                  variant: "danger",
                  onConfirm: () => {
                    window.dispatchEvent(new Event("vehicle-form-clear"));
                  },
                })
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fc3d3c] px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#df2f2f] focus:ring-4 focus:ring-[#fc3d3c]/20"
            >
              <RotateCcw className="h-4 w-4" />
              Limpiar formulario
            </button>
            <button
              type="submit"
              form="vehicle-entry-form"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-green-700 focus:ring-4 focus:ring-green-200"
            >
              <Send className="h-4 w-4" />
              Ingresar Vehículo
            </button>
          </div>
        )}
        {vehicleTab === "taller" && (
          <div className="flex flex-wrap gap-3 lg:ml-auto">
            <button
              type="button"
              onClick={handleClearReviewRecord}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fc3d3c] px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#df2f2f] focus:ring-4 focus:ring-[#fc3d3c]/20"
            >
              <RotateCcw className="h-4 w-4" />
              Limpiar registro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
