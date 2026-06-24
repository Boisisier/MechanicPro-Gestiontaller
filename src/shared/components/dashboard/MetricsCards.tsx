import { Car, CheckCircle, Clock, Wrench } from 'lucide-react';

interface MetricsCardsProps {
  totalvehicles: number;
  ingresados: number;
  entregados: number;
  enTaller: number;
}

export default function MetricsCards({ totalvehicles, ingresados, entregados, enTaller }: MetricsCardsProps) {
  const metrics = [
    {
      label: 'Total vehículos',
      value: totalvehicles,
      icon: Car,
    },
    {
      label: 'Ingresados',
      value: ingresados,
      icon: Wrench,
    },
    {
      label: 'Entregados',
      value: entregados,
      icon: CheckCircle,
    },
    {
      label: 'En Taller',
      value: enTaller,
      icon: Clock,
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft">
              <Icon className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-gray-500">{metric.label}</p>
              <p className="mt-0.5 text-2xl font-bold leading-none text-gray-900">{metric.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
