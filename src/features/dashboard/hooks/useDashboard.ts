import { Vehicle } from "../../../shared/lib/types";
import {
  parseStoredReviewParts,
  parseStoredReviewServices,
} from "../../../shared/utils/reviewParsers";

interface UseDashboardProps {
  vehicles: Vehicle[];
  serviceFlowPeriod: "week" | "month" | "year";
}

export default function useDashboard({
  vehicles,
  serviceFlowPeriod,
}: UseDashboardProps) {
  const completedServices = vehicles.flatMap((vehicle) =>
    parseStoredReviewServices(vehicle.servicios).map((service) => ({
      ...service,
      vehicle,
      priceValue: parseInt(service.price || "0", 10) || 0,
    })),
  );
  const metrics = {
    total: vehicles.length,
    enTaller: vehicles.filter((v) => v.estado === "Ingresado").length,
    entregados: vehicles.filter((v) => v.estado === "Entregado").length,
    entaller: vehicles.filter((v) => v.estado === "En Taller").length,
  };

  const weeklySales = vehicles
    .filter((vehicle) => {
      const vehicleDate = new Date(vehicle.updated_at || vehicle.fecha_ingreso);
      const now = new Date();
      const diffMs = now.getTime() - vehicleDate.getTime();
      return diffMs >= 0 && diffMs <= 7 * 24 * 60 * 60 * 1000;
    })
    .flatMap((vehicle) => parseStoredReviewServices(vehicle.servicios))
    .reduce(
      (sum, service) => sum + (parseInt(service.price || "0", 10) || 0),
      0,
    );

  const periodCount = serviceFlowPeriod === "week" ? 8 : serviceFlowPeriod === "month" ? 6 : 5;
  const serviceFlow = Array.from({ length: periodCount }, (_, index) => {
    const now = new Date();
    let start: Date;
    let end: Date;
    let label: string;

    if (serviceFlowPeriod === "week") {
      const offset = (periodCount - 1 - index) * 7;
      start = new Date(now);
      start.setDate(now.getDate() - offset - 6);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setDate(now.getDate() - offset);
      end.setHours(23, 59, 59, 999);
      label = `${start.getDate()}-${end.getDate()} ${end
        .toLocaleDateString("es-CL", { month: "short" })
        .replace(".", "")}`;
    } else if (serviceFlowPeriod === "month") {
      start = new Date(now.getFullYear(), now.getMonth() - (periodCount - 1 - index), 1);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
      label = start
        .toLocaleDateString("es-CL", { month: "short" })
        .replace(".", "");
    } else {
      const year = now.getFullYear() - (periodCount - 1 - index);
      start = new Date(year, 0, 1);
      end = new Date(year, 11, 31, 23, 59, 59, 999);
      label = String(year);
    }

    const total = vehicles
      .filter((vehicle) => {
        const date = new Date(
          vehicle.fecha_salida_confirmada ||
            vehicle.updated_at ||
            vehicle.fecha_ingreso,
        );
        return date >= start && date <= end;
      })
      .reduce(
        (sum, vehicle) =>
          sum + parseStoredReviewServices(vehicle.servicios).length,
        0,
      );
    return { label, total };
  });

  const serviceFlowLabel =
    serviceFlowPeriod === "week"
      ? "Últimas 8 semanas"
      : serviceFlowPeriod === "month"
        ? "Últimos 6 meses"
        : "Últimos 5 años";
  const maxServiceFlow = Math.max(...serviceFlow.map((item) => item.total), 1);

  const latestMaintenances = vehicles
    .filter(
      (vehicle) => parseStoredReviewServices(vehicle.servicios).length > 0,
    )
    .sort(
      (a, b) =>
        new Date(b.updated_at || b.fecha_ingreso).getTime() -
        new Date(a.updated_at || a.fecha_ingreso).getTime(),
    )
    .slice(0, 5);

  const inventoryMovements = vehicles
    .flatMap((vehicle) =>
      parseStoredReviewParts(vehicle.servicios).map((part) => ({
        id: `${vehicle.id}-${part.inventoryItemId}`,
        name: part.name,
        quantity: part.quantity,
        vehicle,
        date: vehicle.updated_at || vehicle.fecha_ingreso,
      })),
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const mostRequestedServices = Object.entries(
    completedServices.reduce<Record<string, number>>((acc, service) => {
      acc[service.name] = (acc[service.name] || 0) + 1;
      return acc;
    }, {}),
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxRequestedServiceCount = Math.max(
    ...mostRequestedServices.map((item) => item.count),
    1,
  );
  return {
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
  };
}
