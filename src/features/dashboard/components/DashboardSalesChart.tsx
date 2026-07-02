interface DashboardSalesChartProps {
  serviceFlow: Array<{
    label: string;
    total: number;
  }>;
  maxServiceFlow: number;
  period: "week" | "month" | "year";
  periodLabel: string;
  onPeriodChange: (period: "week" | "month" | "year") => void;
}

export default function DashboardSalesChart({
  serviceFlow,
  maxServiceFlow,
  period,
  periodLabel,
  onPeriodChange,
}: DashboardSalesChartProps) {
  const barColors = [
    "bg-[#0f4471]",
    "bg-[#fc3d3c]",
    "bg-emerald-500",
    "bg-sky-500",
    "bg-[#0f4471]",
    "bg-[#fc3d3c]",
    "bg-emerald-500",
    "bg-sky-500",
  ];

  return (
    <div className="rounded-xl border border-[#0f4471]/15 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Flujo de servicios realizados
          </h3>
          <p className="text-sm text-gray-500">
            Cantidad de trabajos registrados por período
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="service-flow-period" className="sr-only">
            Período del flujo de servicios
          </label>
          <select
            id="service-flow-period"
            value={period}
            onChange={(event) =>
              onPeriodChange(event.target.value as "week" | "month" | "year")
            }
            className="rounded-lg border border-[#0f4471]/25 bg-white px-3 py-2 text-sm font-semibold text-[#0f4471] outline-none focus:border-[#0f4471]"
          >
            <option value="week">Por semanas</option>
            <option value="month">Por meses</option>
            <option value="year">Por años</option>
          </select>
          <span className="rounded-lg bg-[#0f4471]/10 px-3 py-2 text-xs font-semibold text-[#0f4471]">
            {periodLabel}
          </span>
        </div>
      </div>

      <div className="flex h-64 items-end gap-3 border-b border-gray-200 pb-4">
        {serviceFlow.map((item, index) => (
          <div
            key={item.label}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
          >
            <div className="relative flex h-48 w-full items-end rounded-lg bg-[#0f4471]/5 px-2">
              <div
                className={`w-full rounded-t-md ${barColors[index % barColors.length]}`}
                style={{
                  height: `${Math.max(
                    8,
                    (item.total / maxServiceFlow) * 100,
                  )}%`,
                }}
                title={`${item.total} servicio(s)`}
              />
              <span className="absolute inset-x-0 top-2 text-center text-xs font-bold text-gray-700">
                {item.total}
              </span>
            </div>
            <p className="w-full truncate text-center text-xs font-semibold capitalize text-gray-500">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
