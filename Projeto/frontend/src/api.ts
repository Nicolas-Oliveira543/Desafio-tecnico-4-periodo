export type ResourceKey = "users" | "courses" | "modules" | "contents" | "attendance";

export type ApiRecord = {
  id: number;
  [field: string]: unknown;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers
      }
    });
  } catch {
    throw new ApiError("The API could not be reached. Make sure the backend is running on port 3000.", 0);
  }

  const body = await response.json().catch(() => null) as Record<string, unknown> | null;

  if (!response.ok) {
    const message =
      (typeof body?.message === "string" && body.message) ||
      (typeof body?.error === "string" && body.error) ||
      `The request failed with status ${response.status}.`;
    throw new ApiError(message, response.status, body?.details);
  }

  return body as T;
}

export const api = {
  getAll<T extends ApiRecord>(resource: ResourceKey): Promise<T[]> {
    return request<T[]>(`/api/${resource}`);
  },

  create<T extends ApiRecord>(resource: ResourceKey, data: Record<string, unknown>): Promise<T> {
    return request<T>(`/api/${resource}`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  update<T extends ApiRecord>(resource: ResourceKey, id: number, data: Record<string, unknown>): Promise<T> {
    return request<T>(`/api/${resource}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  delete(resource: ResourceKey, id: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/${resource}/${id}`, {
      method: "DELETE"
    });
  }
};
