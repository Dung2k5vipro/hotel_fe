import {
  API_CONNECTION_ERROR_MESSAGE,
  resolveErrorMessage,
} from "@/services/api";
import {
  AUTH_COOKIE_NAME,
  AUTH_SESSION_ISSUED_AT_COOKIE_NAME,
  normalizeAuthTokenValue,
  normalizeIssuedAtValue,
} from "@/lib/auth-constants";
import type {
  LoginRequest,
  LoginResponse,
  NormalizedLoginResponse,
  TaiKhoan,
  VaiTro,
} from "@/types/tai-khoan";
import { normalizeLoginResponse, normalizeUser } from "@/types/tai-khoan";

const LOGIN_PATH = "/api/auth/login";
const TOKEN_STORAGE_KEY = "hotel_token";
const USER_STORAGE_KEY = "hotel_user";
export const AUTH_CHANGE_EVENT = "auth-changed";
const REMEMBER_ME_STORAGE_KEY = "hotel_remember_me";
const INVALID_CREDENTIALS_MESSAGE = "Tên đăng nhập hoặc mật khẩu không đúng";
const ACCOUNT_LOCKED_MESSAGE = "Tài khoản đã bị khóa";
const AUTH_DEBUG_ENABLED = process.env.NODE_ENV !== "production";

type LoginError = Error & {
  status?: number;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function emitAuthChange() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

function readStorageItem(key: string) {
  if (!isBrowser()) {
    return null;
  }

  const sessionValue = window.sessionStorage.getItem(key);

  if (sessionValue !== null) {
    return sessionValue;
  }

  return window.localStorage.getItem(key);
}

function removeStorageItemEverywhere(key: string) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(key);
  window.sessionStorage.removeItem(key);
}

function sanitizeDebugValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeDebugValue(item));
  }

  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;

    return Object.fromEntries(
      Object.entries(source).map(([key, currentValue]) => {
        const normalizedKey = key.toLowerCase();

        if (
          normalizedKey.includes("matkhau") ||
          normalizedKey.includes("password")
        ) {
          return [key, "***"];
        }

        if (normalizedKey.includes("token")) {
          const tokenValue =
            typeof currentValue === "string"
              ? currentValue
              : String(currentValue ?? "");

          return [
            key,
            tokenValue.length > 8
              ? `${tokenValue.slice(0, 8)}... (${tokenValue.length} ký tự)`
              : `*** (${tokenValue.length} ký tự)`,
          ];
        }

        return [key, sanitizeDebugValue(currentValue)];
      }),
    );
  }

  return value;
}

function debugAuth(step: string, payload: Record<string, unknown>) {
  if (!AUTH_DEBUG_ENABLED) {
    return;
  }

  console.log(`[auth.login] ${step}`, sanitizeDebugValue(payload));
}

function getApiOrigin() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return process.env.NEXT_PUBLIC_API_URL ?? "";
}

function getLoginUrl() {
  const apiOrigin = getApiOrigin();

  if (!apiOrigin) {
    return LOGIN_PATH;
  }

  try {
    return new URL(LOGIN_PATH, apiOrigin).toString();
  } catch {
    return LOGIN_PATH;
  }
}

function buildDebugBodyPreview(body: Record<string, unknown>) {
  const payloadKeys = Object.keys(body);
  const userName =
    typeof body.TenDangNhap === "string"
      ? body.TenDangNhap
      : typeof body.tenDangNhap === "string"
        ? body.tenDangNhap
        : "";
  const password =
    typeof body.MatKhau === "string"
      ? body.MatKhau
      : typeof body.matKhau === "string"
        ? body.matKhau
        : "";

  return {
    payloadKeys,
    tenDangNhap: userName,
    passwordLength: password.length,
  };
}

function getResponseShape(raw: unknown) {
  if (Array.isArray(raw)) {
    return {
      type: "array",
      length: raw.length,
    };
  }

  if (raw && typeof raw === "object") {
    return {
      type: "object",
      keys: Object.keys(raw as Record<string, unknown>),
    };
  }

  return {
    type: typeof raw,
  };
}

function getUserCandidate(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const source = raw as Record<string, unknown>;
  const data =
    source.data && typeof source.data === "object" && !Array.isArray(source.data)
      ? (source.data as Record<string, unknown>)
      : null;

  return (
    source.user ??
    source.User ??
    source.taiKhoan ??
    source.TaiKhoan ??
    data?.user ??
    data?.User ??
    data?.taiKhoan ??
    data?.TaiKhoan ??
    data
  );
}

function createLoginError(message: string, status?: number) {
  const error = new Error(message) as LoginError;

  if (status !== undefined) {
    error.status = status;
  }

  return error;
}

