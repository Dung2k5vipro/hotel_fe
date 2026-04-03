import { request } from "@/services/api";
import type { PublicServiceItem } from "@/types/public/public-service";

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

function isPublicServiceLikeRecord(value: unknown): value is UnknownRecord {
  if (!isRecord(value)) {
    return false;
  }

  return [
    "DichVu_ID",
    "DichVuId",
    "DichVuID",
    "TenDichVu",
    "GiaHienTai",
  ].some((key) => key in value);
}

function unwrapServiceRecord(input: unknown, depth = 0): UnknownRecord | null {
  if (!isRecord(input) || depth > 5) {
    return null;
  }

  if (isPublicServiceLikeRecord(input)) {
    return input;
  }

  const source = input as UnknownRecord;
  const candidates = [
    source.dataValues,
    source.data,
    source.item,
    source.result,
    source.payload,
    source.service,
    source.Service,
    source.dichVu,
    source.DichVu,
  ];

  for (const candidate of candidates) {
    const unwrapped = unwrapServiceRecord(candidate, depth + 1);

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
    source.dichVu,
    source.dichVus,
    source.DichVu,
    source.DichVus,
    source.services,
    source.Services,
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

function normalizePublicService(raw: unknown): PublicServiceItem {
  const record = unwrapServiceRecord(raw);

  if (!record) {
    throw new Error("Dữ liệu dịch vụ không hợp lệ.");
  }

  const dichVuId = pickNumber(record, [
    "DichVu_ID",
    "DichVuId",
    "DichVuID",
    "dichVuId",
    "id",
    "ID",
  ]);
  const tenDichVu = pickString(record, [
    "TenDichVu",
    "tenDichVu",
    "name",
    "Name",
  ]);
  const giaHienTai = pickNumber(record, [
    "GiaHienTai",
    "giaHienTai",
    "DonGia",
    "donGia",
    "gia",
    "Gia",
  ]);

  if (dichVuId === null || tenDichVu === null || giaHienTai === null) {
    throw new Error("Không thể chuẩn hóa dữ liệu dịch vụ.");
  }

  return {
    DichVu_ID: dichVuId,
    TenDichVu: tenDichVu,
    GiaHienTai: giaHienTai,
  };
}

function tryNormalizePublicService(raw: unknown) {
  try {
    return normalizePublicService(raw);
  } catch {
    return null;
  }
}

export async function getPublicServices() {
  const payload = await request<unknown>("/api/public/dich-vu", {
    cache: "no-store",
  });

  return extractListPayload(payload)
    .map((item) => tryNormalizePublicService(item))
    .filter((item): item is PublicServiceItem => item !== null)
    .sort((currentItem, nextItem) => currentItem.DichVu_ID - nextItem.DichVu_ID);
}
