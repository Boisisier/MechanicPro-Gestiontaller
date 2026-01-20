const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const authTokenStorageKey = 'auth_token';

export const getAuthToken = () => localStorage.getItem(authTokenStorageKey);
export const setAuthToken = (token: string) => localStorage.setItem(authTokenStorageKey, token);
export const clearAuthToken = () => localStorage.removeItem(authTokenStorageKey);

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const error = new Error(payload?.error || 'request_failed');
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

export const getVehicles = async () =>
  handleResponse(
    await fetch(`${apiBaseUrl}/vehicles`, {
      headers: withAuthHeader(),
    })
  );

export const createVehicle = async (body: unknown) =>
  handleResponse(
    await fetch(`${apiBaseUrl}/vehicles`, {
      method: 'POST',
      headers: withAuthHeader({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    })
  );

export const updateVehicle = async (id: string, body: unknown) =>
  handleResponse(
    await fetch(`${apiBaseUrl}/vehicles/${id}`, {
      method: 'PUT',
      headers: withAuthHeader({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    })
  );

export const deleteVehicle = async (id: string) =>
  handleResponse(
    await fetch(`${apiBaseUrl}/vehicles/${id}`, {
      method: 'DELETE',
      headers: withAuthHeader(),
    })
  );

export const login = async (payload: {
  email: string;
  password: string;
  company_id?: string;
}) =>
  handleResponse(
    await fetch(`${apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  );

export const loginOwner = async (payload: { email: string; password: string }) =>
  handleResponse(
    await fetch(`${apiBaseUrl}/auth/owner/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  );

export const acceptInvitation = async (payload: {
  token: string;
  full_name: string;
  password: string;
}) =>
  handleResponse(
    await fetch(`${apiBaseUrl}/auth/invitations/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  );

export const getSession = async () =>
  handleResponse(
    await fetch(`${apiBaseUrl}/auth/me`, {
      headers: withAuthHeader(),
    })
  );

export const adminGetCompanies = async () =>
  handleResponse(
    await fetch(`${apiBaseUrl}/admin/companies`, {
      headers: withAuthHeader(),
    })
  );

export const adminCreateCompany = async (name: string) =>
  handleResponse(
    await fetch(`${apiBaseUrl}/admin/companies`, {
      method: 'POST',
      headers: withAuthHeader({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name }),
    })
  );

export const adminCreateInvitation = async (payload: {
  company_id: string;
  email: string;
  role: string;
}) =>
  handleResponse(
    await fetch(`${apiBaseUrl}/admin/invitations`, {
      method: 'POST',
      headers: withAuthHeader({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    })
  );

export const adminImpersonate = async (company_id: string) =>
  handleResponse(
    await fetch(`${apiBaseUrl}/admin/impersonate`, {
      method: 'POST',
      headers: withAuthHeader({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ company_id }),
    })
  );

export const adminGetSupportSessions = async () =>
  handleResponse(
    await fetch(`${apiBaseUrl}/admin/support-sessions`, {
      headers: withAuthHeader(),
    })
  );


