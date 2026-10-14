const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

// El JWT real vive en una cookie httpOnly (el servidor la setea en /auth/login,
// /auth/demo-login); JavaScript nunca la puede leer, ni con XSS. Esta clave solo guarda una
// bandera no-secreta de "hay sesión iniciada" para decidir si vale la pena llamar a /auth/me al
// cargar la app — no es una credencial.
const sessionFlagStorageKey = "auth_token";

export const getAuthToken = () => localStorage.getItem(sessionFlagStorageKey);
export const setAuthToken = (value: string) =>
  localStorage.setItem(sessionFlagStorageKey, value);
export const clearAuthToken = () =>
  localStorage.removeItem(sessionFlagStorageKey);

// El token CSRF también viaja como cookie legible por JS, pero eso solo sirve si el frontend y
// la API comparten dominio. Cuando viven en subdominios distintos (ej. dos servicios separados
// en producción), document.cookie no puede leer la cookie del otro dominio — aislamiento normal
// entre orígenes, no tiene que ver con httpOnly. Por eso el servidor también lo manda en el body
// de /auth/login, /auth/demo-login y /auth/me, y acá se cachea en memoria.
let cachedCsrfToken: string | null = null;
const setCsrfToken = (token?: string | null) => {
  if (token) cachedCsrfToken = token;
};

// Evento que avisa que la cuenta del taller está suspendida o cancelada. Se emite en un evento
// del window en vez de propagarse por el valor de retorno porque cualquiera de las decenas de
// llamadas a la API puede ser la que reciba el 402, y todas tienen su propio catch con un
// mensaje propio ("no se pudo guardar el vehículo", etc.) que no explicaría la causa real.
export const SUBSCRIPTION_INACTIVE_EVENT = "mechanicpro:subscription-inactive";

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    // 402 = la empresa está suspendida (ver ensureWritable en server/index.js). Solo afecta a
    // las operaciones que escriben; la lectura sigue funcionando, así que la app no se cierra:
    // se avisa con un cartel fijo y el usuario puede seguir consultando sus datos.
    if (response.status === 402) {
      window.dispatchEvent(
        new CustomEvent(SUBSCRIPTION_INACTIVE_EVENT, {
          detail: { status: payload?.subscription_status || "suspendida" },
        }),
      );
    }
    const error = new Error(payload?.error || "request_failed");
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return response.json();
};

// Wrapper único para todas las llamadas a la API: siempre manda la cookie de sesión
// (credentials: "include") y, en requests que mutan datos, el header X-CSRF-Token que el
// servidor compara contra la cookie csrf_token (protección CSRF de doble cookie).
const apiFetch = (path: string, init: RequestInit = {}) => {
  const method = (init.method || "GET").toUpperCase();
  const headers: HeadersInit = { ...init.headers };
  if (method !== "GET" && method !== "HEAD" && cachedCsrfToken) {
    (headers as Record<string, string>)["X-CSRF-Token"] = cachedCsrfToken;
  }
  return fetch(`${apiBaseUrl}${path}`, {
    ...init,
    method,
    credentials: "include",
    headers,
  });
};

export const loginDemo = async () => {
  const body = await handleResponse(await apiFetch("/auth/demo-login", { method: "POST" }));
  setCsrfToken(body.csrfToken);
  return body;
};

