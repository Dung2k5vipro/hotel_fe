import { repairVietnameseText } from "@/lib/text";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  if (typeof value === "string") {
    // Workaround for legacy backend responses that arrive as mojibake instead of UTF-8.
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

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_-]/g, "")
    .toLowerCase();
}

export type TrangThaiDatPhong =
  | "DatTruoc"
  | "DaNhanPhong"
  | "DaTraPhong"
  | "DaHuy";

export const TRANG_THAI_DAT_PHONG_OPTIONS: TrangThaiDatPhong[] = [
  "DatTruoc",
  "DaNhanPhong",
  "DaTraPhong",
  "DaHuy",
];

const statusAliasMap: Record<string, TrangThaiDatPhong> = {
  dattruoc: "DatTruoc",
  chuanhan: "DatTruoc",
  pending: "DatTruoc",
  book: "DatTruoc",
  booked: "DatTruoc",
  danhanphong: "DaNhanPhong",
  dango: "DaNhanPhong",
  checkin: "DaNhanPhong",
  checkedin: "DaNhanPhong",
  datraphong: "DaTraPhong",
  hoantat: "DaTraPhong",
  checkout: "DaTraPhong",
  checkedout: "DaTraPhong",
  dahuy: "DaHuy",
  huy: "DaHuy",
  cancelled: "DaHuy",
  canceled: "DaHuy",
  cancel: "DaHuy",
};

export interface DatPhong {
  datPhongId: number;
  khachHangId: number;
  soPhong: string;
  ngayNhanPhong: string;
  ngayTraPhong: string;
  trangThai: TrangThaiDatPhong;
  khachHang?: {
    khachHangId: number;
    hoTen: string;
    cccd?: string;
    thongTinLienHe?: string;
  } | null;
  phong?: {
    soPhong: string;
    loaiPhongId?: number;
    tenLoaiPhong?: string;
    trangThai?: string;
  } | null;
  tenKhachHang?: string;
  tenLoaiPhong?: string;
}

export interface DatPhongPayload {
  khachHangId: number;
  soPhong: string;
  ngayNhanPhong: string;
  ngayTraPhong: string;
  giaThucTeMoiDem?: number;
  trangThai?: TrangThaiDatPhong | string;
}

export interface DatPhongApiRaw {
  datPhongId?: number | string;
  DatPhong_ID?: number | string;
  DatPhongId?: number | string;
  DatPhongID?: number | string;
  khachHangId?: number | string;
  KhachHang_ID?: number | string;
  KhachHangId?: number | string;
  KhachHangID?: number | string;
  soPhong?: string;
  SoPhong?: string;
  ngayNhanPhong?: string;
  NgayNhanPhong?: string;
  ngay_nhan_phong?: string;
  ngayTraPhong?: string;
  NgayTraPhong?: string;
  ngay_tra_phong?: string;
  trangThai?: string;
  TrangThai?: string;
  khachHang?: unknown;
  KhachHang?: unknown;
  phong?: unknown;
  Phong?: unknown;
  tenKhachHang?: string;
  TenKhachHang?: string;
  tenLoaiPhong?: string;
  TenLoaiPhong?: string;
}

export interface AvailablePhong {
  soPhong: string;
  loaiPhongId?: number;
  tenLoaiPhong?: string;
  trangThai?: string;
  giaThamKhao?: number;
}

function isDatPhongLikeRecord(value: unknown): value is UnknownRecord {
  if (!isRecord(value)) {
    return false;
  }

  return [
    "datPhongId",
    "DatPhong_ID",
    "DatPhongId",
    "DatPhongID",
    "khachHangId",
    "KhachHang_ID",
    "soPhong",
    "SoPhong",
    "ngayNhanPhong",
    "NgayNhanPhong",
    "ngayTraPhong",
    "NgayTraPhong",
    "trangThai",
    "TrangThai",
  ].some((key) => key in value);
}

function unwrapDatPhongRecord(input: unknown, depth = 0): UnknownRecord | null {
  if (!isRecord(input) || depth > 4) {
    return null;
  }

  if (isDatPhongLikeRecord(input)) {
    return input;
  }

  const source = input as UnknownRecord;
  const candidates = [
    source.dataValues,
    source.data,
    source.item,
    source.result,
    source.payload,
    source.datPhong,
    source.DatPhong,
    source.booking,
    source.Booking,
    source.reservation,
    source.Reservation,
  ];

  for (const candidate of candidates) {
    const unwrapped = unwrapDatPhongRecord(candidate, depth + 1);

    if (unwrapped) {
      return unwrapped;
    }
  }

  return source;
}

