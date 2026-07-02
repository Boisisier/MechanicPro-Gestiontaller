import { Wrench } from "lucide-react";

interface DashboardTopServicesProps {
  mostRequestedServices: Array<{
    name: string;
    count: number;
  }>;
  maxRequestedServiceCount: number;
}

export default function DashboardTopServices({
  mostRequestedServices,
  maxRequestedServiceCount,
}: DashboardTopServicesProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Servicios más solicitados
        </h3>
        <Wrench className="h-5 w-5 text-[#0f4471]" />
      </div>
      {mostRequestedServices.length === 0 ? (
        <p className="text-sm text-gray-500">Sin servicios registrados.</p>
      ) : (
        <div className="space-y-4">
          {mostRequestedServices.map((service, index) => (
            <div key={service.name}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium text-gray-800">
                  {service.name}
                </p>
                <span className="text-xs font-semibold text-[#0f4471]">
                  {service.count}
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div
                  className={`h-2 rounded-full ${
                    [
                      "bg-[#0f4471]",
                      "bg-[#fc3d3c]",
                      "bg-emerald-500",
                      "bg-sky-500",
                      "bg-[#0f4471]",
                    ][index]
                  }`}
                  style={{
                    width: `${(service.count / maxRequestedServiceCount) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
