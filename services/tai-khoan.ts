import { ApiRequestError, request } from "@/services/api";
import { getStoredToken } from "@/services/auth";
import {
  normalizeTaiKhoan as normalizeTaiKhoanFromType,
  type CreateTaiKhoanPayload,
  type TaiKhoan,
  type UpdateTaiKhoanPayload,
} from "@/types/tai-khoan";

type UnknownRecord = Record<string, unknown>;

const TAI_KHOAN_ENDPOINTS = {
  list: "/api/auth/users",
  create: "/api/auth/register",
  update: (id: number) => `/api/auth/users/${id}`,
  delete: (id: number) => `/api/auth/users/${id}`,
};

function getAuthToken() {
  return getStoredToken();
}

function requireAuthToken() {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
  }

  return token;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function normalizeId(id: number | string) {
  const normalized = readNumber(id);

  if (normalized === null || normalized <= 0) {
    throw new Error("Mã tài khoản không hợp lệ.");
  }

  return normalized;
}

function shouldTryNextBodyVariant(error: unknown) {
  if (error instanceof ApiRequestError) {
    return [400, 404, 405, 415, 422].includes(error.status);
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const statusMatch = error.message.match(/\((\d{3})\s/);
  const statusCode = statusMatch ? Number(statusMatch[1]) : null;

  if (statusCode !== null && [400, 404, 405, 415, 422].includes(statusCode)) {
    return true;
  }

  const normalizedMessage = error.message.toLowerCase();

  return (
    normalizedMessage.includes("required") ||
    normalizedMessage.includes("validation") ||
    normalizedMessage.includes("invalid") ||
    normalizedMessage.includes("không hợp lệ") ||
    normalizedMessage.includes("bat buoc") ||
    normalizedMessage.includes("bắt buộc")
  );
}

function findListResponse(payload: unknown, depth = 0): unknown[] | null {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload) || depth > 6) {
    return null;
  }

  const source = payload as UnknownRecord;
  const candidates = [
    source.data,
    source.items,
    source.results,
    source.result,
    source.payload,
    source.list,
    source.rows,
    source.records,
    source.users,
    source.Users,
    source.taiKhoan,
    source.TaiKhoan,
    source.accounts,
    source.Accounts,
  ];

  for (const candidate of candidates) {
    const found = findListResponse(candidate, depth + 1);

    if (found !== null) {
      return found;
    }
  }

  for (const value of Object.values(source)) {
    if (Array.isArray(value)) {
      return value;
    }
  }

  for (const value of Object.values(source)) {
    const found = findListResponse(value, depth + 1);

    if (found !== null) {
      return found;
    }
  }

  return null;
}

export function extractListResponse(response: unknown) {
  return findListResponse(response) ?? [];
}

export function extractItemResponse(response: unknown, depth = 0): unknown {
  if (Array.isArray(response)) {
    return response[0] ?? response;
  }

  if (!isRecord(response) || depth > 6) {
    return response;
  }

  const source = response as UnknownRecord;
  const candidates = [
    source.data,
    source.item,
    source.result,
    source.payload,
    source.user,
    source.User,
    source.taiKhoan,
    source.TaiKhoan,
    source.account,
    source.Account,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) {
      continue;
    }

    const unwrapped = extractItemResponse(candidate, depth + 1);

    if (unwrapped !== candidate || isRecord(candidate)) {
      return unwrapped;
    }
  }

  return response;
}

export function normalizeTaiKhoan(raw: unknown): TaiKhoan {
  return normalizeTaiKhoanFromType(raw);
}

function tryNormalizeTaiKhoan(raw: unknown) {
  try {
    return normalizeTaiKhoan(raw);
  } catch {
    return null;
  }
}

function normalizeRole(value: string) {
  return value.trim().toLowerCase() === "admin" ? "Admin" : "NhanVien";
}