export function normalizeTrangThaiDatPhong(value: unknown): TrangThaiDatPhong {
  const rawValue = readString(value);

  if (!rawValue) {
    return "DatTruoc";
  }

  const normalized = normalizeKey(rawValue);

  return statusAliasMap[normalized] ?? "DatTruoc";
}

function normalizeKhachHangBrief(
  raw: unknown,
  fallbackKhachHangId: number,
  fallbackHoTen?: string,
) {
  if (!isRecord(raw)) {
    if (fallbackHoTen) {
      return {
        khachHangId: fallbackKhachHangId,
        hoTen: fallbackHoTen,
      };
    }

    return null;
  }

  const record = raw as UnknownRecord;
  const khachHangId =
    pickNumber(record, [
      "khachHangId",
      "KhachHang_ID",
      "KhachHangId",
      "KhachHangID",
      "id",
      "ID",
    ]) ?? fallbackKhachHangId;
  const hoTen =
    pickString(record, [
      "hoTen",
      "HoTen",
      "tenKhachHang",
      "TenKhachHang",
      "name",
      "Name",
    ]) ?? fallbackHoTen;

  if (!hoTen) {
    return null;
  }

  return {
    khachHangId,
    hoTen,
    cccd:
      pickString(record, [
        "cccd",
        "CCCD",
        "canCuocCongDan",
        "CanCuocCongDan",
      ]) ?? undefined,
    thongTinLienHe:
      pickString(record, [
        "thongTinLienHe",
        "ThongTinLienHe",
        "soDienThoai",
        "SoDienThoai",
        "email",
        "Email",
      ]) ?? undefined,
  };
}

function normalizePhongBrief(
  raw: unknown,
  fallbackSoPhong: string,
  fallbackTenLoaiPhong?: string,
) {
  if (!isRecord(raw)) {
    return {
      soPhong: fallbackSoPhong,
      tenLoaiPhong: fallbackTenLoaiPhong,
    };
  }

  const record = raw as UnknownRecord;
  const soPhong =
    pickString(record, ["soPhong", "SoPhong", "roomNumber", "RoomNumber"]) ??
    fallbackSoPhong;

  return {
    soPhong,
    loaiPhongId:
      pickNumber(record, [
        "loaiPhongId",
        "LoaiPhong_ID",
        "LoaiPhongId",
        "LoaiPhongID",
      ]) ?? undefined,
    tenLoaiPhong:
      pickString(record, [
        "tenLoaiPhong",
        "TenLoaiPhong",
        "roomTypeName",
        "RoomTypeName",
      ]) ??
      fallbackTenLoaiPhong ??
      undefined,
    trangThai:
      pickString(record, ["trangThai", "TrangThai", "status", "Status"]) ??
      undefined,
  };
}

export function normalizeDatPhong(raw: unknown): DatPhong {
  const record = unwrapDatPhongRecord(raw);

  if (!record) {
    throw new Error("Dữ liệu đặt phòng không hợp lệ.");
  }

  const datPhongId = pickNumber(record, [
    "datPhongId",
    "DatPhong_ID",
    "DatPhongId",
    "DatPhongID",
    "id",
    "ID",
  ]);
  const khachHangId = pickNumber(record, [
    "khachHangId",
    "KhachHang_ID",
    "KhachHangId",
    "KhachHangID",
    "customerId",
    "CustomerId",
  ]);
  const soPhong = pickString(record, [
    "soPhong",
    "SoPhong",
    "roomNumber",
    "RoomNumber",
  ]);

  if (datPhongId === null || khachHangId === null || !soPhong) {
    throw new Error("Không thể chuẩn hóa dữ liệu đặt phòng.");
  }

  const tenKhachHang =
    pickString(record, ["tenKhachHang", "TenKhachHang"]) ?? undefined;
  const tenLoaiPhong =
    pickString(record, ["tenLoaiPhong", "TenLoaiPhong"]) ?? undefined;
  const khachHang = normalizeKhachHangBrief(
    record.khachHang ?? record.KhachHang,
    khachHangId,
    tenKhachHang,
  );
  const phong = normalizePhongBrief(
    record.phong ?? record.Phong,
    soPhong,
    tenLoaiPhong,
  );

  return {
    datPhongId,
    khachHangId,
    soPhong,
    ngayNhanPhong:
      pickString(record, [
        "ngayNhanPhong",
        "NgayNhanPhong",
        "ngay_nhan_phong",
        "checkInDate",
        "CheckInDate",
      ]) ?? "",
    ngayTraPhong:
      pickString(record, [
        "ngayTraPhong",
        "NgayTraPhong",
        "ngay_tra_phong",
        "checkOutDate",
        "CheckOutDate",
      ]) ?? "",
    trangThai: normalizeTrangThaiDatPhong(
      record.trangThai ?? record.TrangThai ?? record.status ?? record.Status,
    ),
    khachHang,
    phong,
    tenKhachHang: tenKhachHang ?? khachHang?.hoTen,
    tenLoaiPhong: tenLoaiPhong ?? phong?.tenLoaiPhong,
  };
}

