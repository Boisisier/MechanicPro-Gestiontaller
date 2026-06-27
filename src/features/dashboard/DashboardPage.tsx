import { Vehicle } from "../../shared/lib/types";
import DashboardMetricsCards from "./components/DashboardMetricsCards";
import DashboarSalesChart from "./components/DashboardSalesChart";
import DashboardOverviewCards from "./components/DashboardOverviewCards";
import useDashboard from "./hooks/useDashboard";
import DashboardMaintenanceHistory from "./components/DashboardMaintenanceHistory";
import DashboardTopServices from "./components/DashboardTopServices";
import DashboardInventoryMovements from "./components/DashboardInventoryMovements";
import DashboardWorkshopStatus from "./components/DashboardWorkshopStatus";

interface DashboardPageProps {
  vehicles: Vehicle[];
  canViewPrices: boolean;
}

export default function DashboardPage({
  vehicles,
  canViewPrices,
}: DashboardPageProps) {
  const {
    metrics,
    weeklySales,
    salesByMonth,
    latestMaintenances,
    inventoryMovements,
    mostRequestedServices,
    maxRequestedServiceCount,
    maxSales,
    completedServices,
  } = useDashboard({
    vehicles,
  });
  return (
    <div className="space-y-6">
      <DashboardMetricsCards
        totalvehicles={metrics.total}
        ingresados={metrics.enTaller}
        entregados={metrics.entregados}
        enTaller={metrics.entaller}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <DashboardOverviewCards
            canViewPrices={canViewPrices}
            weeklySales={weeklySales}
            completedServicesCount={completedServices.length}
          />

          {canViewPrices && (
            <DashboarSalesChart
              salesByMonth={salesByMonth}
              maxSales={maxSales}
            />
          )}

          <DashboardMaintenanceHistory
            latestMaintenances={latestMaintenances}
          />
        </div>

        <div className="space-y-6">
          <DashboardTopServices
            mostRequestedServices={mostRequestedServices}
            maxRequestedServiceCount={maxRequestedServiceCount}
          />

          <DashboardInventoryMovements
            inventoryMovements={inventoryMovements}
          />
          <DashboardWorkshopStatus metrics={metrics} />
        </div>
      </div>
    </div>
  );
}
