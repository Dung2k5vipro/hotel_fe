import { request } from "@/services/api";
import { getStoredToken } from "@/services/auth";
import {
  buildLoaiPhongRequestBody,
  normalizeLoaiPhong,
  tryNormalizeLoaiPhong,
  type LoaiPhongPayload,
} from "@/types/loai-phong";

type UnknownRecord = Record<string, unknown>;

function getAuthToken() {
  return getStoredToken();
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findListPayload(payload: unknown, depth = 0): unknown[] | null {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload) || depth > 4) {
    return null;
  }

  const source = payload as UnknownRecord;
  const candidates = [
    source.data,
    source.items,
    source.results,
    source.result,
    source.payload,
    source.loaiPhongs,
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
  if (!isRecord(payload) || depth > 4) {
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

    if (tryNormalizeLoaiPhong(candidate)) {
      return candidate;
    }

    const unwrapped = extractItemPayload(candidate, depth + 1);

    if (unwrapped !== candidate) {
      return unwrapped;
    }
  }

  return payload;
}

export async function getLoaiPhongList() {
  const payload = await request<unknown>("/api/loai-phong", {
    cache: "no-store",
    token: getAuthToken(),
  });

  return extractListPayload(payload).map(normalizeLoaiPhong);
}

export async function getLoaiPhongById(id: number) {
  const payload = await request<unknown>(`/api/loai-phong/${id}`, {
    cache: "no-store",
    token: getAuthToken(),
  });

  return normalizeLoaiPhong(extractItemPayload(payload));
}

export async function createLoaiPhong(payload: LoaiPhongPayload) {
  const response = await request<unknown>("/api/loai-phong", {
    body: buildLoaiPhongRequestBody(payload),
    cache: "no-store",
    method: "POST",
    token: getAuthToken(),
  });

  const normalized = tryNormalizeLoaiPhong(extractItemPayload(response));

  if (normalized) {
    return normalized;
  }

  const latestList = await getLoaiPhongList();

  return (
    latestList
      .filter(
        (item) =>
          item.tenLoaiPhong === payload.tenLoaiPhong &&
          item.giaCoBan === payload.giaCoBan &&
          item.soNguoiToiDa === payload.soNguoiToiDa,
      )
      .sort((currentItem, nextItem) => nextItem.loaiPhongId - currentItem.loaiPhongId)[0] ??
    null
  );
}

export async function updateLoaiPhong(id: number, payload: LoaiPhongPayload) {
  const response = await request<unknown>(`/api/loai-phong/${id}`, {
    body: buildLoaiPhongRequestBody(payload),
    cache: "no-store",
    method: "PUT",
    token: getAuthToken(),
  });

  const normalized = tryNormalizeLoaiPhong(extractItemPayload(response));

  if (normalized) {
    return normalized;
  }

  try {
    return await getLoaiPhongById(id);
  } catch {
    return null;
  }
}

export async function deleteLoaiPhong(id: number) {
  await request<unknown>(`/api/loai-phong/${id}`, {
    cache: "no-store",
    method: "DELETE",
    token: getAuthToken(),
  });
}