function shouldTryNextVariant(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const requestError = error as LoginError;

  return [400, 401, 422].includes(requestError.status ?? 0);
}

export async function login(
  payload: LoginRequest,
): Promise<NormalizedLoginResponse> {
  const normalizedTenDangNhap = payload.tenDangNhap.trim();
  const requestBodies: Array<Record<string, unknown>> = [
    {
      TenDangNhap: normalizedTenDangNhap,
      MatKhau: payload.matKhau,
    },
    {
      tenDangNhap: normalizedTenDangNhap,
      matKhau: payload.matKhau,
    },
  ];

  let lastError: unknown = null;

  for (const [index, body] of requestBodies.entries()) {
    debugAuth("request", {
      variant: index === 0 ? "postman_pascal_case" : "fallback_camel_case",
      url: getLoginUrl(),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      ...buildDebugBodyPreview(body),
    });

    try {
      const response = await fetch(LOGIN_PATH, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const text = await response.text();
      let rawResponse: unknown = null;

      if (text) {
        try {
          rawResponse = JSON.parse(text);
        } catch {
          rawResponse = text;
        }
      }

      debugAuth("response", {
        variant: index === 0 ? "postman_pascal_case" : "fallback_camel_case",
        status: response.status,
        ok: response.ok,
        responseShape: getResponseShape(rawResponse),
        rawResponse,
        rawUserCandidate: getUserCandidate(rawResponse),
        rawUserKeys:
          getUserCandidate(rawResponse) &&
          typeof getUserCandidate(rawResponse) === "object" &&
          !Array.isArray(getUserCandidate(rawResponse))
            ? Object.keys(getUserCandidate(rawResponse) as Record<string, unknown>)
            : [],
      });

      if (!response.ok) {
        throw createLoginError(
          resolveErrorMessage(rawResponse, INVALID_CREDENTIALS_MESSAGE),
          response.status,
        );
      }

      let normalized: NormalizedLoginResponse;

      try {
        normalized = normalizeLoginResponse(rawResponse as LoginResponse);
      } catch (error) {
        debugAuth("normalize_error", {
          variant: index === 0 ? "postman_pascal_case" : "fallback_camel_case",
          responseShape: getResponseShape(rawResponse),
          rawResponse,
          message: error instanceof Error ? error.message : "unknown",
        });
        throw error;
      }

      debugAuth("normalized", {
        variant: index === 0 ? "postman_pascal_case" : "fallback_camel_case",
        normalizedToken: normalized.token,
        normalizedUser: normalized.user,
      });

      return normalized;
    } catch (error) {
      if (error instanceof TypeError) {
        const connectionError = createLoginError(API_CONNECTION_ERROR_MESSAGE);

        debugAuth("network_error", {
          url: getLoginUrl(),
          message: connectionError.message,
        });

        throw connectionError;
      }

      if (
        error instanceof Error &&
        error.message === API_CONNECTION_ERROR_MESSAGE
      ) {
        debugAuth("network_error", {
          url: getLoginUrl(),
          message: error.message,
        });

        throw error;
      }

      if (
        error instanceof Error &&
        (error.message.includes("Failed to fetch") ||
          error.message.includes("fetch failed") ||
          error.message.includes("Load failed"))
      ) {
        const connectionError = createLoginError(API_CONNECTION_ERROR_MESSAGE);

        debugAuth("network_error", {
          url: getLoginUrl(),
          message: connectionError.message,
        });

        throw connectionError;
      }

      lastError = error;

      if (index < requestBodies.length - 1 && shouldTryNextVariant(error)) {
        debugAuth("retry_next_variant", {
          reason: error instanceof Error ? error.message : "unknown",
        });
        continue;
      }

      throw error;
    }
  }

  throw lastError ?? createLoginError(INVALID_CREDENTIALS_MESSAGE);
}

export function resolveLoginErrorMessage(error: unknown) {
  if (!(error instanceof Error) || error.message.trim().length === 0) {
    return INVALID_CREDENTIALS_MESSAGE;
  }

  const normalizedMessage = error.message.trim();

  if (normalizedMessage === API_CONNECTION_ERROR_MESSAGE) {
    return API_CONNECTION_ERROR_MESSAGE;
  }

  return normalizedMessage;
}

export function setStoredAuth(
  token: string,
  user: TaiKhoan,
  rememberMe = true,
) {
  if (!isBrowser()) {
    return;
  }

  const normalizedToken = normalizeAuthTokenValue(token);

  if (!normalizedToken) {
    clearStoredAuth();
    return;
  }

  const normalizedUser = normalizeUser(user);
  const serializedUser = JSON.stringify(normalizedUser);

  if (rememberMe) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, normalizedToken);
    window.localStorage.setItem(USER_STORAGE_KEY, serializedUser);
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    window.sessionStorage.removeItem(USER_STORAGE_KEY);
  } else {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, normalizedToken);
    window.sessionStorage.setItem(USER_STORAGE_KEY, serializedUser);
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(USER_STORAGE_KEY);
  }

  window.localStorage.setItem(REMEMBER_ME_STORAGE_KEY, rememberMe ? "1" : "0");
  emitAuthChange();
}

