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

function isKhachHangLikeRecord(value: unknown): value is UnknownRecord {
  if (!isRecord(value)) {
    return false;
  }

  return [
    "khachHangId",
    "KhachHang_ID",
    "KhachHangId",
    "KhachHangID",
    "khach_hang_id",
    "id",
    "ID",
    "hoTen",
    "HoTen",
    "cccd",
    "CCCD",
    "thongTinLienHe",
    "ThongTinLienHe",
    "quocTich",
    "QuocTich",
    "ngayTao",
    "NgayTao",
  ].some((key) => key in value);
}

function unwrapKhachHangRecord(input: unknown, depth = 0): UnknownRecord | null {
  if (!isRecord(input) || depth > 4) {
    return null;
  }

  if (isKhachHangLikeRecord(input)) {
    return input;
  }

  const source = input as UnknownRecord;
  const candidates = [
    source.dataValues,
    source.data,
    source.item,
    source.result,
    source.payload,
    source.khachHang,
    source.KhachHang,
    source.customer,
    source.Customer,
  ];

  for (const candidate of candidates) {
    const unwrapped = unwrapKhachHangRecord(candidate, depth + 1);

    if (unwrapped) {
      return unwrapped;
    }
  }

  return source;
}

export interface KhachHang {
  khachHangId: number;
  hoTen: string;
  cccd: string;
  thongTinLienHe: string;
  quocTich: string;
  ngayTao?: string;
}

export interface KhachHangPayload {
  hoTen: string;
  cccd: string;
  thongTinLienHe: string;
  quocTich: string;
}

export interface KhachHangApiRaw {
  khachHangId?: number | string;
  KhachHang_ID?: number | string;
  KhachHangId?: number | string;
  KhachHangID?: number | string;
  khach_hang_id?: number | string;
  id?: number | string;
  hoTen?: string;
  HoTen?: string;
  ho_ten?: string;
  cccd?: string;
  CCCD?: string;
  thongTinLienHe?: string;
  ThongTinLienHe?: string;
  thong_tin_lien_he?: string;
  soDienThoai?: string;
  SoDienThoai?: string;
  email?: string;
  Email?: string;
  quocTich?: string;
  QuocTich?: string;
  quoc_tich?: string;
  ngayTao?: string;
  NgayTao?: string;
  ngay_tao?: string;
  createdAt?: string;
  created_at?: string;
}

export function normalizeKhachHang(raw: unknown): KhachHang {
  const record = unwrapKhachHangRecord(raw);

  if (!record) {
    throw new Error("Dữ liệu khách hàng không hợp lệ.");
  }

  const khachHangId = pickNumber(record, [
    "khachHangId",
    "KhachHang_ID",
    "KhachHangId",
    "KhachHangID",
    "khach_hang_id",
    "id",
    "ID",
    "maKhachHang",
    "MaKhachHang",
  ]);

  if (khachHangId === null) {
    throw new Error("Không thể chuẩn hóa dữ liệu khách hàng do thiếu ID.");
  }

  return {
    khachHangId,
    hoTen:
      pickString(record, [
        "hoTen",
        "HoTen",
        "ho_ten",
        "tenKhachHang",
        "TenKhachHang",
        "fullName",
        "FullName",
        "name",
        "Name",
      ]) ?? "Khách hàng",
    cccd:
      pickString(record, [
        "cccd",
        "CCCD",
        "canCuocCongDan",
        "CanCuocCongDan",
        "identityNumber",
        "IdentityNumber",
      ]) ?? "",
    thongTinLienHe:
      pickString(record, [
        "thongTinLienHe",
        "ThongTinLienHe",
        "thong_tin_lien_he",
        "soDienThoai",
        "SoDienThoai",
        "email",
        "Email",
        "contactInfo",
        "ContactInfo",
      ]) ?? "",
    quocTich:
      pickString(record, [
        "quocTich",
        "QuocTich",
        "quoc_tich",
        "nationality",
        "Nationality",
      ]) ?? "",
    ngayTao:
      pickString(record, [
        "ngayTao",
        "NgayTao",
        "ngay_tao",
        "createdAt",
        "created_at",
      ]) ?? undefined,
  };
}

export function tryNormalizeKhachHang(raw: unknown) {
  try {
    return normalizeKhachHang(raw);
  } catch {
    return null;
  }
}

export function buildKhachHangRequestBody(payload: KhachHangPayload) {
  return {
    HoTen: payload.hoTen,
    CCCD: payload.cccd,
    ThongTinLienHe: payload.thongTinLienHe,
    QuocTich: payload.quocTich,
  };
}
