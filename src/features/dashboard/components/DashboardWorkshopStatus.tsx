interface DashboardWorkshopStatusProps {
  metrics: {
    entaller: number;
    enTaller: number;
    entregados: number;
    total: number;
  };
}

export default function DashboardWorkshopStatus({
  metrics,
}: DashboardWorkshopStatusProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">Estado del taller</h3>
      <div className="mt-4 space-y-3">
        {[
          {
            label: "En Taller",
            value: metrics.entaller,
            color: "bg-[#0f4471]",
          },
          {
            label: "Ingresado",
            value: metrics.enTaller,
            color: "bg-[#fc3d3c]",
          },
          {
            label: "Entregados",
            value: metrics.entregados,
            color: "bg-emerald-500",
          },
        ].map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm text-gray-600">{item.label}</span>
              <span className="text-sm font-semibold text-gray-900">
                {item.value}
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100">
              <div
                className={`h-2 rounded-full ${item.color}`}
                style={{
                  width: `${metrics.total ? (item.value / metrics.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
