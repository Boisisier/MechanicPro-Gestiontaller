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

      bgColor: 'bg-blue-50',

      iconColor: 'text-blue-600',

    },

    {

      label: 'En taller',

      value: enTaller,

      icon: Wrench,

      bgColor: 'bg-orange-50',

      iconColor: 'text-orange-600',

    },

    {

      label: 'Entregados',

      value: entregados,

      icon: CheckCircle,

      bgColor: 'bg-green-50',

      iconColor: 'text-green-600',

    },

    {

      label: 'En revisión',
      value: enRevision,

      icon: Clock,

      bgColor: 'bg-amber-50',

      iconColor: 'text-amber-600',

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

              <div className={`w-12 h-12 ${metric.bgColor} rounded-lg flex items-center justify-center`}>

                <Icon className={`w-6 h-6 ${metric.iconColor}`} />

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



