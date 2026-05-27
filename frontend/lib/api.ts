type FetchOptions = RequestInit & {
  params?: Record<string, string>;
};

function isBrowser() {
  return typeof window !== "undefined";
}

let accessToken: string | null = isBrowser() ? localStorage.getItem("ta_access") : null;
let refreshToken: string | null = isBrowser() ? localStorage.getItem("ta_refresh") : null;
let refreshPromise: Promise<string | null> | null = null;

export function setTokens(access: string, refresh?: string) {
  accessToken = access;
  if (refresh) refreshToken = refresh;
  if (isBrowser()) {
    localStorage.setItem("ta_access", access);
    if (refresh) localStorage.setItem("ta_refresh", refresh);
  }
}

export function getAccessToken(): string | null {
  if (!accessToken && isBrowser()) {
    accessToken = localStorage.getItem("ta_access");
  }
  return accessToken;
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  if (isBrowser()) {
    localStorage.removeItem("ta_access");
    localStorage.removeItem("ta_refresh");
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshToken) return null;

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        clearTokens();
        return null;
      }

      const data = await response.json();
      accessToken = data.access_token;
      return accessToken;
    } catch {
      clearTokens();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, headers: customHeaders, ...rest } = options;

  let url = endpoint.startsWith("http") ? endpoint : `/api${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };

  if (!(rest.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let response = await fetch(url, { ...rest, headers });

  if (response.status === 401 && refreshToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(url, { ...rest, headers });
    } else {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new ApiError("Unauthorized", 401);
    }
  }

  if (response.status === 401) {
    clearTokens();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError("Unauthorized", 401);
  }

  if (!response.ok) {
    let message = "An error occurred";
    try {
      const errorData = await response.json();
      const detail = errorData.detail || errorData.message;
      if (typeof detail === "string") {
        message = detail;
      } else if (Array.isArray(detail)) {
        message = detail.map((d: { msg?: string }) => d.msg || String(d)).join(", ");
      } else if (detail && typeof detail === "object") {
        message = JSON.stringify(detail);
      }
    } catch {
      message = response.statusText;
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = {
  get: <T = unknown>(endpoint: string, params?: Record<string, string>) =>
    apiFetch<T>(endpoint, { method: "GET", params }),

  post: <T = unknown>(endpoint: string, body?: unknown) =>
    apiFetch<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = unknown>(endpoint: string, body?: unknown) =>
    apiFetch<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = unknown>(endpoint: string) =>
    apiFetch<T>(endpoint, { method: "DELETE" }),

  upload: <T = unknown>(endpoint: string, formData: FormData) =>
    apiFetch<T>(endpoint, {
      method: "POST",
      body: formData,
    }),
};