function buildCreateRequestBodies(payload: CreateTaiKhoanPayload) {
  const normalizedRole = normalizeRole(payload.vaiTro);

  return [
    {
      tenDangNhap: payload.tenDangNhap,
      matKhau: payload.matKhau,
      hoTen: payload.hoTen,
      vaiTro: normalizedRole,
    },
    {
      TenDangNhap: payload.tenDangNhap,
      MatKhau: payload.matKhau,
      HoTen: payload.hoTen,
      VaiTro: normalizedRole,
    },
    {
      TenDangNhap: payload.tenDangNhap,
      MatKhau: payload.matKhau,
      HoTen: payload.hoTen,
      VaiTro: normalizedRole,
      TrangThai: true,
    },
    {
      username: payload.tenDangNhap,
      password: payload.matKhau,
      hoTen: payload.hoTen,
      vaiTro: normalizedRole,
      trangThai: true,
    },
    {
      username: payload.tenDangNhap,
      password: payload.matKhau,
      fullName: payload.hoTen,
      role: normalizedRole,
      status: true,
    },
    {
      Username: payload.tenDangNhap,
      Password: payload.matKhau,
      FullName: payload.hoTen,
      Role: normalizedRole,
      Status: true,
    },
  ];
}

function buildUpdateRequestBodies(payload: UpdateTaiKhoanPayload) {
  const normalizedRole =
    typeof payload.vaiTro === "string" ? normalizeRole(payload.vaiTro) : undefined;
  const normalizedPassword =
    typeof payload.matKhau === "string" && payload.matKhau.trim().length > 0
      ? payload.matKhau
      : undefined;

  const cleanedPayload: UpdateTaiKhoanPayload = {
    hoTen: payload.hoTen,
    vaiTro: normalizedRole,
    trangThai: payload.trangThai,
  };

  if (normalizedPassword) {
    cleanedPayload.matKhau = normalizedPassword;
  }

  return [
    {
      hoTen: cleanedPayload.hoTen,
      vaiTro: cleanedPayload.vaiTro,
      trangThai: cleanedPayload.trangThai,
      matKhau: cleanedPayload.matKhau,
    },
    {
      HoTen: cleanedPayload.hoTen,
      VaiTro: cleanedPayload.vaiTro,
      TrangThai: cleanedPayload.trangThai,
      MatKhau: cleanedPayload.matKhau,
    },
    {
      HoTen: cleanedPayload.hoTen,
      VaiTro: cleanedPayload.vaiTro,
      TrangThai: cleanedPayload.trangThai,
      MatKhau: cleanedPayload.matKhau,
      MatKhauMoi: cleanedPayload.matKhau,
      NewPassword: cleanedPayload.matKhau,
    },
    {
      hoTen: cleanedPayload.hoTen,
      role: cleanedPayload.vaiTro,
      status: cleanedPayload.trangThai,
      password: cleanedPayload.matKhau,
      newPassword: cleanedPayload.matKhau,
      matKhauMoi: cleanedPayload.matKhau,
    },
    {
      fullName: cleanedPayload.hoTen,
      role: cleanedPayload.vaiTro,
      status: cleanedPayload.trangThai,
      password: cleanedPayload.matKhau,
      newPassword: cleanedPayload.matKhau,
      matKhauMoi: cleanedPayload.matKhau,
    },
    {
      FullName: cleanedPayload.hoTen,
      Role: cleanedPayload.vaiTro,
      Status: cleanedPayload.trangThai,
      Password: cleanedPayload.matKhau,
      NewPassword: cleanedPayload.matKhau,
    },
  ].map((variant) =>
    Object.fromEntries(
      Object.entries(variant).filter(([, value]) => value !== undefined),
    ),
  );
}

function validateCreatePayload(payload: CreateTaiKhoanPayload) {
  if (!payload.tenDangNhap.trim()) {
    throw new Error("Tên đăng nhập là bắt buộc.");
  }

  if (!payload.hoTen.trim()) {
    throw new Error("Họ tên là bắt buộc.");
  }

  if (!payload.vaiTro.trim()) {
    throw new Error("Vai trò là bắt buộc.");
  }

  if (!payload.matKhau.trim()) {
    throw new Error("Mật khẩu là bắt buộc khi tạo mới tài khoản.");
  }
}

