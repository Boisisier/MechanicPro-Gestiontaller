const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
const authTokenStorageKey = "auth_token";

export const getAuthToken = () => localStorage.getItem(authTokenStorageKey);
export const setAuthToken = (token: string) =>
  localStorage.setItem(authTokenStorageKey, token);
export const clearAuthToken = () =>
  localStorage.removeItem(authTokenStorageKey);

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const error = new Error(payload?.error || "request_failed");
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return response.json();
};

const withAuthHeader = (headers: HeadersInit = {}) => {
  const token = getAuthToken();
  if (!token) {
    return headers;
  }
  return { ...headers, Authorization: `Bearer ${token}` };
};

export const loginDemo = async () =>
  handleResponse(
    await fetch(`${apiBaseUrl}/auth/demo-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }),
  );

export const getSession = async () =>
  handleResponse(
    await fetch(`${apiBaseUrl}/auth/me`, {
      headers: withAuthHeader(),
    }),
  );

export const getVehicles = async () =>
  handleResponse(
    await fetch(`${apiBaseUrl}/vehicles`, {
      headers: withAuthHeader(),
    }),
  );

export const createVehicle = async (body: unknown) =>
  handleResponse(
    await fetch(`${apiBaseUrl}/vehicles`, {
      method: "POST",
      headers: withAuthHeader({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    }),
  );

export const updateVehicle = async (id: string, body: unknown) =>
  handleResponse(
    await fetch(`${apiBaseUrl}/vehicles/${id}`, {
      method: "PUT",
      headers: withAuthHeader({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    }),
  );

export const deleteVehicle = async (id: string) =>
  handleResponse(
    await fetch(`${apiBaseUrl}/vehicles/${id}`, {
      method: "DELETE",
      headers: withAuthHeader(),
    }),
  );

export const getRoles = async () =>
  handleResponse(
    await fetch(`${apiBaseUrl}/roles`, {
      headers: withAuthHeader(),
    })
  );

export const getWorkshopUsers = async () =>
  handleResponse(
    await fetch(`${apiBaseUrl}/workshop-users`, {
      headers: withAuthHeader(),
    })
  );

export const createWorkshopUser = async (body: unknown) =>
  handleResponse(
    await fetch(`${apiBaseUrl}/workshop-users`, {
      method: 'POST',
      headers: withAuthHeader({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    })
  );

export const updateWorkshopUser = async (id: string, body: unknown) =>
  handleResponse(
    await fetch(`${apiBaseUrl}/workshop-users/${id}`, {
      method: 'PUT',
      headers: withAuthHeader({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    })
  );

export const deleteWorkshopUser = async (id: string) =>
  handleResponse(
    await fetch(`${apiBaseUrl}/workshop-users/${id}`, {
      method: 'DELETE',
      headers: withAuthHeader(),
    })
  );

export const getInventoryItems = async () =>
  handleResponse(
    await fetch(`${apiBaseUrl}/inventory-items`, {
      headers: withAuthHeader(),
    })
  );

export const createInventoryItem = async (body: unknown) =>
  handleResponse(
    await fetch(`${apiBaseUrl}/inventory-items`, {
      method: 'POST',
      headers: withAuthHeader({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    })
  );

export const updateInventoryItem = async (id: string, body: unknown) =>
  handleResponse(
    await fetch(`${apiBaseUrl}/inventory-items/${id}`, {
      method: 'PUT',
      headers: withAuthHeader({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    })
  );

export const deleteInventoryItem = async (id: string) =>
  handleResponse(
    await fetch(`${apiBaseUrl}/inventory-items/${id}`, {
      method: 'DELETE',
      headers: withAuthHeader(),
    })
  );

export const getBudgets = async () =>
  handleResponse(
    await fetch(`${apiBaseUrl}/budgets`, {
      headers: withAuthHeader(),
    })
  );

export const createBudget = async (body: unknown) =>
  handleResponse(
    await fetch(`${apiBaseUrl}/budgets`, {
      method: 'POST',
      headers: withAuthHeader({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    })
  );

export const updateBudget = async (id: string, body: unknown) =>
  handleResponse(
    await fetch(`${apiBaseUrl}/budgets/${id}`, {
      method: 'PUT',
      headers: withAuthHeader({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    })
  );

export const deleteBudget = async (id: string) =>
  handleResponse(
    await fetch(`${apiBaseUrl}/budgets/${id}`, {
      method: 'DELETE',
      headers: withAuthHeader(),
    })
  );
