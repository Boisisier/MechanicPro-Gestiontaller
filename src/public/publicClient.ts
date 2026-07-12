// Cliente mínimo para las páginas públicas (seguimiento de vehículo, aprobación de
// presupuesto): no usa apiFetch de src/shared/lib/api.ts a propósito — ese wrapper manda la
// cookie de sesión del staff (credentials: "include") y un header CSRF pensado para el flujo
// autenticado. Estas páginas se autentican con un token en la URL, no con una sesión, así que
// un fetch simple evita mezclar por error la sesión del staff si abre el link en el mismo
// navegador donde tiene el dashboard abierto.
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export class PublicApiError extends Error {
  status: number;
  body: Record<string, unknown> | null;
  constructor(status: number, message: string, body: Record<string, unknown> | null) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export const publicFetch = async (path: string, init?: RequestInit) => {
  const response = await fetch(`${apiBaseUrl}${path}`, init);
  let payload: Record<string, unknown> | null = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const message = (payload?.error as string | undefined) || "request_failed";
    throw new PublicApiError(response.status, message, payload);
  }
  return payload;
};

export const getTokenFromUrl = () => new URLSearchParams(window.location.search).get("token");