export const login = async (body: { email: string; password: string }) => {
  const session = await handleResponse(
    await apiFetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  setCsrfToken(session.csrfToken);
  return session;
};

export const logout = async () => {
  const result = await handleResponse(await apiFetch("/auth/logout", { method: "POST" }));
  cachedCsrfToken = null;
  return result;
};

export const getSession = async () => {
  const body = await handleResponse(await apiFetch("/auth/me"));
  setCsrfToken(body.csrfToken);
  return body;
};

export const getVehicles = async () => handleResponse(await apiFetch("/vehicles"));

export const createVehicle = async (body: unknown) =>
  handleResponse(
    await apiFetch("/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const updateVehicle = async (id: string, body: unknown) =>
  handleResponse(
    await apiFetch(`/vehicles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const deleteVehicle = async (id: string) =>
  handleResponse(await apiFetch(`/vehicles/${id}`, { method: "DELETE" }));

export const getRoles = async () => handleResponse(await apiFetch("/roles"));

export const getWorkshopUsers = async () =>
  handleResponse(await apiFetch("/workshop-users"));

export const createWorkshopUser = async (body: unknown) =>
  handleResponse(
    await apiFetch("/workshop-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const updateWorkshopUser = async (id: string, body: unknown) =>
  handleResponse(
    await apiFetch(`/workshop-users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const deleteWorkshopUser = async (id: string) =>
  handleResponse(await apiFetch(`/workshop-users/${id}`, { method: "DELETE" }));

export const getInventoryItems = async () =>
  handleResponse(await apiFetch("/inventory-items"));

export const createInventoryItem = async (body: unknown) =>
  handleResponse(
    await apiFetch("/inventory-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const updateInventoryItem = async (id: string, body: unknown) =>
  handleResponse(
    await apiFetch(`/inventory-items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const deleteInventoryItem = async (id: string) =>
  handleResponse(await apiFetch(`/inventory-items/${id}`, { method: "DELETE" }));

export const getBudgets = async (filters?: {
  status?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return handleResponse(await apiFetch(`/budgets${query ? `?${query}` : ""}`));
};

export const getInventoryMovements = async () =>
  handleResponse(await apiFetch("/inventory-movements"));

export const getInventorySuppliers = async () =>
  handleResponse(await apiFetch("/inventory-suppliers"));

export const createInventorySupplier = async (body: unknown) =>
  handleResponse(
    await apiFetch("/inventory-suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const getInventoryPurchaseOrders = async () =>
  handleResponse(await apiFetch("/inventory-purchase-orders"));

export const createInventoryPurchaseOrder = async (body: unknown) =>
  handleResponse(
    await apiFetch("/inventory-purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const receiveInventoryPurchaseOrder = async (id: string) =>
  handleResponse(
    await apiFetch(`/inventory-purchase-orders/${id}/receive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }),
  );

export const getInventoryStockCounts = async () =>
  handleResponse(await apiFetch("/inventory-stock-counts"));

export const createInventoryStockCount = async (body: unknown) =>
  handleResponse(
    await apiFetch("/inventory-stock-counts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const completeInventoryStockCount = async (id: string) =>
  handleResponse(
    await apiFetch(`/inventory-stock-counts/${id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }),
  );

export const createBudget = async (body: unknown) =>
  handleResponse(
    await apiFetch("/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const updateBudget = async (id: string, body: unknown) =>
  handleResponse(
    await apiFetch(`/budgets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const deleteBudget = async (id: string) =>
  handleResponse(await apiFetch(`/budgets/${id}`, { method: "DELETE" }));

export const getAuditLogs = async (filters?: {
  date_from?: string;
  date_to?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.date_from) {
    params.set("date_from", filters.date_from);
  }
  if (filters?.date_to) {
    params.set("date_to", filters.date_to);
  }
  const query = params.toString();

  return handleResponse(await apiFetch(`/audit-logs${query ? `?${query}` : ""}`));
};

export const createAuditLog = async (body: unknown) =>
  handleResponse(
    await apiFetch("/audit-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const getParkingReleases = async () =>
  handleResponse(await apiFetch("/parking-releases"));

export const createParkingRelease = async (body: unknown) =>
  handleResponse(
    await apiFetch("/parking-releases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const deleteParkingRelease = async (vehicleId: string) =>
  handleResponse(await apiFetch(`/parking-releases/${vehicleId}`, { method: "DELETE" }));

export const updateBudgetStatus = async (
  id: string,
  body: { status: string; converted_vehicle_id?: string },
) =>
  handleResponse(
    await apiFetch(`/budgets/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const getServiceCategories = async () =>
  handleResponse(await apiFetch("/service-categories"));

export const createServiceCategory = async (body: unknown) =>
  handleResponse(
    await apiFetch("/service-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const updateServiceCategory = async (id: string, body: unknown) =>
  handleResponse(
    await apiFetch(`/service-categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const getServiceCatalog = async (includeInactive = false) =>
  handleResponse(
    await apiFetch(
      `/service-catalog${includeInactive ? "?include_inactive=true" : ""}`,
    ),
  );

export const createServiceCatalogItem = async (body: unknown) =>
  handleResponse(
    await apiFetch("/service-catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const updateServiceCatalogItem = async (id: string, body: unknown) =>
  handleResponse(
    await apiFetch(`/service-catalog/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