export function tryNormalizeDatPhong(raw: unknown) {
  try {
    return normalizeDatPhong(raw);
  } catch {
    return null;
  }
}

export function normalizeAvailablePhong(raw: unknown): AvailablePhong {
  if (typeof raw === "string" || (typeof raw === "number" && Number.isFinite(raw))) {
    const soPhong = String(raw).trim();

    if (!soPhong) {
      throw new Error("Không thể chuẩn hóa dữ liệu phòng trống.");
    }

    return {
      soPhong,
    };
  }

  if (!isRecord(raw)) {
    throw new Error("Dữ liệu phòng trống không hợp lệ.");
  }

  const record = raw as UnknownRecord;
  const nestedPhong = record.phong ?? record.Phong ?? record.room ?? record.Room;

  if (nestedPhong && isRecord(nestedPhong)) {
    const nestedNormalized = tryNormalizeAvailablePhong(nestedPhong);

    if (nestedNormalized) {
      return nestedNormalized;
    }
  }

  const soPhong = pickString(record, [
    "soPhong",
    "SoPhong",
    "roomNumber",
    "RoomNumber",
  ]);

  if (!soPhong) {
    throw new Error("Không thể chuẩn hóa dữ liệu phòng trống.");
  }

  return {
    soPhong,
    loaiPhongId:
      pickNumber(record, [
        "loaiPhongId",
        "LoaiPhong_ID",
        "LoaiPhongId",
        "LoaiPhongID",
      ]) ?? undefined,
    tenLoaiPhong:
      pickString(record, [
        "tenLoaiPhong",
        "TenLoaiPhong",
        "roomTypeName",
        "RoomTypeName",
      ]) ?? undefined,
    trangThai:
      pickString(record, ["trangThai", "TrangThai", "status", "Status"]) ??
      undefined,
  };
}

export function tryNormalizeAvailablePhong(raw: unknown) {
  try {
    return normalizeAvailablePhong(raw);
  } catch {
    return null;
  }
}

function toApiTrangThaiDatPhong(value?: TrangThaiDatPhong | string) {
  if (!value) {
    return undefined;
  }

  if (value === "DatTruoc") {
    return "DaDat";
  }

  return value;
}

export function buildDatPhongRequestBody(payload: DatPhongPayload) {
  const apiTrangThai = toApiTrangThaiDatPhong(payload.trangThai);

  return {
    KhachHang_ID: payload.khachHangId,
    SoPhong: payload.soPhong,
    NgayNhanPhong: payload.ngayNhanPhong,
    NgayTraPhong: payload.ngayTraPhong,
    ...(payload.giaThucTeMoiDem !== undefined
      ? { GiaThucTeMoiDem: payload.giaThucTeMoiDem }
      : {}),
    ...(apiTrangThai ? { TrangThai: apiTrangThai } : {}),
  };
}

export function getTrangThaiDatPhongLabel(value: TrangThaiDatPhong) {
  const labelMap: Record<TrangThaiDatPhong, string> = {
    DatTruoc: "Đặt trước",
    DaNhanPhong: "Đã nhận phòng",
    DaTraPhong: "Đã trả phòng",
    DaHuy: "Đã hủy",
  };

  return labelMap[value];
}

export function getTrangThaiDatPhongTone(value: TrangThaiDatPhong) {
  const toneMap: Record<
    TrangThaiDatPhong,
    "default" | "success" | "warning" | "danger"
  > = {
    DatTruoc: "warning",
    DaNhanPhong: "success",
    DaTraPhong: "default",
    DaHuy: "danger",
  };

  return toneMap[value];
}