function validateUpdatePayload(payload: UpdateTaiKhoanPayload) {
  const hasHoTen =
    typeof payload.hoTen === "string" && payload.hoTen.trim().length > 0;
  const hasVaiTro =
    typeof payload.vaiTro === "string" && payload.vaiTro.trim().length > 0;
  const hasTrangThai = typeof payload.trangThai === "boolean";
  const hasMatKhau =
    typeof payload.matKhau === "string" && payload.matKhau.trim().length > 0;

  if (!hasHoTen && !hasVaiTro && !hasTrangThai && !hasMatKhau) {
    throw new Error("Không có dữ liệu hợp lệ để cập nhật tài khoản.");
  }
}

function sortTaiKhoanList(list: TaiKhoan[]) {
  return [...list].sort((currentItem, nextItem) => nextItem.id - currentItem.id);
}

export async function getTaiKhoanList(): Promise<TaiKhoan[]> {
  const response = await request<unknown>(TAI_KHOAN_ENDPOINTS.list, {
    cache: "no-store",
    token: requireAuthToken(),
  });

  return sortTaiKhoanList(
    extractListResponse(response)
      .map((item) => tryNormalizeTaiKhoan(item))
      .filter((item): item is TaiKhoan => item !== null),
  );
}

export async function createTaiKhoan(
  payload: CreateTaiKhoanPayload,
): Promise<TaiKhoan | null> {
  validateCreatePayload(payload);

  const normalizedPayload: CreateTaiKhoanPayload = {
    tenDangNhap: payload.tenDangNhap.trim(),
    matKhau: payload.matKhau,
    hoTen: payload.hoTen.trim(),
    vaiTro: normalizeRole(payload.vaiTro),
  };

  const requestBodies = buildCreateRequestBodies(normalizedPayload);
  let lastError: unknown = null;

  for (let index = 0; index < requestBodies.length; index += 1) {
    const requestBody = requestBodies[index];

    try {
      const response = await request<unknown>(TAI_KHOAN_ENDPOINTS.create, {
        body: requestBody,
        cache: "no-store",
        method: "POST",
        token: requireAuthToken(),
      });

      const normalizedItem = tryNormalizeTaiKhoan(extractItemResponse(response));

      if (normalizedItem) {
        return normalizedItem;
      }

      break;
    } catch (error) {
      lastError = error;

      if (index < requestBodies.length - 1 && shouldTryNextBodyVariant(error)) {
        continue;
      }

      throw error;
    }
  }

  const latestList = await getTaiKhoanList();

  const matchedItem = latestList.find(
    (item) => item.tenDangNhap === normalizedPayload.tenDangNhap,
  );

  if (matchedItem) {
    return matchedItem;
  }

  if (lastError) {
    throw lastError;
  }

  return null;
}

export async function updateTaiKhoan(
  id: number,
  payload: UpdateTaiKhoanPayload,
): Promise<TaiKhoan | null> {
  const normalizedId = normalizeId(id);
  validateUpdatePayload(payload);

  const requestBodies = buildUpdateRequestBodies(payload);
  let lastError: unknown = null;

  for (let index = 0; index < requestBodies.length; index += 1) {
    const requestBody = requestBodies[index];

    try {
      const response = await request<unknown>(TAI_KHOAN_ENDPOINTS.update(normalizedId), {
        body: requestBody,
        cache: "no-store",
        method: "PUT",
        token: requireAuthToken(),
      });

      const normalizedItem = tryNormalizeTaiKhoan(extractItemResponse(response));

      if (normalizedItem) {
        return normalizedItem;
      }

      break;
    } catch (error) {
      lastError = error;

      if (index < requestBodies.length - 1 && shouldTryNextBodyVariant(error)) {
        continue;
      }

      throw error;
    }
  }

  try {
    const latestList = await getTaiKhoanList();
    const matchedItem = latestList.find((item) => item.id === normalizedId) ?? null;

    if (matchedItem) {
      return matchedItem;
    }
  } catch {
    if (lastError) {
      throw lastError;
    }

    return null;
  }

  if (lastError) {
    throw lastError;
  }

  return null;
}

export async function deleteTaiKhoan(id: number): Promise<void> {
  const normalizedId = normalizeId(id);

  await request<unknown>(TAI_KHOAN_ENDPOINTS.delete(normalizedId), {
    cache: "no-store",
    method: "DELETE",
    token: requireAuthToken(),
  });
}
