import { request } from "@/services/api";
import type { PublicRoomDetail, PublicRoomType } from "@/types/public/public-room";

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

function readStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => readString(item))
      .filter((item): item is string => item !== null);
  }

  if (typeof value === "string") {
    const normalized = value.trim();

    if (!normalized) {
      return [];
    }

    try {
      const parsed = JSON.parse(normalized);

      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => readString(item))
          .filter((item): item is string => item !== null);
      }
    } catch {
      return normalized
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
  }

  return null;
}

function pickStringArray(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = readStringArray(record[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function isRoomTypeLikeRecord(value: unknown): value is UnknownRecord {
  if (!isRecord(value)) {
    return false;
  }

  return [
    "LoaiPhong_ID",
    "LoaiPhongId",
    "LoaiPhongID",
    "TenLoaiPhong",
    "GiaCoBan",
    "SoNguoiToiDa",
    "MoTa",
    "HinhAnh",
    "galleryImages",
    "GalleryImages",
  ].some((key) => key in value);
}

function unwrapRoomTypeRecord(input: unknown, depth = 0): UnknownRecord | null {
  if (!isRecord(input) || depth > 5) {
    return null;
  }

  if (isRoomTypeLikeRecord(input)) {
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
    const unwrapped = unwrapRoomTypeRecord(candidate, depth + 1);

    if (unwrapped) {
      return unwrapped;
    }
  }

  return source;
}

function findListPayload(payload: unknown, depth = 0): unknown[] | null {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload) || depth > 5) {
    return null;
  }

  const source = payload as UnknownRecord;
  const candidates = [
    source.data,
    source.items,
    source.results,
    source.result,
    source.payload,
    source.loaiPhong,
    source.loaiPhongs,
    source.LoaiPhong,
    source.LoaiPhongs,
    source.roomTypes,
    source.RoomTypes,
  ];

  for (const candidate of candidates) {
    const found = findListPayload(candidate, depth + 1);

    if (found !== null) {
      return found;
    }
  }

  return null;
}

function extractListPayload(payload: unknown) {
  return findListPayload(payload) ?? [];
}

function extractItemPayload(payload: unknown, depth = 0): unknown {
  if (!isRecord(payload) || depth > 5) {
    return payload;
  }

  const source = payload as UnknownRecord;
  const candidates = [
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
    if (candidate === undefined || candidate === null || Array.isArray(candidate)) {
      continue;
    }

    if (tryNormalizePublicRoomType(candidate)) {
      return candidate;
    }

    const unwrapped = extractItemPayload(candidate, depth + 1);

    if (unwrapped !== candidate) {
      return unwrapped;
    }
  }

  return payload;
}

function normalizePublicRoomType(raw: unknown): PublicRoomType {
  const record = unwrapRoomTypeRecord(raw);

  if (!record) {
    throw new Error("Dữ liệu loại phòng không hợp lệ.");
  }

  const loaiPhongId = pickNumber(record, [
    "LoaiPhong_ID",
    "LoaiPhongId",
    "LoaiPhongID",
    "loaiPhongId",
    "id",
    "ID",
  ]);
  const tenLoaiPhong = pickString(record, [
    "TenLoaiPhong",
    "tenLoaiPhong",
    "name",
    "Name",
  ]);
  const giaCoBan = pickNumber(record, [
    "GiaCoBan",
    "giaCoBan",
    "DonGia",
    "donGia",
    "gia",
    "Gia",
  ]);
  const soNguoiToiDa = pickNumber(record, [
    "SoNguoiToiDa",
    "soNguoiToiDa",
    "SucChua",
    "sucChua",
  ]);
  const moTa =
    pickString(record, ["MoTa", "moTa", "Mota", "description", "Description"]) ??
    "";
  const hinhAnh =
    pickString(record, [
      "HinhAnh",
      "hinhAnh",
      "Image",
      "image",
      "Thumbnail",
      "thumbnail",
    ]) ?? null;
  const galleryImages =
    pickStringArray(record, [
      "galleryImages",
      "GalleryImages",
      "gallery",
      "Gallery",
      "danhSachAnh",
      "DanhSachAnh",
      "hinhAnhGallery",
      "HinhAnhGallery",
      "images",
      "Images",
    ]) ?? undefined;

  if (
    loaiPhongId === null ||
    tenLoaiPhong === null ||
    giaCoBan === null ||
    soNguoiToiDa === null
  ) {
    throw new Error("Không thể chuẩn hóa dữ liệu loại phòng.");
  }

  return {
    LoaiPhong_ID: loaiPhongId,
    TenLoaiPhong: tenLoaiPhong,
    GiaCoBan: giaCoBan,
    SoNguoiToiDa: soNguoiToiDa,
    MoTa: moTa,
    HinhAnh: hinhAnh,
    galleryImages,
  };
}

function normalizePublicRoomDetail(raw: unknown): PublicRoomDetail {
  const normalized = normalizePublicRoomType(raw);

  return {
    ...normalized,
    galleryImages: normalized.galleryImages ?? [],
  };
}

function tryNormalizePublicRoomType(raw: unknown) {
  try {
    return normalizePublicRoomType(raw);
  } catch {
    return null;
  }
}

export async function getPublicRoomTypes() {
  const payload = await request<unknown>("/api/public/loai-phong", {
    cache: "no-store",
  });

  return extractListPayload(payload)
    .map((item) => tryNormalizePublicRoomType(item))
    .filter((item): item is PublicRoomType => item !== null)
    .sort((currentItem, nextItem) => currentItem.LoaiPhong_ID - nextItem.LoaiPhong_ID);
}

export async function getPublicRoomDetail(id: number) {
  const payload = await request<unknown>(`/api/public/loai-phong/${id}`, {
    cache: "no-store",
  });

  return normalizePublicRoomDetail(extractItemPayload(payload));
}
