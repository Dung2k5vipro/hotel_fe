import { repairVietnameseText } from "@/lib/text";
import { request } from "@/services/api";
import { getStoredToken } from "@/services/auth";
import type {
  DichVu,
  DichVuPayload,
  SuDungDichVu,
  SuDungDichVuPayload,
} from "@/types/dich-vu";

type UnknownRecord = Record<string, unknown>;

const DICH_VU_ENDPOINTS = {
  list: "/api/dich-vu",
  detail: (id: number) => `/api/dich-vu/${id}`,
  create: "/api/dich-vu",
  update: (id: number) => `/api/dich-vu/${id}`,
  delete: (id: number) => `/api/dich-vu/${id}`,
};

const SU_DUNG_DICH_VU_ENDPOINTS = {
  list: "/api/su-dung-dich-vu",
  byReservation: (datPhongId: number) =>
    `/api/su-dung-dich-vu/reservation/${datPhongId}`,
  create: "/api/su-dung-dich-vu",
  delete: (id: number) => `/api/su-dung-dich-vu/${id}`,
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

function unwrapRecord(
  input: unknown,
  isTargetRecord: (value: unknown) => value is UnknownRecord,
  candidates: string[],
  depth = 0,
): UnknownRecord | null {
  if (!isRecord(input) || depth > 5) {
    return null;
  }

  if (isTargetRecord(input)) {
    return input;
  }

  const source = input as UnknownRecord;

  for (const key of candidates) {
    const candidate = source[key];
    const unwrapped = unwrapRecord(candidate, isTargetRecord, candidates, depth + 1);

    if (unwrapped) {
      return unwrapped;
    }
  }

  return source;
}

function findListResponse(payload: unknown, depth = 0): unknown[] | null {
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
    source.list,
    source.rows,
    source.records,
    source.services,
    source.Services,
    source.dichVu,
    source.dichVus,
    source.DichVu,
    source.DichVus,
    source.usages,
    source.usage,
    source.suDungDichVu,
    source.suDungDichVus,
    source.SuDungDichVu,
    source.SuDungDichVus,
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

export function extractListResponse(payload: unknown) {
  return findListResponse(payload) ?? [];
}

export function extractItemResponse(payload: unknown, depth = 0): unknown {
  if (Array.isArray(payload)) {
    return payload[0] ?? payload;
  }

  if (!isRecord(payload) || depth > 5) {
    return payload;
  }

  const source = payload as UnknownRecord;
  const candidates = [
    source.data,
    source.item,
    source.result,
    source.payload,
    source.service,
    source.Service,
    source.dichVu,
    source.DichVu,
    source.usage,
    source.Usage,
    source.suDungDichVu,
    source.SuDungDichVu,
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

  return payload;
}

function isDichVuLikeRecord(value: unknown): value is UnknownRecord {
  if (!isRecord(value)) {
    return false;
  }

  return [
    "id",
    "ID",
    "DichVu_ID",
    "DichVuId",
    "DichVuID",
    "tenDichVu",
    "TenDichVu",
    "giaHienTai",
    "GiaHienTai",
  ].some((key) => key in value);
}

function isSuDungDichVuLikeRecord(value: unknown): value is UnknownRecord {
  if (!isRecord(value)) {
    return false;
  }

  return [
    "id",
    "ID",
    "SuDung_ID",
    "SuDungId",
    "SuDungID",
    "DatPhong_ID",
    "DatPhongId",
    "DichVu_ID",
    "DichVuId",
    "SoLuong",
    "GiaTaiThoiDiem",
    "NgaySuDung",
  ].some((key) => key in value);
}

export function normalizeDichVu(raw: unknown): DichVu {
  const record = unwrapRecord(raw, isDichVuLikeRecord, [
    "dataValues",
    "data",
    "item",
    "result",
    "payload",
    "service",
    "Service",
    "dichVu",
    "DichVu",
  ]);

  if (!record) {
    throw new Error("Dữ liệu dịch vụ không hợp lệ.");
  }

  const id = pickNumber(record, [
    "id",
    "ID",
    "dichVuId",
    "DichVu_ID",
    "DichVuId",
    "DichVuID",
    "serviceId",
    "ServiceId",
  ]);
  const tenDichVu = pickString(record, [
    "tenDichVu",
    "TenDichVu",
    "serviceName",
    "ServiceName",
    "name",
    "Name",
  ]);
  const giaHienTai = pickNumber(record, [
    "giaHienTai",
    "GiaHienTai",
    "price",
    "Price",
    "currentPrice",
    "CurrentPrice",
    "donGia",
    "DonGia",
    "gia",
    "Gia",
  ]);

  if (id === null || tenDichVu === null || giaHienTai === null) {
    throw new Error("Không thể chuẩn hóa dữ liệu dịch vụ.");
  }

  return {
    id,
    tenDichVu,
    giaHienTai,
  };
}

function tryNormalizeDichVu(raw: unknown) {
  try {
    return normalizeDichVu(raw);
  } catch {
    return null;
  }
}

export function normalizeSuDungDichVu(raw: unknown): SuDungDichVu {
  const record = unwrapRecord(raw, isSuDungDichVuLikeRecord, [
    "dataValues",
    "data",
    "item",
    "result",
    "payload",
    "usage",
    "Usage",
    "suDungDichVu",
    "SuDungDichVu",
  ]);

  if (!record) {
    throw new Error("Dữ liệu sử dụng dịch vụ không hợp lệ.");
  }

  const normalizedDichVu = tryNormalizeDichVu(
    record.dichVu ?? record.DichVu ?? record.service ?? record.Service,
  );
  const id = pickNumber(record, [
    "id",
    "ID",
    "suDungId",
    "SuDung_ID",
    "SuDungId",
    "SuDungID",
    "usageId",
    "UsageId",
  ]);
  const datPhongId = pickNumber(record, [
    "datPhongId",
    "DatPhong_ID",
    "DatPhongId",
    "DatPhongID",
    "reservationId",
    "ReservationId",
  ]);
  const dichVuId =
    pickNumber(record, [
      "dichVuId",
      "DichVu_ID",
      "DichVuId",
      "DichVuID",
      "serviceId",
      "ServiceId",
    ]) ??
    normalizedDichVu?.id ??
    null;
  const soLuong = pickNumber(record, [
    "soLuong",
    "SoLuong",
    "quantity",
    "Quantity",
  ]);
  const giaTaiThoiDiem =
    pickNumber(record, [
      "giaTaiThoiDiem",
      "GiaTaiThoiDiem",
      "price",
      "Price",
      "donGia",
      "DonGia",
      "gia",
      "Gia",
    ]) ??
    normalizedDichVu?.giaHienTai ??
    null;

  if (
    id === null ||
    datPhongId === null ||
    dichVuId === null ||
    soLuong === null ||
    giaTaiThoiDiem === null
  ) {
    throw new Error("Không thể chuẩn hóa dữ liệu sử dụng dịch vụ.");
  }

  return {
    id,
    datPhongId,
    dichVuId,
    soLuong,
    giaTaiThoiDiem,
    ngaySuDung:
      pickString(record, [
        "ngaySuDung",
        "NgaySuDung",
        "createdAt",
        "CreatedAt",
        "updatedAt",
        "UpdatedAt",
      ]) ?? "",
    tenDichVu:
      pickString(record, [
        "tenDichVu",
        "TenDichVu",
        "serviceName",
        "ServiceName",
      ]) ?? normalizedDichVu?.tenDichVu,
    dichVu: normalizedDichVu,
  };
}

function tryNormalizeSuDungDichVu(raw: unknown) {
  try {
    return normalizeSuDungDichVu(raw);
  } catch {
    return null;
  }
}

function buildDichVuRequestBody(payload: DichVuPayload) {
  return {
    TenDichVu: payload.tenDichVu,
    GiaHienTai: payload.giaHienTai,
  };
}

function buildSuDungDichVuRequestBody(payload: SuDungDichVuPayload) {
  return {
    DatPhong_ID: payload.datPhongId,
    DichVu_ID: payload.dichVuId,
    SoLuong: payload.soLuong,
  };
}

function sortDichVuByNewest(list: DichVu[]) {
  return [...list].sort((currentItem, nextItem) => nextItem.id - currentItem.id);
}

function sortSuDungDichVuByNewest(list: SuDungDichVu[]) {
  return [...list].sort((currentItem, nextItem) => {
    const currentTime = currentItem.ngaySuDung
      ? new Date(currentItem.ngaySuDung).getTime()
      : 0;
    const nextTime = nextItem.ngaySuDung
      ? new Date(nextItem.ngaySuDung).getTime()
      : 0;

    if (currentTime !== nextTime) {
      return nextTime - currentTime;
    }

    return nextItem.id - currentItem.id;
  });
}

export async function getDichVuList() {
  const payload = await request<unknown>(DICH_VU_ENDPOINTS.list, {
    cache: "no-store",
    token: getAuthToken(),
  });

  return sortDichVuByNewest(
    extractListResponse(payload)
      .map((item) => tryNormalizeDichVu(item))
      .filter((item): item is NonNullable<typeof item> => item !== null),
  );
}

export async function getDichVuById(id: number) {
  const payload = await request<unknown>(DICH_VU_ENDPOINTS.detail(id), {
    cache: "no-store",
    token: getAuthToken(),
  });

  return normalizeDichVu(extractItemResponse(payload));
}

export async function createDichVu(payload: DichVuPayload) {
  const response = await request<unknown>(DICH_VU_ENDPOINTS.create, {
    body: buildDichVuRequestBody(payload),
    cache: "no-store",
    method: "POST",
    token: getAuthToken(),
  });

  const normalized = tryNormalizeDichVu(extractItemResponse(response));

  if (normalized) {
    return normalized;
  }

  const latestList = await getDichVuList();

  return (
    latestList.find(
      (item) =>
        item.tenDichVu === payload.tenDichVu &&
        item.giaHienTai === payload.giaHienTai,
    ) ?? null
  );
}

export async function updateDichVu(id: number, payload: DichVuPayload) {
  const response = await request<unknown>(DICH_VU_ENDPOINTS.update(id), {
    body: buildDichVuRequestBody(payload),
    cache: "no-store",
    method: "PUT",
    token: getAuthToken(),
  });

  const normalized = tryNormalizeDichVu(extractItemResponse(response));

  if (normalized) {
    return normalized;
  }

  try {
    return await getDichVuById(id);
  } catch {
    return null;
  }
}

export async function deleteDichVu(id: number) {
  await request<unknown>(DICH_VU_ENDPOINTS.delete(id), {
    cache: "no-store",
    method: "DELETE",
    token: getAuthToken(),
  });
}

export async function getAllSuDungDichVu() {
  const payload = await request<unknown>(SU_DUNG_DICH_VU_ENDPOINTS.list, {
    cache: "no-store",
    token: getAuthToken(),
  });

  return sortSuDungDichVuByNewest(
    extractListResponse(payload)
      .map((item) => tryNormalizeSuDungDichVu(item))
      .filter((item): item is NonNullable<typeof item> => item !== null),
  );
}

export async function getSuDungDichVuByReservation(datPhongId: number) {
  const payload = await request<unknown>(
    SU_DUNG_DICH_VU_ENDPOINTS.byReservation(datPhongId),
    {
      cache: "no-store",
      token: getAuthToken(),
    },
  );

  return sortSuDungDichVuByNewest(
    extractListResponse(payload)
      .map((item) => tryNormalizeSuDungDichVu(item))
      .filter((item): item is NonNullable<typeof item> => item !== null),
  );
}

export async function createSuDungDichVu(payload: SuDungDichVuPayload) {
  const response = await request<unknown>(SU_DUNG_DICH_VU_ENDPOINTS.create, {
    body: buildSuDungDichVuRequestBody(payload),
    cache: "no-store",
    method: "POST",
    token: getAuthToken(),
  });

  const normalized = tryNormalizeSuDungDichVu(extractItemResponse(response));

  if (normalized) {
    return normalized;
  }

  const latestList = await getSuDungDichVuByReservation(payload.datPhongId);

  return (
    latestList.find(
      (item) =>
        item.datPhongId === payload.datPhongId &&
        item.dichVuId === payload.dichVuId &&
        item.soLuong === payload.soLuong,
    ) ?? null
  );
}

export async function deleteSuDungDichVu(id: number) {
  await request<unknown>(SU_DUNG_DICH_VU_ENDPOINTS.delete(id), {
    cache: "no-store",
    method: "DELETE",
    token: getAuthToken(),
  });
}
