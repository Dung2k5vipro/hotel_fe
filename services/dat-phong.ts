import {
  ApiRequestError,
  request,
  requestWithMeta,
} from "@/services/api";
import { getStoredToken } from "@/services/auth";
import {
  buildDatPhongRequestBody,
  normalizeAvailablePhong,
  normalizeDatPhong,
  tryNormalizeAvailablePhong,
  tryNormalizeDatPhong,
  type DatPhongPayload,
} from "@/types/dat-phong";

type UnknownRecord = Record<string, unknown>;

const DAT_PHONG_ENDPOINTS = {
  list: "/api/dat-phong",
  detail: (id: number) => `/api/dat-phong/${id}`,
  create: "/api/dat-phong",
  update: (id: number) => `/api/dat-phong/${id}`,
  delete: (id: number) => `/api/dat-phong/${id}`,
  checkAvailability: "/api/dat-phong/check-availability",
    // Nếu backend dùng route khác, chỉnh tại đây.
    // "/api/dat-phong/check-availability",
    // "/api/dat-phong/availability",
    // "/api/phong/check-availability",
    // "/api/phong/availability",
  checkIn: [
    // Nếu backend dùng route khác, chỉnh tại đây.
    (id: number) => `/api/dat-phong/${id}/status`,
    (id: number) => `/api/dat-phong/${id}/check-in`,
    (id: number) => `/api/dat-phong/${id}/checkin`,
  ],
  checkOut: [
    // Nếu backend dùng route khác, chỉnh tại đây.
    (id: number) => `/api/dat-phong/${id}/status`,
    (id: number) => `/api/dat-phong/${id}/check-out`,
    (id: number) => `/api/dat-phong/${id}/checkout`,
  ],
  cancel: [
    // Nếu backend dùng route khác, chỉnh tại đây.
    (id: number) => `/api/dat-phong/${id}/status`,
    (id: number) => `/api/dat-phong/${id}/cancel`,
    (id: number) => `/api/dat-phong/${id}/huy`,
  ],
};

const CHECK_AVAILABILITY_QUERY_VARIANTS: Array<{
  ngayNhanPhong: string;
  ngayTraPhong: string;
}> = [
  { ngayNhanPhong: "ngayNhanPhong", ngayTraPhong: "ngayTraPhong" },
  { ngayNhanPhong: "NgayNhanPhong", ngayTraPhong: "NgayTraPhong" },
  { ngayNhanPhong: "checkInDate", ngayTraPhong: "checkOutDate" },
  { ngayNhanPhong: "CheckInDate", ngayTraPhong: "CheckOutDate" },
];

const DAT_PHONG_DEBUG_ENABLED = process.env.NODE_ENV !== "production";

function getAuthToken() {
  return getStoredToken();
}

function logDatPhongDebug(event: string, payload: Record<string, unknown>) {
  if (!DAT_PHONG_DEBUG_ENABLED) {
    return;
  }

  console.info(`[dat-phong] ${event}`, payload);
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFallbackableEndpointError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("(404") ||
    message.includes("(405") ||
    message.includes("not found") ||
    message.includes("cannot put") ||
    message.includes("cannot get")
  );
}

function isStatusValidationError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("trạng thái") ||
    message.includes("trang thai") ||
    message.includes("status") ||
    message.includes("enum")
  );
}

function isAvailabilityVariantError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    isFallbackableEndpointError(error) ||
    message.includes("không tìm thấy thông tin đặt phòng") ||
    message.includes("khong tim thay thong tin dat phong") ||
    message.includes("query") ||
    message.includes("tham số") ||
    message.includes("required")
  );
}

function isCreateVariantError(error: unknown) {
  if (error instanceof ApiRequestError) {
    if ([400, 404, 405, 415, 422].includes(error.status)) {
      const message = error.message.toLowerCase();

      if (
        message.includes("overbook") ||
        message.includes("đã được đặt") ||
        message.includes("ngày trả") ||
        message.includes("thời gian")
      ) {
        return false;
      }

      return true;
    }

    return false;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("required") ||
    message.includes("validation") ||
    message.includes("payload") ||
    message.includes("request body") ||
    message.includes("cannot post") ||
    message.includes("body")
  );
}

