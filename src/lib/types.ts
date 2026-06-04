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
  codigo_vin?: string;
  codigo_motor?: string;
  color?: string;
  kilometraje: number;
  cantidad_combustible: number;
  estado: VehicleStatus;
  servicios?: string[];
  fallas_detectadas?: string[];
  observaciones: string;
  comentario_tecnico?: string;
  fecha_ingreso: string;
  created_at: string;
  updated_at: string;
}

export type WorkshopRoleName = 'Administrador de Taller' | 'Administrativo' | 'Mecánico';

export interface WorkshopRole {
  id: string;
  name: WorkshopRoleName;
  modules: string[];
  created_at: string;
  updated_at: string;
}

export interface WorkshopUser {
  id: string;
  name: string;
  email: string;
  role_id?: string;
  role_name: WorkshopRoleName;
  modules?: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  sku: string;
  barcode: string;
  stock: number;
  minStock: number;
  unit: string;
  location: string;
  supplier: string;
  cost: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetItem {
  id: string;
  name: string;
  price: number;
}

export interface BudgetQuote {
  id: string;
  customer_name: string;
  customer_phone: string;
  patente: string;
  vehicle: string;
  notes: string;
  total: number;
  status: string;
  items: BudgetItem[];
  created_at: string;
  updated_at: string;
}

