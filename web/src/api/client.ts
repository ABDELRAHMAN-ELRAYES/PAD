import { logRequest, logResponse } from "./interceptors";
import { parseResponseError, ApiError, NetworkError, TimeoutError } from "./errors";
import type { RequestOptions } from "@/types/api/request";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
const TIMEOUT_MS = 300_000;

async function request<T>(
  path: string,
  options: RequestOptions = {},
  isStream: boolean,
): Promise<T> {
  const { params, body, ...fetchInit } = options;

  // Build URL with options if there are any
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }

  const isFormData = body instanceof FormData;

  // Build headers
  const headers = new Headers({
    ...(!isFormData && { "Content-Type": "application/json" }),
    ...fetchInit.headers,
  });

  // Timeout
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const init: RequestInit = {
    ...fetchInit,
    headers,
    credentials: "include",
    signal: controller.signal,
    body: isFormData
      ? (body as FormData)
      : body !== undefined
        ? JSON.stringify(body)
        : undefined,
  };

  const t0 = Date.now();

  logRequest(init.method ?? "GET", url.pathname, body);

  try {
    const res = await fetch(url.toString(), init);

    logResponse(
      init.method ?? "GET",
      url.pathname,
      res.status,
      Date.now() - t0,
    );

    if (!res.ok) throw await parseResponseError(res);
    if (res.status === 204) return undefined as T; // On No content
    return isStream ? (res as T) : ((await res.json()) as T);
  } catch (err) {
    if ((err as Error)?.name === "AbortError")
      throw new TimeoutError(TIMEOUT_MS);
    if (err instanceof Error && !(err instanceof ApiError))
      throw new NetworkError();
    throw err;
  } finally {
    clearTimeout(tid);
  }
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions, isStream: boolean = false) =>
    request<T>(path, { method: "GET", ...options }, isStream),

  post: <T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
    isStream: boolean = false,
  ) => request<T>(path, { method: "POST", body, ...options }, isStream),

  patch: <T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
    isStream: boolean = false,
  ) => request<T>(path, { method: "PATCH", body, ...options }, isStream),

  put: <T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
    isStream: boolean = false,
  ) => request<T>(path, { method: "PUT", body, ...options }, isStream),

  delete: <T = void>(
    path: string,
    options?: RequestOptions,
    isStream: boolean = false,
  ) => request<T>(path, { method: "DELETE", ...options }, isStream),
};

// Helper to read NDJSON streams
export async function readNdJsonStream(
  response: Response,
  onChunk: (data: any) => void
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Response body is null");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        try {
          const data = JSON.parse(trimmed);
          onChunk(data);
        } catch (e) {
          console.warn("Failed to parse JSON stream chunk:", trimmed, e);
        }
      }
    }
    
    // Final buffer flush
    if (buffer.trim()) {
      try {
        const data = JSON.parse(buffer);
        onChunk(data);
      } catch (e) {
        // ignore
      }
    }
  } finally {
    reader.releaseLock();
  }
}
