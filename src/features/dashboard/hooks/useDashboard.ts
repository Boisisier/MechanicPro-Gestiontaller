import { Vehicle } from "../../../shared/lib/types";
import {
  parseStoredReviewParts,
  parseStoredReviewServices,
} from "../../../shared/utils/reviewParsers";

interface UseDashboardProps {
  vehicles: Vehicle[];
}

export default function useDashboard({ vehicles }: UseDashboardProps) {
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

  const salesByMonth = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const month = date.getMonth();
    const year = date.getFullYear();
    const total = vehicles
      .filter((vehicle) => {
        const vehicleDate = new Date(
          vehicle.updated_at || vehicle.fecha_ingreso,
        );
        return (
          vehicleDate.getMonth() === month && vehicleDate.getFullYear() === year
        );
      })
      .flatMap((vehicle) => parseStoredReviewServices(vehicle.servicios))
      .reduce(
        (sum, service) => sum + (parseInt(service.price || "0", 10) || 0),
        0,
      );
    return {
      label: date
        .toLocaleDateString("es-CL", { month: "short" })
        .replace(".", ""),
      total,
    };
  });

  const maxSales = Math.max(...salesByMonth.map((item) => item.total), 1);

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
    salesByMonth,
    latestMaintenances,
    inventoryMovements,
    mostRequestedServices,
    maxRequestedServiceCount,
    maxSales,
    completedServices,
  };
}
