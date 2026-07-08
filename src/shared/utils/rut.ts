export const cleanRut = (value: string): string =>
  value.toUpperCase().replace(/[^0-9K]/g, '');

const computeRutVerifier = (body: string): string => {
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return String(remainder);
};

export const isValidRut = (value: string): boolean => {
  const clean = cleanRut(value || '');
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const verifier = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;
  return computeRutVerifier(body) === verifier;
};

export const formatRut = (value: string): string => {
  const clean = cleanRut(value || '');
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const verifier = clean.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withDots}-${verifier}`;
};
