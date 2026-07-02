export type VehicleStatus = "Ingresado" | "Entregado" | "En Taller";

export interface Vehicle {
  id: string;
  customer_name?: string;
  customer_rut?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_city?: string;
  customer_email?: string;
  assigned_mechanic_id?: string;
  assigned_mechanic_name?: string;
  customer_advance?: number;
  attention_priority?: "Baja" | "Normal" | "Alta" | "Urgente";
  estimated_work_hours?: number;
  promised_delivery_date?: string | null;
  customer_authorized?: boolean;
  customer_authorized_at?: string | null;
  work_timer_started_at?: string | null;
  work_elapsed_seconds?: number;
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
  observaciones: string;
  comentario_tecnico?: string;
  salida_confirmada?: boolean;
  fecha_salida_confirmada?: string | null;
  en_estacionamiento_manual?: boolean;
  fecha_ingreso: string;
  created_at: string;
  updated_at: string;
}

export interface Notificacion {
  type: "success" | "error";
  message: string;
}

export interface ReviewServiceItem {
  name: string;
  price: string;
}

export interface ReviewPartItem {
  inventoryItemId: string;
  itemType?: "repuesto" | "insumo";
  name: string;
  sku: string;
  quantity: number;
  unit: string;
  unitCost: number;
  location: string;
}

export interface BudgetServiceItem {
  id: string;
  name: string;
  price: number;
}

export interface CatalogService {
  id?: string;
  category: string;
  name: string;
  code?: string;
  description?: string;
  base_price?: number;
  estimated_hours?: number;
  active?: boolean;
  category_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type UserRole =
  | "Administrador de Taller"
  | "Administrativo"
  | "Mecánico";

export type WorkshopRoleName = UserRole;

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
  rut?: string;
  email: string;
  role: UserRole;
  role_id?: string;
  role_name?: WorkshopRoleName;
  modules?: string[];
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  user_name: string;
  module: string;
  action: string;
  detail: string;
  created_at: string;
}

export interface ParkingRelease {
  id: string;
  vehicle_id: string;
  released_by: string;
  detail: string;
  created_at: string;
}

export interface InventoryFormData {
  item_type: "repuesto" | "insumo";
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
}

export interface InventoryItem {
  id: string;
  item_type?: "repuesto" | "insumo";
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
  sale_price?: number;
  status?: "activo" | "descontinuado" | "bloqueado";
  supplier_id?: string;
  warehouse?: string;
  aisle?: string;
  shelf?: string;
  bin?: string;
  notes: string;
  created_at?: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  inventory_item_id: string;
  item_name: string;
  sku: string;
  movement_type: string;
  quantity: number;
  stock_before: number;
  stock_after: number;
  reason: string;
  vehicle_patente: string;
  mechanic_name: string;
  user_name: string;
  created_at: string;
}

export interface InventorySupplier {
  id: string;
  name: string;
  rut: string;
  phone: string;
  email: string;
  address: string;
  active: boolean;
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
