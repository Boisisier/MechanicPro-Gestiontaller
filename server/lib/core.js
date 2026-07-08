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

export const cleanRut = (value = "") =>
  String(value).toUpperCase().replace(/[^0-9K]/g, "");

const computeRutVerifier = (body) => {
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return "0";
  if (remainder === 10) return "K";
  return String(remainder);
};

export const isValidRut = (value = "") => {
  const clean = cleanRut(value);
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const verifier = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;
  return computeRutVerifier(body) === verifier;
};

export const formatRut = (value = "") => {
  const clean = cleanRut(value);
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const verifier = clean.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots}-${verifier}`;
};
