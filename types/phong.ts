import type { LoaiPhong } from "@/types/loai-phong";
import { tryNormalizeLoaiPhong } from "@/types/loai-phong";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function isPhongLikeRecord(value: unknown): value is UnknownRecord {
  if (!isRecord(value)) {
    return false;
  }

  return [
    "soPhong",
    "SoPhong",
    "loaiPhongId",
    "LoaiPhong_ID",
    "LoaiPhongId",
    "LoaiPhongID",
    "trangThai",
    "TrangThai",
    "loaiPhong",
    "LoaiPhong",
  ].some((key) => key in value);
}

function unwrapPhongRecord(input: unknown, depth = 0): UnknownRecord | null {
  if (!isRecord(input) || depth > 4) {
    return null;
  }

  if (isPhongLikeRecord(input)) {
    return input;
  }

  const source = input as UnknownRecord;
  const candidates = [
    source.dataValues,
    source.data,
    source.item,
    source.result,
    source.payload,
    source.phong,
    source.Phong,
    source.room,
    source.Room,
  ];

  for (const candidate of candidates) {
    const unwrapped = unwrapPhongRecord(candidate, depth + 1);

    if (unwrapped) {
      return unwrapped;
    }
  }

  return source;
}

export type TrangThaiPhong = "Trong" | "DangO" | "CanDon" | "BaoTri";

export const TRANG_THAI_PHONG_OPTIONS: TrangThaiPhong[] = [
  "Trong",
  "DangO",
  "CanDon",
  "BaoTri",
];

export interface Phong {
  soPhong: string;
  loaiPhongId: number;
  trangThai: TrangThaiPhong;
  giaCoBan?: number;
  loaiPhong?: LoaiPhong | null;
  tenLoaiPhong?: string;
}

export interface PhongPayload {
  soPhong: string;
  loaiPhongId: number;
  trangThai: TrangThaiPhong;
}

export interface PhongApiRaw {
  soPhong?: string;
  SoPhong?: string;
  loaiPhongId?: number | string;
  LoaiPhong_ID?: number | string;
  LoaiPhongId?: number | string;
  LoaiPhongID?: number | string;
  giaCoBan?: number | string;
  GiaCoBan?: number | string;
  trangThai?: string;
  TrangThai?: string;
  loaiPhong?: unknown;
  LoaiPhong?: unknown;
  tenLoaiPhong?: string;
  TenLoaiPhong?: string;
}

function normalizeStatusKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_-]/g, "")
    .toLowerCase();
}

export function normalizeTrangThaiPhong(value: unknown): TrangThaiPhong {
  const rawValue = readString(value);

  if (!rawValue) {
    return "Trong";
  }

  const normalized = normalizeStatusKey(rawValue);

  if (normalized === "dango" || normalized === "dangsudung") {
    return "DangO";
  }

  if (normalized === "candon" || normalized === "candondep") {
    return "CanDon";
  }

  if (normalized === "baotri") {
    return "BaoTri";
  }

  return "Trong";
}

export function isTrangThaiPhong(value: string): value is TrangThaiPhong {
  return TRANG_THAI_PHONG_OPTIONS.includes(value as TrangThaiPhong);
}

export function normalizePhong(raw: unknown): Phong {
  const record = unwrapPhongRecord(raw);

  if (!record) {
    throw new Error("Dữ liệu phòng không hợp lệ.");
  }

  const nestedLoaiPhongSource =
    record.loaiPhong ??
    record.LoaiPhong ??
    record.roomType ??
    record.RoomType;
  const normalizedLoaiPhong =
    nestedLoaiPhongSource !== undefined && nestedLoaiPhongSource !== null
      ? tryNormalizeLoaiPhong(nestedLoaiPhongSource)
      : null;
  const soPhong = pickString(record, [
    "soPhong",
    "SoPhong",
    "so_phong",
    "roomNumber",
    "RoomNumber",
  ]);
  const loaiPhongId =
    pickNumber(record, [
      "loaiPhongId",
      "LoaiPhong_ID",
      "LoaiPhongId",
      "LoaiPhongID",
      "loai_phong_id",
      "roomTypeId",
      "RoomTypeId",
    ]) ?? normalizedLoaiPhong?.loaiPhongId;
  const giaCoBan =
    pickNumber(record, [
      "giaCoBan",
      "GiaCoBan",
      "gia_co_ban",
      "donGia",
      "DonGia",
      "gia",
      "Gia",
    ]) ?? normalizedLoaiPhong?.giaCoBan;

  if (!soPhong || loaiPhongId == null) {
    throw new Error("Không thể chuẩn hóa dữ liệu phòng.");
  }

  return {
    soPhong,
    loaiPhongId,
    giaCoBan: giaCoBan ?? undefined,
    trangThai: normalizeTrangThaiPhong(
      record.trangThai ??
        record.TrangThai ??
        record.status ??
        record.Status,
    ),
    loaiPhong: normalizedLoaiPhong,
    tenLoaiPhong:
      pickString(record, [
        "tenLoaiPhong",
        "TenLoaiPhong",
        "loaiPhongTen",
        "LoaiPhongTen",
        "roomTypeName",
        "RoomTypeName",
      ]) ?? normalizedLoaiPhong?.tenLoaiPhong,
  };
}

export function tryNormalizePhong(raw: unknown) {
  try {
    return normalizePhong(raw);
  } catch {
    return null;
  }
}

export function buildPhongRequestBody(payload: PhongPayload) {
  return {
    SoPhong: payload.soPhong,
    LoaiPhong_ID: payload.loaiPhongId,
    TrangThai: payload.trangThai,
  };
}

export function mergePhongListWithLoaiPhong(
  phongList: Phong[],
  loaiPhongList: LoaiPhong[],
) {
  const loaiPhongMap = new Map(
    loaiPhongList.map((item) => [item.loaiPhongId, item]),
  );

  return phongList.map((item) => {
    const latestLoaiPhong =
      loaiPhongMap.get(item.loaiPhongId) ?? item.loaiPhong ?? null;

    return {
      ...item,
      giaCoBan: item.giaCoBan ?? latestLoaiPhong?.giaCoBan,
      loaiPhong: latestLoaiPhong,
      tenLoaiPhong: latestLoaiPhong?.tenLoaiPhong ?? item.tenLoaiPhong,
    };
  });
}
