import { TrendingUp, Wrench } from "lucide-react";

interface DashboardOverviewCardsProps {
  canViewPrices: boolean;
  weeklySales: number;
  completedServicesCount: number;
}

export default function DashboardOverviewCards({
  canViewPrices,
  weeklySales,
  completedServicesCount,
}: DashboardOverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

      {canViewPrices && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Flujo semanal
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                ${weeklySales.toLocaleString("es-CL")}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0f4471]/10">
              <TrendingUp className="h-5 w-5 text-[#0f4471]" />
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">
              Mantenciones registradas
            </p>

            <p className="mt-1 text-2xl font-bold text-gray-900">
              {completedServicesCount}
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0f4471]/10">
            <Wrench className="h-5 w-5 text-[#0f4471]" />
          </div>
        </div>
      </div>

    </div>
  );
}