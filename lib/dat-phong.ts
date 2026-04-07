import { repairVietnameseText } from "@/lib/text";

type DatPhongFormValidationInput = {
  khachHangId: number | string;
  soPhong: string;
  soNguoi: number | string;
  ngayNhanPhong: string;
  ngayTraPhong: string;
};

const ONE_DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatLocalDateTime(date: Date) {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function normalizeDatPhongDateInput(value?: string | null) {
  if (!value) {
    return "";
  }

  const normalized = repairVietnameseText(value).trim();

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    return normalized;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return normalized.slice(0, 16);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized}T00:00`;
  }

  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(normalized)) {
    return normalized.replace(" ", "T");
  }

  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return normalized.replace(" ", "T").slice(0, 16);
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(normalized)) {
    return normalized.slice(0, 16);
  }

  const parsedDate = new Date(normalized);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return formatLocalDateTime(parsedDate);
}

export function toDatPhongBackendDateTime(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return normalized;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized}T00:00:00`;
  }

  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized.replace(" ", "T")}:00`;
  }

  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return normalized.replace(" ", "T");
  }

  return normalized;
}

export function isDatPhongDateRangeValid(
  ngayNhanPhong: string,
  ngayTraPhong: string,
) {
  if (!ngayNhanPhong || !ngayTraPhong) {
    return false;
  }

  const startDate = new Date(ngayNhanPhong);
  const endDate = new Date(ngayTraPhong);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return false;
  }

  return endDate.getTime() > startDate.getTime();
}

export function calculateSoDemLuuTruFallback(
  ngayNhanPhong?: string | null,
  ngayTraPhong?: string | null,
) {
  if (!ngayNhanPhong || !ngayTraPhong) {
    return null;
  }

  const startDate = new Date(ngayNhanPhong);
  const endDate = new Date(ngayTraPhong);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  const milliseconds = endDate.getTime() - startDate.getTime();

  if (milliseconds <= 0) {
    return null;
  }

  return Math.max(1, Math.ceil(milliseconds / ONE_DAY_IN_MILLISECONDS));
}

export function calculateTongTienPhongDuKienFallback(params: {
  giaMoiDem?: number | null;
  soDemLuuTru?: number | null;
}) {
  const { giaMoiDem, soDemLuuTru } = params;

  if (
    typeof giaMoiDem !== "number" ||
    !Number.isFinite(giaMoiDem) ||
    typeof soDemLuuTru !== "number" ||
    !Number.isFinite(soDemLuuTru) ||
    soDemLuuTru < 1
  ) {
    return null;
  }

  return giaMoiDem * Math.floor(soDemLuuTru);
}

export function validateDatPhongFormInput(
  input: DatPhongFormValidationInput,
) {
  const values = {
    khachHangId:
      typeof input.khachHangId === "number"
        ? input.khachHangId
        : Number(input.khachHangId),
    soPhong: input.soPhong.trim(),
    soNguoi:
      typeof input.soNguoi === "number" ? input.soNguoi : Number(input.soNguoi),
    ngayNhanPhong: input.ngayNhanPhong.trim(),
    ngayTraPhong: input.ngayTraPhong.trim(),
  };

  if (!Number.isFinite(values.khachHangId) || values.khachHangId <= 0) {
    return {
      error: "Vui lÃ²ng chá»n khÃ¡ch hÃ ng há»£p lá»‡.",
      values,
    };
  }

  if (!values.ngayNhanPhong) {
    return {
      error: "Vui lÃ²ng chá»n ngÃ y nháº­n phÃ²ng.",
      values,
    };
  }

  if (!values.ngayTraPhong) {
    return {
      error: "Vui lÃ²ng chá»n ngÃ y tráº£ phÃ²ng.",
      values,
    };
  }

  if (!isDatPhongDateRangeValid(values.ngayNhanPhong, values.ngayTraPhong)) {
    return {
      error: "NgÃ y tráº£ phÃ²ng pháº£i sau ngÃ y nháº­n phÃ²ng.",
      values,
    };
  }

  if (!values.soPhong) {
    return {
      error: "Vui lÃ²ng chá»n phÃ²ng trá»‘ng.",
      values,
    };
  }

  if (!Number.isFinite(values.soNguoi) || values.soNguoi < 1) {
    return {
      error: "So nguoi phai lon hon hoac bang 1.",
      values,
    };
  }

  return {
    error: null,
    values: {
      ...values,
      soNguoi: Math.floor(values.soNguoi),
    },
  };
}

export function mapDatPhongErrorMessage(
  error: unknown,
  fallbackMessage = "KhÃ´ng thá»ƒ lÆ°u Ä‘áº·t phÃ²ng.",
) {
  const rawMessage = error instanceof Error ? error.message : fallbackMessage;
  const message = repairVietnameseText(rawMessage);
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("overbook") ||
    normalizedMessage.includes("Ä‘Ã£ Ä‘Æ°á»£c Ä‘áº·t") ||
    (normalizedMessage.includes("phÃ²ng") &&
      normalizedMessage.includes("thá»i gian"))
  ) {
    return "PhÃ²ng Ä‘Ã£ Ä‘Æ°á»£c Ä‘áº·t trong khoáº£ng thá»i gian nÃ y.";
  }

  if (
    normalizedMessage.includes("ngÃ y tráº£") ||
    normalizedMessage.includes("invalid date")
  ) {
    return "NgÃ y tráº£ phÃ²ng pháº£i sau ngÃ y nháº­n phÃ²ng.";
  }

  if (
    normalizedMessage.includes("check-in") &&
    normalizedMessage.includes("tráº¡ng thÃ¡i")
  ) {
    return "KhÃ´ng thá»ƒ check-in do tráº¡ng thÃ¡i Ä‘áº·t phÃ²ng khÃ´ng há»£p lá»‡.";
  }

  return message || fallbackMessage;
}