export function getStoredToken() {
  if (!isBrowser()) {
    return null;
  }

  const rawToken = readStorageItem(TOKEN_STORAGE_KEY);
  const normalizedToken = normalizeAuthTokenValue(rawToken);

  if (normalizedToken) {
    return normalizedToken;
  }

  if (rawToken !== null) {
    removeStorageItemEverywhere(TOKEN_STORAGE_KEY);
  }

  return null;
}

export function getStoredUser() {
  if (!isBrowser()) {
    return null;
  }

  const rawUserCandidates = [
    window.sessionStorage.getItem(USER_STORAGE_KEY),
    window.localStorage.getItem(USER_STORAGE_KEY),
  ];

  for (const rawUser of rawUserCandidates) {
    if (!rawUser) {
      continue;
    }

    try {
      const normalizedUser = normalizeUser(JSON.parse(rawUser));

      if (!normalizedUser.tenDangNhap) {
        continue;
      }

      return normalizedUser;
    } catch {
      continue;
    }
  }

  if (rawUserCandidates.some((item) => item !== null)) {
    removeStorageItemEverywhere(USER_STORAGE_KEY);
  }

  return null;
}

export function getRememberMePreference() {
  if (!isBrowser()) {
    return true;
  }

  return window.localStorage.getItem(REMEMBER_ME_STORAGE_KEY) !== "0";
}

export function hasStoredSession() {
  const token = getStoredToken();
  const user = getStoredUser();

  return Boolean(token && user && user.tenDangNhap && user.hoTen);
}

export function clearStoredAuth() {
  if (!isBrowser()) {
    return;
  }

  removeStorageItemEverywhere(TOKEN_STORAGE_KEY);
  removeStorageItemEverywhere(USER_STORAGE_KEY);
  window.localStorage.removeItem(REMEMBER_ME_STORAGE_KEY);
  window.sessionStorage.removeItem(REMEMBER_ME_STORAGE_KEY);
  emitAuthChange();
}

export function getAuthCookie() {
  if (typeof document === "undefined") {
    return null;
  }

  const getCookieValue = (cookieName: string) =>
    document.cookie
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${cookieName}=`))
      ?.slice(cookieName.length + 1) ?? null;

  const tokenCookieValue = getCookieValue(AUTH_COOKIE_NAME);

  if (!tokenCookieValue) {
    return null;
  }

  const decodedToken = decodeURIComponent(tokenCookieValue);
  const normalizedToken = normalizeAuthTokenValue(decodedToken);
  const issuedAtRaw = getCookieValue(AUTH_SESSION_ISSUED_AT_COOKIE_NAME);
  const normalizedIssuedAt = normalizeIssuedAtValue(issuedAtRaw);

  if (normalizedToken && normalizedIssuedAt) {
    return normalizedToken;
  }

  clearAuthCookie();
  return null;
}

export function setAuthCookie(token: string, rememberMe = true) {
  if (typeof document === "undefined") {
    return;
  }

  void rememberMe;

  const normalizedToken = normalizeAuthTokenValue(token);

  if (!normalizedToken) {
    clearAuthCookie();
    return;
  }

  const issuedAt = Date.now().toString();

  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(normalizedToken)}; Path=/; SameSite=Lax`;
  document.cookie = `${AUTH_SESSION_ISSUED_AT_COOKIE_NAME}=${issuedAt}; Path=/; SameSite=Lax`;
}

export function clearAuthCookie() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = `${AUTH_SESSION_ISSUED_AT_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function logout() {
  clearStoredAuth();
  clearAuthCookie();
}

export function isAdmin(user: TaiKhoan | null) {
  return user?.vaiTro === "Admin";
}

export function isNhanVien(user: TaiKhoan | null) {
  return user?.vaiTro === "NhanVien";
}

export function getRoleLabel(role?: VaiTro) {
  if (role === "Admin") {
    return "Admin";
  }

  return "Nhân viên";
}

export { ACCOUNT_LOCKED_MESSAGE, INVALID_CREDENTIALS_MESSAGE };
