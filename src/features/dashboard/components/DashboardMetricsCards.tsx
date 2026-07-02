import { Car, CheckCircle, Clock, Wrench } from "lucide-react";

interface DashboardMetricsCardsProps {
  totalvehicles: number;
  ingresados: number;
  entregados: number;
  enTaller: number;
}

export default function DashboardMetricsCards({
  totalvehicles,
  ingresados,
  entregados,
  enTaller,
}: DashboardMetricsCardsProps) {
  const metrics = [
    {
      label: "Total vehículos",
      value: totalvehicles,
      icon: Car,
      accent: "bg-[#0f4471]/10 text-[#0f4471] border-[#0f4471]/20",
    },
    {
      label: "Ingresados",
      value: ingresados,
      icon: Wrench,
      accent: "bg-[#fc3d3c]/10 text-[#fc3d3c] border-[#fc3d3c]/20",
    },
    {
      label: "Entregados",
      value: entregados,
      icon: CheckCircle,
      accent: "bg-emerald-50 text-emerald-600 border-emerald-200",
    },
    {
      label: "En Taller",
      value: enTaller,
      icon: Clock,
      accent: "bg-sky-50 text-sky-600 border-sky-200",
    },
  ];

  return (
    <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.label}
            className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${metric.accent}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-gray-500">
                {metric.label}
              </p>
              <p className="mt-0.5 text-2xl font-bold leading-none text-gray-900">
                {metric.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
