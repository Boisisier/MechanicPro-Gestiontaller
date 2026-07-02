import { useState } from "react";
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
  const [serviceFlowPeriod, setServiceFlowPeriod] = useState<
    "week" | "month" | "year"
  >("month");
  const {
    metrics,
    weeklySales,
    serviceFlow,
    serviceFlowLabel,
    latestMaintenances,
    inventoryMovements,
    mostRequestedServices,
    maxRequestedServiceCount,
    maxServiceFlow,
    completedServices,
  } = useDashboard({
    vehicles,
    serviceFlowPeriod,
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

          <DashboarSalesChart
            serviceFlow={serviceFlow}
            maxServiceFlow={maxServiceFlow}
            period={serviceFlowPeriod}
            periodLabel={serviceFlowLabel}
            onPeriodChange={setServiceFlowPeriod}
          />

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
