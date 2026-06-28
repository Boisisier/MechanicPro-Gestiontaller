interface DashboarSalesChartProps {
  salesByMonth: Array<{
    label: string;
    total: number;
  }>;
  maxSales: number;
}

export default function DashboarSalesChart({
  salesByMonth,
  maxSales,
}: DashboarSalesChartProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Flujo de ventas mensual
          </h3>
          <p className="text-sm text-gray-500">
            Total estimado por servicios realizados
          </p>
        </div>
        <span className="rounded-lg bg-[#0f4471]/10 px-3 py-1 text-xs font-semibold text-[#0f4471]">
          Últimos 6 meses
        </span>
      </div>
      <div className="flex h-64 items-end gap-4 border-b border-gray-200 pb-4">
        {salesByMonth.map((item) => (
          <div
            key={item.label}
            className="flex flex-1 flex-col items-center gap-2"
          >
            <div className="flex h-48 w-full items-end rounded-lg bg-gray-50 px-2">
              <div
                className="w-full rounded-t-lg bg-[#0f4471]"
                style={{
                  height: `${Math.max(8, (item.total / maxSales) * 100)}%`,
                }}
                title={`$${item.total.toLocaleString("es-CL")}`}
              />
            </div>
            <p className="text-xs font-semibold capitalize text-gray-500">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
