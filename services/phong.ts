import { request } from "@/services/api";
import { getStoredToken } from "@/services/auth";
import {
  buildPhongRequestBody,
  normalizePhong,
  tryNormalizePhong,
  type PhongPayload,
} from "@/types/phong";

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

  if (tryNormalizePhong(payload)) {
    return [payload];
  }

  const source = payload as UnknownRecord;
  const candidates = [
    source.data,
    source.items,
    source.results,
    source.result,
    source.payload,
    source.phong,
    source.Phong,
    source.phongs,
    source.Phongs,
    source.room,
    source.Room,
    source.rooms,
    source.Rooms,
  ];

  for (const candidate of candidates) {
    const found = findListPayload(candidate, depth + 1);

    if (found !== null) {
      return found;
    }
  }

  const values = Object.values(source);

  if (
    values.length > 0 &&
    values.every(
      (item) =>
        tryNormalizePhong(item) !== null ||
        (Array.isArray(item) &&
          item.every((child) => tryNormalizePhong(child) !== null)),
    )
  ) {
    return values.flatMap((item) => (Array.isArray(item) ? item : [item]));
  }

  for (const candidate of values) {
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
    source.phong,
    source.Phong,
    source.room,
    source.Room,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || Array.isArray(candidate)) {
      continue;
    }

    if (tryNormalizePhong(candidate)) {
      return candidate;
    }

    const unwrapped = extractItemPayload(candidate, depth + 1);

    if (unwrapped !== candidate) {
      return unwrapped;
    }
  }

  return payload;
}

export async function getPhongList() {
  const payload = await request<unknown>("/api/phong", {
    cache: "no-store",
    token: getAuthToken(),
  });

  return extractListPayload(payload)
    .map((item) => tryNormalizePhong(item))
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

export async function getPhongBySoPhong(soPhong: string) {
  const payload = await request<unknown>(
    `/api/phong/${encodeURIComponent(soPhong)}`,
    {
      cache: "no-store",
      token: getAuthToken(),
    },
  );

  return normalizePhong(extractItemPayload(payload));
}

export async function createPhong(payload: PhongPayload) {
  const response = await request<unknown>("/api/phong", {
    body: buildPhongRequestBody(payload),
    cache: "no-store",
    method: "POST",
    token: getAuthToken(),
  });

  const normalized = tryNormalizePhong(extractItemPayload(response));

  if (normalized) {
    return normalized;
  }

  try {
    return await getPhongBySoPhong(payload.soPhong);
  } catch {
    return null;
  }
}

export async function updatePhong(soPhong: string, payload: PhongPayload) {
  const response = await request<unknown>(
    `/api/phong/${encodeURIComponent(soPhong)}`,
    {
      body: buildPhongRequestBody(payload),
      cache: "no-store",
      method: "PUT",
      token: getAuthToken(),
    },
  );

  const normalized = tryNormalizePhong(extractItemPayload(response));

  if (normalized) {
    return normalized;
  }

  try {
    return await getPhongBySoPhong(payload.soPhong);
  } catch {
    return null;
  }
}

export async function deletePhong(soPhong: string) {
  await request<unknown>(`/api/phong/${encodeURIComponent(soPhong)}`, {
    cache: "no-store",
    method: "DELETE",
    token: getAuthToken(),
  });
}
