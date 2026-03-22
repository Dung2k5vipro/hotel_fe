const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const isBrowser = typeof window !== "undefined";

export const API_URL = isBrowser ? "" : BACKEND_API_URL;
export const API_CONNECTION_ERROR_MESSAGE =
  "Không thể kết nối tới máy chủ. Vui lòng kiểm tra cấu hình API.";

type RequestOptions = Omit<RequestInit, "body" | "headers" | "method"> & {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: HeadersInit;
  token?: string | null;
};

type ErrorPayload = {
  message?: string;
  error?: string;
  data?:
    | {
        message?: string;
        error?: string;
      }
    | string;
};

export class ApiRequestError extends Error {
  status: number;
  statusText: string;
  payload: unknown;
  path: string;
  method: string;

  constructor(params: {
    message: string;
    status: number;
    statusText: string;
    payload: unknown;
    path: string;
    method: string;
  }) {
    super(params.message);
    this.name = "ApiRequestError";
    this.status = params.status;
    this.statusText = params.statusText;
    this.payload = params.payload;
    this.path = params.path;
    this.method = params.method;
  }
}

function buildBody(body: unknown) {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (typeof body === "string" || body instanceof FormData) {
    return body;
  }

  return JSON.stringify(body);
}

export async function parseResponseBody(response: Response) {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function resolveErrorMessage(
  payload: unknown,
  fallback: string,
): string {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const data = payload as ErrorPayload;

    if (typeof data.message === "string" && data.message.trim().length > 0) {
      return data.message;
    }

    if (typeof data.error === "string" && data.error.trim().length > 0) {
      return data.error;
    }

    if (typeof data.data === "string" && data.data.trim().length > 0) {
      return data.data;
    }

    if (
      typeof data.data === "object" &&
      data.data !== null &&
      typeof data.data.message === "string" &&
      data.data.message.trim().length > 0
    ) {
      return data.data.message;
    }

    if (
      typeof data.data === "object" &&
      data.data !== null &&
      typeof data.data.error === "string" &&
      data.data.error.trim().length > 0
    ) {
      return data.data.error;
    }
  }

  return fallback;
}

export async function requestWithMeta<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{
  data: T;
  payload: unknown;
  status: number;
  statusText: string;
}> {
  const { body, headers, method = "GET", token, ...rest } = options;
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has("Content-Type") && !(body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      method,
      headers: requestHeaders,
      body: buildBody(body),
    });
  } catch {
    throw new Error(API_CONNECTION_ERROR_MESSAGE);
  }

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    throw new ApiRequestError({
      message: resolveErrorMessage(
        payload,
        `Yêu cầu thất bại (${response.status} ${response.statusText}).`,
      ),
      status: response.status,
      statusText: response.statusText,
      payload,
      path,
      method,
    });
  }

  return {
    data: payload as T,
    payload,
    status: response.status,
    statusText: response.statusText,
  };
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await requestWithMeta<T>(path, options);
  return response.data;
}
