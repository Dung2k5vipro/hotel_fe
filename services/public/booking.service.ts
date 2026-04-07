import { request } from "@/services/api";
import type {
  BookingRequestPayload,
  BookingRequestResponse,
  CheckAvailabilityPayload,
  CheckAvailabilityResponse,
} from "@/types/public/public-booking";

type UnknownRecord = Record<string, unknown>;

const PUBLIC_BOOKING_ENDPOINTS = {
  checkAvailability: [
    "/api/public-dat-phong/check-availability",
    "/api/public/dat-phong/check-availability",
  ],
  request: ["/api/public-dat-phong/request", "/api/public/dat-phong/request"],
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFallbackableEndpointError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("(404") ||
    message.includes("(405") ||
    message.includes("not found") ||
    message.includes("cannot post")
  );
}

function readString(value: unknown) {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }

    return null;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (
      ["true", "1", "yes", "ok", "success", "available", "còn phòng", "con phong"].includes(
        normalized,
      )
    ) {
      return true;
    }

    if (
      ["false", "0", "no", "fail", "failed", "error", "unavailable", "hết phòng", "het phong"].includes(
        normalized,
      )
    ) {
      return false;
    }
  }

  return null;
}

function searchString(payload: unknown, keys: string[], depth = 0): string | null {
  if (depth > 5) {
    return null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = searchString(item, keys, depth + 1);

      if (found !== null) {
        return found;
      }
    }

    return null;
  }

  if (!isRecord(payload)) {
    return null;
  }

  const source = payload as UnknownRecord;

  for (const key of keys) {
    const value = readString(source[key]);

    if (value !== null) {
      return value;
    }
  }

  for (const value of Object.values(source)) {
    const found = searchString(value, keys, depth + 1);

    if (found !== null) {
      return found;
    }
  }

  return null;
}

function searchNumber(payload: unknown, keys: string[], depth = 0): number | null {
  if (depth > 5) {
    return null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = searchNumber(item, keys, depth + 1);

      if (found !== null) {
        return found;
      }
    }

    return null;
  }

  if (!isRecord(payload)) {
    return null;
  }

  const source = payload as UnknownRecord;

  for (const key of keys) {
    const value = readNumber(source[key]);

    if (value !== null) {
      return value;
    }
  }

  for (const value of Object.values(source)) {
    const found = searchNumber(value, keys, depth + 1);

    if (found !== null) {
      return found;
    }
  }

  return null;
}

function searchBoolean(payload: unknown, keys: string[], depth = 0): boolean | null {
  if (depth > 5) {
    return null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = searchBoolean(item, keys, depth + 1);

      if (found !== null) {
        return found;
      }
    }

    return null;
  }

  if (!isRecord(payload)) {
    return null;
  }

  const source = payload as UnknownRecord;

  for (const key of keys) {
    const value = readBoolean(source[key]);

    if (value !== null) {
      return value;
    }
  }

  for (const value of Object.values(source)) {
    const found = searchBoolean(value, keys, depth + 1);

    if (found !== null) {
      return found;
    }
  }

  return null;
}

function searchArray(payload: unknown, keys: string[], depth = 0): unknown[] | null {
  if (depth > 5) {
    return null;
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return null;
  }

  const source = payload as UnknownRecord;

  for (const key of keys) {
    const value = source[key];

    if (Array.isArray(value)) {
      return value;
    }
  }

  for (const value of Object.values(source)) {
    const found = searchArray(value, keys, depth + 1);

    if (found !== null) {
      return found;
    }
  }

  return null;
}

function normalizeCheckAvailabilityResponse(payload: unknown): CheckAvailabilityResponse {
  const listedRooms = searchArray(payload, [
    "availableRooms",
    "AvailableRooms",
    "rooms",
    "Rooms",
    "phongTrong",
    "PhongTrong",
    "data",
  ]);
  const countFromList = listedRooms ? listedRooms.length : null;
  const availableCount =
    searchNumber(payload, [
      "availableCount",
      "AvailableCount",
      "count",
      "Count",
      "soPhongTrong",
      "SoPhongTrong",
      "remaining",
      "Remaining",
    ]) ?? countFromList;
  const available =
    searchBoolean(payload, [
      "available",
      "isAvailable",
      "coPhong",
      "conPhong",
      "Available",
      "IsAvailable",
    ]) ?? (typeof availableCount === "number" ? availableCount > 0 : false);
  const success =
    searchBoolean(payload, [
      "success",
      "ok",
      "status",
      "isSuccess",
      "Success",
      "Ok",
      "Status",
      "IsSuccess",
    ]) ?? true;
  const message =
    searchString(payload, [
      "message",
      "Message",
      "thongBao",
      "ThongBao",
      "error",
      "Error",
      "detail",
      "Detail",
    ]) ??
    (available
      ? "Còn phòng cho thời gian bạn đã chọn."
      : "Không còn phòng phù hợp cho thời gian bạn đã chọn.");

  const soDemLuuTruRaw = searchNumber(payload, ["soDemLuuTru", "SoDemLuuTru"]);
  const soDemLuuTru =
    typeof soDemLuuTruRaw === "number" && Number.isFinite(soDemLuuTruRaw) && soDemLuuTruRaw > 0
      ? Math.floor(soDemLuuTruRaw)
      : undefined;
  const tongTienPhongDuKienRaw = searchNumber(payload, [
    "tongTienPhongDuKien",
    "TongTienPhongDuKien",
  ]);
  const tongTienPhongDuKien =
    typeof tongTienPhongDuKienRaw === "number" && Number.isFinite(tongTienPhongDuKienRaw)
      ? tongTienPhongDuKienRaw
      : undefined;

  return {
    success,
    available,
    message,
    availableCount: typeof availableCount === "number" ? availableCount : undefined,
    soDemLuuTru,
    tongTienPhongDuKien,
  };
}