function buildCreateDatPhongRequestBodies(payload: DatPhongPayload) {
  return [
    buildDatPhongRequestBody({
      ...payload,
      trangThai: undefined,
    }),
  ];
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
    source.datPhongs,
    source.DatPhongs,
    source.bookings,
    source.Bookings,
    source.reservations,
    source.Reservations,
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
    source.datPhong,
    source.DatPhong,
    source.booking,
    source.Booking,
    source.reservation,
    source.Reservation,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || Array.isArray(candidate)) {
      continue;
    }

    if (tryNormalizeDatPhong(candidate)) {
      return candidate;
    }

    const unwrapped = extractItemPayload(candidate, depth + 1);

    if (unwrapped !== candidate) {
      return unwrapped;
    }
  }

  return payload;
}

function findAvailabilityListPayload(payload: unknown, depth = 0): unknown[] | null {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload) || depth > 4) {
    return null;
  }

  if (tryNormalizeAvailablePhong(payload)) {
    return [payload];
  }

  const source = payload as UnknownRecord;
  const candidates = [
    source.data,
    source.items,
    source.results,
    source.result,
    source.payload,
    source.rooms,
    source.Rooms,
    source.availableRooms,
    source.AvailableRooms,
    source.available,
    source.Available,
    source.phong,
    source.Phong,
    source.room,
    source.Room,
    source.phongTrong,
    source.PhongTrong,
  ];

  for (const candidate of candidates) {
    const found = findAvailabilityListPayload(candidate, depth + 1);

    if (found !== null) {
      return found;
    }
  }

  const values = Object.values(source);

  if (
    values.length > 0 &&
    values.every(
      (item) =>
        tryNormalizeAvailablePhong(item) !== null ||
        (Array.isArray(item) &&
          item.every((child) => tryNormalizeAvailablePhong(child) !== null)),
    )
  ) {
    return values.flatMap((item) => (Array.isArray(item) ? item : [item]));
  }

  for (const candidate of values) {
    const found = findAvailabilityListPayload(candidate, depth + 1);

    if (found !== null) {
      return found;
    }
  }

  return null;
}

function extractAvailabilityListPayload(payload: unknown) {
  return findAvailabilityListPayload(payload) ?? [];
}

function buildActionEndpointCandidates(
  builders: Array<(id: number) => string>,
  id: number,
) {
  return builders.map((buildPath) => buildPath(id));
}

async function resolveStatusActionResponse(
  id: number,
  response: unknown,
) {
  const normalized = tryNormalizeDatPhong(extractItemPayload(response));

  if (normalized) {
    return normalized;
  }

  try {
    return await getDatPhongById(id);
  } catch {
    return null;
  }
}

function normalizeDateForPayload(value: string) {
  const normalized = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  if (normalized.includes("T")) {
    return normalized.slice(0, 10);
  }

  const parsedDate = new Date(normalized);

  if (Number.isNaN(parsedDate.getTime())) {
    return normalized;
  }

  return parsedDate.toISOString().slice(0, 10);
}

