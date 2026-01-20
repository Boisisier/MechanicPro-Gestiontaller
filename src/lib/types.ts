export type VehicleStatus = 'En taller' | 'Entregado' | 'En revision';

export interface Vehicle {
  id: string;
  customer_name?: string;
  customer_rut?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_city?: string;
  patente: string;
  marca: string;
  modelo: string;
  ano: number;
  tipo_vehiculo: string;
  kilometraje: number;
  cantidad_combustible: number;
  estado: VehicleStatus;
  servicios?: string[];
  observaciones: string;
  fecha_ingreso: string;
  created_at: string;
  updated_at: string;
}