function normalizeBookingRequestResponse(payload: unknown): BookingRequestResponse {
  const success =
    searchBoolean(payload, [
      "success",
      "ok",
      "status",
      "isSuccess",
      "Success",
      "Ok",
      "Status",
      "IsSuccess",
    ]) ?? true;
  const message =
    searchString(payload, [
      "message",
      "Message",
      "thongBao",
      "ThongBao",
      "error",
      "Error",
      "detail",
      "Detail",
    ]) ??
    (success
      ? "Gửi yêu cầu đặt phòng thành công."
      : "Không thể gửi yêu cầu đặt phòng.");
  const data = isRecord(payload)
    ? (payload.data ?? payload.result ?? payload.payload ?? undefined)
    : undefined;

  return {
    success,
    message,
    data: normalizeBookingResponseData(data),
  };
}

function normalizeBookingResponseData(payload: unknown) {
  if (!isRecord(payload)) {
    return undefined;
  }

  const record = payload as UnknownRecord;
  const giaMoiDemRaw = searchNumber(record, ["giaMoiDem", "GiaMoiDem"]);
  const soDemLuuTruRaw = searchNumber(record, ["soDemLuuTru", "SoDemLuuTru"]);
  const tongTienPhongDuKienRaw = searchNumber(record, [
    "tongTienPhongDuKien",
    "TongTienPhongDuKien",
  ]);
  const giaMoiDem =
    typeof giaMoiDemRaw === "number" && Number.isFinite(giaMoiDemRaw)
      ? giaMoiDemRaw
      : undefined;
  const soDemLuuTru =
    typeof soDemLuuTruRaw === "number" && Number.isFinite(soDemLuuTruRaw) && soDemLuuTruRaw > 0
      ? Math.floor(soDemLuuTruRaw)
      : undefined;
  const tongTienPhongDuKien =
    typeof tongTienPhongDuKienRaw === "number" && Number.isFinite(tongTienPhongDuKienRaw)
      ? tongTienPhongDuKienRaw
      : undefined;

  return {
    ...record,
    ...(giaMoiDem !== undefined ? { giaMoiDem } : {}),
    ...(soDemLuuTru !== undefined ? { soDemLuuTru } : {}),
    ...(tongTienPhongDuKien !== undefined ? { tongTienPhongDuKien } : {}),
  };
}

function normalizeDateTimeForBackend(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error("Ngày giờ không hợp lệ.");
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return normalized;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`;
  }

  throw new Error("Ngày giờ phải đúng định dạng YYYY-MM-DDTHH:mm:ss.");
}

function toPositiveInteger(value: number, label: string) {
  if (!Number.isFinite(value) || value < 1) {
    throw new Error(`${label} không hợp lệ.`);
  }

  return Math.floor(value);
}

type CheckAvailabilityRequestPayload = {
  loaiPhongId: number;
  ngayNhanPhong: string;
  ngayTraPhong: string;
};

function buildCheckAvailabilityPayload(
  payload: CheckAvailabilityPayload,
): CheckAvailabilityRequestPayload {
  return {
    loaiPhongId: toPositiveInteger(payload.loaiPhongId, "Loại phòng"),
    ngayNhanPhong: normalizeDateTimeForBackend(payload.ngayNhanPhong),
    ngayTraPhong: normalizeDateTimeForBackend(payload.ngayTraPhong),
  };
}

export async function checkAvailability(payload: CheckAvailabilityPayload) {
  let lastError: unknown = null;

  for (const endpoint of PUBLIC_BOOKING_ENDPOINTS.checkAvailability) {
    try {
      const response = await request<unknown>(endpoint, {
        body: buildCheckAvailabilityPayload(payload),
        cache: "no-store",
        method: "POST",
      });

      return normalizeCheckAvailabilityResponse(response);
    } catch (error) {
      lastError = error;

      if (isFallbackableEndpointError(error)) {
        continue;
      }

      throw error;
    }
  }

  throw (lastError ?? new Error("Khong the kiem tra phong luc nay."));
}

export async function requestBooking(payload: BookingRequestPayload) {
  let lastError: unknown = null;

  for (const endpoint of PUBLIC_BOOKING_ENDPOINTS.request) {
    try {
      const response = await request<unknown>(endpoint, {
        body: payload,
        cache: "no-store",
        method: "POST",
      });

      return normalizeBookingRequestResponse(response);
    } catch (error) {
      lastError = error;

      if (isFallbackableEndpointError(error)) {
        continue;
      }

      throw error;
    }
  }

  throw (lastError ?? new Error("Khong the gui yeu cau dat phong."));
}
