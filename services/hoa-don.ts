import { repairVietnameseText } from "@/lib/text";
import { request } from "@/services/api";
import { getStoredToken } from "@/services/auth";
import type { HoaDon } from "@/types/hoa-don";

type UnknownRecord = Record<string, unknown>;

const HOA_DON_ENDPOINTS = {
  byReservation: (datPhongId: number) => `/api/hoa-don/reservation/${datPhongId}`,
  pay: (id: number) => `/api/hoa-don/${id}/pay`,
};

function getAuthToken() {
  return getStoredToken();
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  if (typeof value === "string") {
    const normalized = repairVietnameseText(value).trim();
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
  }

  if (typeof value === "string") {
    const normalized = repairVietnameseText(value).trim().toLowerCase();

    if (
      ["true", "1", "yes", "paid", "complete", "completed", "đã thanh toán"].includes(
        normalized,
      )
    ) {
      return true;
    }

    if (
      ["false", "0", "no", "unpaid", "pending", "chưa thanh toán"].includes(
        normalized,
      )
    ) {
      return false;
    }
  }

  return null;
}

function pickString(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = readString(record[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function pickNumber(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = readNumber(record[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function pickBoolean(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = readBoolean(record[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function normalizeErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const normalized = repairVietnameseText(error.message).trim();
  return normalized.length > 0 ? normalized : fallback;
}

function isHoaDonLikeRecord(value: unknown): value is UnknownRecord {
  if (!isRecord(value)) {
    return false;
  }

  return [
    "HoaDon_ID",
    "hoaDonId",
    "DatPhong_ID",
    "datPhongId",
    "TongTienPhong",
    "tongTienPhong",
    "TongTienDichVu",
    "tongTienDichVu",
    "TongThanhToan",
    "tongThanhToan",
    "DaThanhToan",
    "daThanhToan",
  ].some((key) => key in value);
}

function unwrapHoaDonRecord(input: unknown, depth = 0): UnknownRecord | null {
  if (Array.isArray(input)) {
    return unwrapHoaDonRecord(input[0] ?? null, depth + 1);
  }

  if (!isRecord(input) || depth > 6) {
    return null;
  }

  if (isHoaDonLikeRecord(input)) {
    return input;
  }

  const source = input as UnknownRecord;
  const candidates = [
    source.dataValues,
    source.data,
    source.item,
    source.result,
    source.payload,
    source.hoaDon,
    source.HoaDon,
    source.invoice,
    source.Invoice,
    source.bill,
    source.Bill,
  ];

  for (const candidate of candidates) {
    const unwrapped = unwrapHoaDonRecord(candidate, depth + 1);

    if (unwrapped) {
      return unwrapped;
    }
  }

  for (const value of Object.values(source)) {
    const unwrapped = unwrapHoaDonRecord(value, depth + 1);

    if (unwrapped) {
      return unwrapped;
    }
  }

  return source;
}

function normalizeKhachHangName(record: UnknownRecord) {
  const directName = pickString(record, [
    "hoTenKhachHang",
    "HoTenKhachHang",
    "tenKhachHang",
    "TenKhachHang",
  ]);

  if (directName) {
    return directName;
  }

  const reservation = record.datPhong ?? record.DatPhong;

  if (isRecord(reservation)) {
    const fromReservation = pickString(reservation, [
      "hoTenKhachHang",
      "HoTenKhachHang",
      "tenKhachHang",
      "TenKhachHang",
    ]);

    if (fromReservation) {
      return fromReservation;
    }

    const customer = reservation.khachHang ?? reservation.KhachHang;

    if (isRecord(customer)) {
      return pickString(customer, ["hoTen", "HoTen", "tenKhachHang", "TenKhachHang"]);
    }
  }

  const customer = record.khachHang ?? record.KhachHang;

  if (isRecord(customer)) {
    return pickString(customer, ["hoTen", "HoTen", "tenKhachHang", "TenKhachHang"]);
  }

  return null;
}

function normalizeSoPhong(record: UnknownRecord) {
  const directRoom = pickString(record, ["soPhong", "SoPhong"]);

  if (directRoom) {
    return directRoom;
  }

  const reservation = record.datPhong ?? record.DatPhong;

  if (isRecord(reservation)) {
    const fromReservation = pickString(reservation, ["soPhong", "SoPhong"]);

    if (fromReservation) {
      return fromReservation;
    }

    const room = reservation.phong ?? reservation.Phong;

    if (isRecord(room)) {
      return pickString(room, ["soPhong", "SoPhong", "roomNumber", "RoomNumber"]);
    }
  }

  const room = record.phong ?? record.Phong;

  if (isRecord(room)) {
    return pickString(room, ["soPhong", "SoPhong", "roomNumber", "RoomNumber"]);
  }

  return null;
}

function normalizeTrangThaiDatPhong(record: UnknownRecord) {
  const directStatus = pickString(record, [
    "trangThaiDatPhong",
    "TrangThaiDatPhong",
    "trangThai",
    "TrangThai",
  ]);

  if (directStatus) {
    return directStatus;
  }

  const reservation = record.datPhong ?? record.DatPhong;

  if (isRecord(reservation)) {
    return pickString(reservation, [
      "trangThaiDatPhong",
      "TrangThaiDatPhong",
      "trangThai",
      "TrangThai",
      "status",
      "Status",
    ]);
  }

  return null;
}

export function extractItemResponse(payload: unknown, depth = 0): unknown {
  if (Array.isArray(payload)) {
    return extractItemResponse(payload[0] ?? payload, depth + 1);
  }

  if (!isRecord(payload) || depth > 6) {
    return payload;
  }

  const source = payload as UnknownRecord;
  const candidates = [
    source.data,
    source.item,
    source.result,
    source.payload,
    source.hoaDon,
    source.HoaDon,
    source.invoice,
    source.Invoice,
    source.bill,
    source.Bill,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) {
      continue;
    }

    const unwrapped = extractItemResponse(candidate, depth + 1);

    if (unwrapped !== candidate || isRecord(candidate) || Array.isArray(candidate)) {
      return unwrapped;
    }
  }

  return payload;
}

export function normalizeHoaDon(raw: unknown): HoaDon {
  const record = unwrapHoaDonRecord(extractItemResponse(raw));

  if (!record) {
    throw new Error("Dữ liệu hóa đơn không hợp lệ.");
  }

  const id = pickNumber(record, [
    "id",
    "hoaDonId",
    "HoaDon_ID",
    "HoaDonId",
    "HoaDonID",
    "billId",
    "BillId",
  ]);
  const datPhongId = pickNumber(record, [
    "datPhongId",
    "DatPhong_ID",
    "DatPhongId",
    "DatPhongID",
    "reservationId",
    "ReservationId",
  ]);
  const tongTienPhong = pickNumber(record, [
    "tongTienPhong",
    "TongTienPhong",
    "roomTotal",
    "RoomTotal",
  ]);
  const tongTienDichVu =
    pickNumber(record, [
      "tongTienDichVu",
      "TongTienDichVu",
      "serviceTotal",
      "ServiceTotal",
    ]) ?? 0;
  const tongThanhToan =
    pickNumber(record, [
      "tongThanhToan",
      "TongThanhToan",
      "totalAmount",
      "TotalAmount",
    ]) ??
    (tongTienPhong !== null ? tongTienPhong + tongTienDichVu : null);
  const daThanhToan =
    pickBoolean(record, [
      "daThanhToan",
      "DaThanhToan",
      "isPaid",
      "IsPaid",
      "paid",
      "Paid",
    ]) ?? false;

  if (id === null || datPhongId === null || tongTienPhong === null || tongThanhToan === null) {
    throw new Error("Không thể chuẩn hóa dữ liệu hóa đơn.");
  }

  return {
    id,
    datPhongId,
    tongTienPhong,
    tongTienDichVu,
    tongThanhToan,
    daThanhToan,
    ngayThanhToan:
      pickString(record, [
        "ngayThanhToan",
        "NgayThanhToan",
        "paidAt",
        "PaidAt",
        "paymentDate",
        "PaymentDate",
      ]) ?? null,
    hoTenKhachHang: normalizeKhachHangName(record),
    soPhong: normalizeSoPhong(record),
    trangThaiDatPhong: normalizeTrangThaiDatPhong(record),
  };
}

function assertPositiveInteger(value: number, fieldName: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} không hợp lệ.`);
  }
}

export async function getHoaDonByReservation(datPhongId: number) {
  assertPositiveInteger(datPhongId, "DatPhong_ID");

  try {
    const payload = await request<unknown>(HOA_DON_ENDPOINTS.byReservation(datPhongId), {
      cache: "no-store",
      token: getAuthToken(),
    });

    return normalizeHoaDon(payload);
  } catch (error) {
    throw new Error(
      normalizeErrorMessage(
        error,
        `Không thể tải hóa đơn cho DatPhong_ID #${datPhongId}.`,
      ),
    );
  }
}

export async function payHoaDon(id: number) {
  assertPositiveInteger(id, "HoaDon_ID");

  try {
    const payload = await request<unknown>(HOA_DON_ENDPOINTS.pay(id), {
      cache: "no-store",
      method: "PUT",
      token: getAuthToken(),
    });

    try {
      return normalizeHoaDon(payload);
    } catch {
      return null;
    }
  } catch (error) {
    throw new Error(
      normalizeErrorMessage(error, `Không thể chốt thanh toán hóa đơn #${id}.`),
    );
  }
}
