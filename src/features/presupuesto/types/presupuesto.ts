export interface BudgetFormData {
  customerName: string;
  customerRut: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerCity: string;
  patente: string;
  vehicle: string;
  notes: string;
  issueDate: string;
  expiryDate: string;
  discountPercent: number;
  taxPercent: number;
  advanceRequired: number;
  paymentMethod: string;
  terms: string;
  status: BudgetStatus;
}

export interface BudgetService {
  id: string;
  name: string;
  price: number;
}

export interface BudgetItem {
  id: string;
  item_type: "servicio" | "repuesto" | "insumo";
  reference_id?: string;
  name: string;
  quantity: number;
  unit_price: number;
  estimated_hours?: number;
}

export type BudgetStatus =
  | "borrador"
  | "enviado"
  | "aprobado"
  | "rechazado"
  | "vencido"
  | "convertido"
  | "anulado";

export interface BudgetQuote {
  id: string;
  customer_name: string;
  customer_rut: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  customer_city: string;
  patente: string;
  vehicle: string;
  notes: string;
  issue_date: string;
  expiry_date?: string | null;
  discount_percent: number;
  tax_percent: number;
  advance_required: number;
  payment_method: string;
  terms: string;
  total: number;
  status: BudgetStatus;
  converted_vehicle_id?: string | null;
  items: BudgetItem[];
  created_at: string;
  updated_at: string;
  public_token?: string;
}
