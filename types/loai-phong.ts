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

function isLoaiPhongLikeRecord(value: unknown): value is UnknownRecord {
  if (!isRecord(value)) {
    return false;
  }

  return [
    "loaiPhongId",
    "LoaiPhong_ID",
    "LoaiPhongId",
    "LoaiPhongID",
    "loai_phong_id",
    "id",
    "ID",
    "tenLoaiPhong",
    "TenLoaiPhong",
    "giaCoBan",
    "GiaCoBan",
    "soNguoiToiDa",
    "SoNguoiToiDa",
    "sucChua",
    "SucChua",
  ].some((key) => key in value);
}

function unwrapLoaiPhongRecord(input: unknown, depth = 0): UnknownRecord | null {
  if (!isRecord(input) || depth > 4) {
    return null;
  }

  if (isLoaiPhongLikeRecord(input)) {
    return input;
  }

  const source = input as UnknownRecord;
  const candidates = [
    source.dataValues,
    source.data,
    source.item,
    source.result,
    source.payload,
    source.loaiPhong,
    source.LoaiPhong,
    source.roomType,
    source.RoomType,
  ];

  for (const candidate of candidates) {
    const unwrapped = unwrapLoaiPhongRecord(candidate, depth + 1);

    if (unwrapped) {
      return unwrapped;
    }
  }

  return source;
}

export interface LoaiPhong {
  loaiPhongId: number;
  tenLoaiPhong: string;
  giaCoBan: number;
  soNguoiToiDa: number;
}

export interface LoaiPhongPayload {
  tenLoaiPhong: string;
  giaCoBan: number;
  soNguoiToiDa: number;
}

export interface LoaiPhongApiRaw {
  loaiPhongId?: number | string;
  LoaiPhong_ID?: number | string;
  LoaiPhongId?: number | string;
  LoaiPhongID?: number | string;
  id?: number | string;
  tenLoaiPhong?: string;
  TenLoaiPhong?: string;
  giaCoBan?: number | string;
  GiaCoBan?: number | string;
  donGia?: number | string;
  DonGia?: number | string;
  gia?: number | string;
  Gia?: number | string;
  soNguoiToiDa?: number | string;
  SoNguoiToiDa?: number | string;
  sucChua?: number | string;
  SucChua?: number | string;
}

export function normalizeLoaiPhong(raw: unknown): LoaiPhong {
  const record = unwrapLoaiPhongRecord(raw);

  if (!record) {
    throw new Error("Dữ liệu loại phòng không hợp lệ.");
  }

  const loaiPhongId = pickNumber(record, [
    "loaiPhongId",
    "LoaiPhong_ID",
    "LoaiPhongId",
    "LoaiPhongID",
    "loai_phong_id",
    "id",
    "ID",
    "maLoaiPhong",
    "MaLoaiPhong",
  ]);
  const tenLoaiPhong = pickString(record, [
    "tenLoaiPhong",
    "TenLoaiPhong",
    "ten_loai_phong",
    "loaiPhong",
    "LoaiPhong",
    "roomTypeName",
    "RoomTypeName",
  ]);
  const giaCoBan = pickNumber(record, [
    "giaCoBan",
    "GiaCoBan",
    "gia_co_ban",
    "donGia",
    "DonGia",
    "gia",
    "Gia",
  ]);
  const soNguoiToiDa = pickNumber(record, [
    "soNguoiToiDa",
    "SoNguoiToiDa",
    "so_nguoi_toi_da",
    "sucChua",
    "SucChua",
    "soNguoi",
    "SoNguoi",
  ]);

  if (
    loaiPhongId === null ||
    tenLoaiPhong === null ||
    giaCoBan === null ||
    soNguoiToiDa === null
  ) {
    throw new Error("Không thể chuẩn hóa dữ liệu loại phòng.");
  }

  return {
    loaiPhongId,
    tenLoaiPhong,
    giaCoBan,
    soNguoiToiDa,
  };
}

export function tryNormalizeLoaiPhong(raw: unknown) {
  try {
    return normalizeLoaiPhong(raw);
  } catch {
    return null;
  }
}

export function buildLoaiPhongRequestBody(payload: LoaiPhongPayload) {
  return {
    TenLoaiPhong: payload.tenLoaiPhong,
    GiaCoBan: payload.giaCoBan,
    SoNguoiToiDa: payload.soNguoiToiDa,
  };
}