async function updateDatPhongStatusViaDetailAndUpdate(
  id: number,
  statusCandidates: string[],
) {
  const currentBooking = await getDatPhongById(id);
  let lastError: unknown = null;

  for (const status of statusCandidates) {
    try {
      return await updateDatPhong(id, {
        khachHangId: currentBooking.khachHangId,
        soPhong: currentBooking.soPhong,
        soNguoi: currentBooking.soNguoi ?? 1,
        ngayNhanPhong: normalizeDateForPayload(currentBooking.ngayNhanPhong),
        ngayTraPhong: normalizeDateForPayload(currentBooking.ngayTraPhong),
        trangThai: status,
      });
    } catch (error) {
      lastError = error;

      if (!isStatusValidationError(error)) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("Không thể cập nhật trạng thái đặt phòng.");
}

async function changeDatPhongStatus(
  id: number,
  statusCandidates: string[],
  actionEndpoints: Array<(id: number) => string>,
) {
  let lastError: unknown = null;

  for (const status of statusCandidates) {
    for (const path of buildActionEndpointCandidates(actionEndpoints, id)) {
      try {
        const response = await request<unknown>(path, {
          body: { TrangThai: status },
          cache: "no-store",
          method: "PUT",
          token: getAuthToken(),
        });

        const resolved = await resolveStatusActionResponse(id, response);

        if (resolved) {
          return resolved;
        }
      } catch (error) {
        lastError = error;

        if (isStatusValidationError(error) || isFallbackableEndpointError(error)) {
          continue;
        }

        throw error;
      }
    }
  }

  try {
    return await updateDatPhongStatusViaDetailAndUpdate(id, statusCandidates);
  } catch (fallbackError) {
    if (lastError) {
      throw lastError;
    }

    throw fallbackError;
  }
}

export async function getDatPhongList() {
  const payload = await request<unknown>(DAT_PHONG_ENDPOINTS.list, {
    cache: "no-store",
    token: getAuthToken(),
  });

  return extractListPayload(payload)
    .map((item) => tryNormalizeDatPhong(item))
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

export async function getDatPhongById(id: number) {
  const payload = await request<unknown>(DAT_PHONG_ENDPOINTS.detail(id), {
    cache: "no-store",
    token: getAuthToken(),
  });

  return normalizeDatPhong(extractItemPayload(payload));
}

export async function createDatPhong(payload: DatPhongPayload) {
  let requestError: unknown = null;
  const requestBodies = buildCreateDatPhongRequestBodies(payload);

  logDatPhongDebug("create:payload", {
    khachHangId: payload.khachHangId,
    soPhong: payload.soPhong,
    soNguoi: payload.soNguoi,
    ngayNhanPhong: payload.ngayNhanPhong,
    ngayTraPhong: payload.ngayTraPhong,
    trangThai: payload.trangThai ?? null,
    requestVariants: requestBodies.length,
  });

  for (const requestBody of requestBodies) {
    try {
      logDatPhongDebug("create:request", {
        endpoint: DAT_PHONG_ENDPOINTS.create,
        method: "POST",
        body: requestBody,
      });

      const response = await requestWithMeta<unknown>(DAT_PHONG_ENDPOINTS.create, {
        body: requestBody,
        cache: "no-store",
        method: "POST",
        token: getAuthToken(),
      });

      logDatPhongDebug("create:response", {
        status: response.status,
        statusText: response.statusText,
        raw: response.payload,
      });

      const normalized = tryNormalizeDatPhong(extractItemPayload(response.payload));

      logDatPhongDebug("create:normalized", {
        item: normalized,
      });

      if (normalized) {
        return normalized;
      }

      break;
    } catch (error) {
      requestError = error;

      logDatPhongDebug("create:error", {
        message: error instanceof Error ? error.message : "Unknown error",
        status: error instanceof ApiRequestError ? error.status : null,
        raw:
          error instanceof ApiRequestError && error.payload !== undefined
            ? error.payload
            : null,
        body: requestBody,
      });

      if (isCreateVariantError(error)) {
        continue;
      }

      throw error;
    }
  }

  try {
    const latestList = await getDatPhongList();
    const matchedItem =
      latestList
        .filter(
          (item) =>
            item.khachHangId === payload.khachHangId &&
            item.soPhong === payload.soPhong &&
            item.ngayNhanPhong === payload.ngayNhanPhong &&
            item.ngayTraPhong === payload.ngayTraPhong,
        )
        .sort((currentItem, nextItem) => nextItem.datPhongId - currentItem.datPhongId)[0] ??
      null;

    logDatPhongDebug("create:refetch", {
      total: latestList.length,
      matchedItem,
    });

    if (matchedItem) {
      return matchedItem;
    }
  } catch {
    if (!requestError) {
      return null;
    }
  }

  if (requestError) {
    throw requestError;
  }

  return null;
}

export async function updateDatPhong(id: number, payload: DatPhongPayload) {
  let requestError: unknown = null;

  try {
    logDatPhongDebug("update:request", {
      datPhongId: id,
      endpoint: DAT_PHONG_ENDPOINTS.update(id),
      method: "PUT",
      body: buildDatPhongRequestBody(payload),
    });

    const response = await requestWithMeta<unknown>(DAT_PHONG_ENDPOINTS.update(id), {
      body: buildDatPhongRequestBody(payload),
      cache: "no-store",
      method: "PUT",
      token: getAuthToken(),
    });

    logDatPhongDebug("update:response", {
      datPhongId: id,
      status: response.status,
      statusText: response.statusText,
      raw: response.payload,
    });

    const normalized = tryNormalizeDatPhong(extractItemPayload(response.payload));

    logDatPhongDebug("update:normalized", {
      datPhongId: id,
      item: normalized,
    });

    if (normalized) {
      return normalized;
    }
  } catch (error) {
    requestError = error;

    logDatPhongDebug("update:error", {
      datPhongId: id,
      message: error instanceof Error ? error.message : "Unknown error",
      status: error instanceof ApiRequestError ? error.status : null,
      raw:
        error instanceof ApiRequestError && error.payload !== undefined
          ? error.payload
          : null,
    });
  }

  try {
    return await getDatPhongById(id);
  } catch {
    if (requestError) {
      throw requestError;
    }

    return null;
  }
}

export async function deleteDatPhong(id: number) {
  await request<unknown>(DAT_PHONG_ENDPOINTS.delete(id), {
    cache: "no-store",
    method: "DELETE",
    token: getAuthToken(),
  });
}

export async function checkAvailability(params: {
  ngayNhanPhong: string;
  ngayTraPhong: string;
}) {
  const payload = await request<unknown>(DAT_PHONG_ENDPOINTS.checkAvailability, {
    body: params,
    cache: "no-store",
    method: "POST",
    token: getAuthToken(),
  });

  return extractAvailabilityListPayload(payload)
    .map((item) => tryNormalizeAvailablePhong(item))
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .map(normalizeAvailablePhong);

  let lastError: unknown = null;

  for (const basePath of DAT_PHONG_ENDPOINTS.checkAvailability) {
    for (const variant of CHECK_AVAILABILITY_QUERY_VARIANTS) {
      const queryString = new URLSearchParams({
        [variant.ngayNhanPhong]: params.ngayNhanPhong,
        [variant.ngayTraPhong]: params.ngayTraPhong,
      }).toString();
      const path = `${basePath}?${queryString}`;

      try {
        const payload = await request<unknown>(path, {
          cache: "no-store",
          token: getAuthToken(),
        });

        return extractAvailabilityListPayload(payload)
          .map((item) => tryNormalizeAvailablePhong(item))
          .filter((item): item is NonNullable<typeof item> => item !== null)
          .map(normalizeAvailablePhong);
      } catch (error) {
        lastError = error;

        if (isAvailabilityVariantError(error)) {
          continue;
        }

        throw error;
      }
    }
  }

  throw (
    lastError ??
    new Error("Không thể kiểm tra phòng trống với endpoint hiện tại.")
  );
}

export async function checkInDatPhong(id: number) {
  return changeDatPhongStatus(
    id,
    ["DaNhanPhong", "DangO", "DaNhan", "CheckIn"],
    DAT_PHONG_ENDPOINTS.checkIn,
  );
}

export async function checkOutDatPhong(id: number) {
  return changeDatPhongStatus(
    id,
    ["DaTraPhong", "HoanTat", "DaTra", "CheckOut"],
    DAT_PHONG_ENDPOINTS.checkOut,
  );
}

export async function cancelDatPhong(id: number) {
  return changeDatPhongStatus(
    id,
    ["DaHuy", "Huy", "Cancelled", "Canceled"],
    DAT_PHONG_ENDPOINTS.cancel,
  );
}
