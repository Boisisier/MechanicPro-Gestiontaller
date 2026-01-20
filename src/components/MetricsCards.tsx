import { Car, CheckCircle, Clock, Wrench } from 'lucide-react';

interface MetricsCardsProps {
  totalvehicles: number;
  enTaller: number;
  entregados: number;
  enRevision: number;
}

export default function MetricsCards({ totalvehicles, enTaller, entregados, enRevision }: MetricsCardsProps) {
  const metrics = [
    {
      label: 'Total vehículos',
      value: totalvehicles,
      icon: Car,
    },
    {
      label: 'En taller',
      value: enTaller,
      icon: Wrench,
    },
    {
      label: 'Entregados',
      value: entregados,
      icon: CheckCircle,
    },
    {
      label: 'En revisión',
      value: enRevision,
      icon: Clock,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.label}
            className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-accent-soft rounded-lg flex items-center justify-center">
                <Icon className="w-6 h-6 text-accent" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-1">{metric.label}</p>
            <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
          </div>
        );
      })}
    </div>
  );
}
