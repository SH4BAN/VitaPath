const API_URL = import.meta.env.VITE_API_URL || "/api";
export const SOCKET_URL = API_URL.startsWith("http")
  ? API_URL.replace(/\/api\/?$/, "")
  : "";
const TOKEN_KEY = "safe_token";
const USER_KEY = "safe_user";

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: "parent" | "doctor" | "admin" | "municipality";
  phone?: string;
  municipality?: string;
  address?: string;
};

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): SafeUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function storeSession(token: string, user: SafeUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.token ?? getStoredToken();
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Request failed");
  }
  return data as T;
}

export async function login(email: string, password: string) {
  const data = await apiRequest<{ token: string; user: SafeUser }>("/auth/login", {
    method: "POST",
    body: { email, password },
    token: null,
  });
  storeSession(data.token, data.user);
  return data;
}

export async function registerAccount(name: string, email: string, password: string, role: "parent" | "doctor" | "municipality", municipality?: string) {
  const data = await apiRequest<{ token: string; user: SafeUser }>("/auth/register", {
    method: "POST",
    body: { name, email, password, role, ...(municipality ? { municipality } : {}) },
    token: null,
  });
  storeSession(data.token, data.user);
  return data;
}
