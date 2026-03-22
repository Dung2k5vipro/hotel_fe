import { request } from "@/services/api";
import { getStoredToken } from "@/services/auth";
import {
  buildKhachHangRequestBody,
  normalizeKhachHang,
  tryNormalizeKhachHang,
  type KhachHangPayload,
} from "@/types/khach-hang";

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
    source.khachHangs,
    source.KhachHangs,
    source.customers,
    source.Customers,
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
    source.khachHang,
    source.KhachHang,
    source.customer,
    source.Customer,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || Array.isArray(candidate)) {
      continue;
    }

    if (tryNormalizeKhachHang(candidate)) {
      return candidate;
    }

    const unwrapped = extractItemPayload(candidate, depth + 1);

    if (unwrapped !== candidate) {
      return unwrapped;
    }
  }

  return payload;
}

export async function getKhachHangList() {
  const payload = await request<unknown>("/api/khach-hang", {
    cache: "no-store",
    token: getAuthToken(),
  });

  return extractListPayload(payload).map(normalizeKhachHang);
}

export async function searchKhachHang(query: string) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return getKhachHangList();
  }

  const payload = await request<unknown>(
    `/api/khach-hang/search?query=${encodeURIComponent(normalizedQuery)}`,
    {
      cache: "no-store",
      token: getAuthToken(),
    },
  );

  return extractListPayload(payload).map(normalizeKhachHang);
}

export async function getKhachHangById(id: number) {
  const payload = await request<unknown>(`/api/khach-hang/${id}`, {
    cache: "no-store",
    token: getAuthToken(),
  });

  return normalizeKhachHang(extractItemPayload(payload));
}

export async function createKhachHang(payload: KhachHangPayload) {
  const response = await request<unknown>("/api/khach-hang", {
    body: buildKhachHangRequestBody(payload),
    cache: "no-store",
    method: "POST",
    token: getAuthToken(),
  });

  const normalized = tryNormalizeKhachHang(extractItemPayload(response));

  if (normalized) {
    return normalized;
  }

  const latestList = await getKhachHangList();

  return (
    latestList
      .filter((item) => {
        if (payload.cccd) {
          return item.cccd === payload.cccd;
        }

        return (
          item.hoTen === payload.hoTen &&
          item.thongTinLienHe === payload.thongTinLienHe
        );
      })
      .sort(
        (currentItem, nextItem) =>
          nextItem.khachHangId - currentItem.khachHangId,
      )[0] ?? null
  );
}

export async function updateKhachHang(id: number, payload: KhachHangPayload) {
  const response = await request<unknown>(`/api/khach-hang/${id}`, {
    body: buildKhachHangRequestBody(payload),
    cache: "no-store",
    method: "PUT",
    token: getAuthToken(),
  });

  const normalized = tryNormalizeKhachHang(extractItemPayload(response));

  if (normalized) {
    return normalized;
  }

  try {
    return await getKhachHangById(id);
  } catch {
    return null;
  }
}

export async function deleteKhachHang(id: number) {
  await request<unknown>(`/api/khach-hang/${id}`, {
    cache: "no-store",
    method: "DELETE",
    token: getAuthToken(),
  });
}
