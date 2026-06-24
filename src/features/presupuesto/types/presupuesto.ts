export interface BudgetFormData {
  customerName: string;
  customerPhone: string;
  patente: string;
  vehicle: string;
  notes: string;
}

export interface BudgetService {
  id: string;
  name: string;
  price: number;
}

export interface BudgetItem {
  id: string;
  name: string;
  price: number;
}
