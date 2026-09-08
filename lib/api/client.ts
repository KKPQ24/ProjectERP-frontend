/**
 * MiniProject ERP - API Fetch Client
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

const TOKEN_KEY =
  process.env.NEXT_PUBLIC_TOKEN_KEY || process.env.TOKEN_KEY || "";

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Token storage helpers (LocalStorage in browser, fallback-safe in SSR)
 */
export function getStoredToken(): string | null {
  if (typeof window !== "undefined" && TOKEN_KEY) {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export function setStoredToken(token: string): void {
  if (typeof window !== "undefined" && TOKEN_KEY) {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function removeStoredToken(): void {
  if (typeof window !== "undefined" && TOKEN_KEY) {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Low-level API fetch wrapper
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getStoredToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle No Content / Empty responses
  if (response.status === 204) {
    return {} as T;
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    // If response body is not JSON
    if (!response.ok) {
      throw new ApiError(
        response.status,
        response.statusText || "Request failed"
      );
    }
    return {} as T;
  }

  if (!response.ok) {
    const errorData = json as { message?: string };
    const errorMessage =
      errorData?.message ||
      `HTTP Error ${response.status}: ${response.statusText}`;
    throw new ApiError(response.status, errorMessage, json);
  }

  return json as T;
}

/**
 * High-level HTTP Request methods
 */
export const apiClient = {
  get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined | null>,
    options?: RequestInit
  ): Promise<T> {
    let finalEndpoint = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          searchParams.append(key, String(val));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        finalEndpoint += `${finalEndpoint.includes("?") ? "&" : "?"}${queryString}`;
      }
    }
    return apiFetch<T>(finalEndpoint, { ...options, method: "GET" });
  },

  post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return apiFetch<T>(endpoint, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return apiFetch<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return apiFetch<T>(endpoint, {
      ...options,
      method: "DELETE",
    });
  },
};
