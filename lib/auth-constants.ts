export const AUTH_COOKIE_NAME = "hotel_token";
export const AUTH_SESSION_ISSUED_AT_COOKIE_NAME = "hotel_token_iat";

const INVALID_TOKEN_VALUES = new Set([
  "",
  "null",
  "undefined",
  "false",
  "nan",
]);

export function normalizeAuthTokenValue(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const token = value.trim();

  if (token.length === 0) {
    return null;
  }

  if (INVALID_TOKEN_VALUES.has(token.toLowerCase())) {
    return null;
  }

  return token;
}

export function normalizeIssuedAtValue(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const issuedAt = Number(normalized);

  if (!Number.isFinite(issuedAt) || issuedAt <= 0) {
    return null;
  }

  return issuedAt;
}
