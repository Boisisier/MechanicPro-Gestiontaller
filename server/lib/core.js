export const normalizePatente = (value = "") => {
  const normalized = String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  if (normalized.length <= 2) return normalized;
  if (/^[A-Z]{2}\d/.test(normalized)) {
    return `${normalized.slice(0, 2)}-${normalized.slice(2)}`;
  }
  if (normalized.length <= 4) return normalized;
  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
};

export const calculateBudgetTotal = (
  items,
  discountPercent,
  taxPercent,
) => {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );
  return Math.round(
    subtotal *
      (1 - Math.min(100, Math.max(0, discountPercent)) / 100) *
      (1 + Math.min(100, Math.max(0, taxPercent)) / 100),
  );
};

export const splitServicePrice = (service = "") => {
  const match = String(service).match(/^(.*?)\s*\(\$\s*([^)]+)\)\s*$/);
  return {
    name: (match?.[1] || service).trim(),
    price: match?.[2]?.replace(/[^\d]/g, "") || "",
  };
};
