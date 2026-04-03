import { repairVietnameseText } from "@/lib/text";

type DatPhongFormValidationInput = {
  khachHangId: number | string;
  soPhong: string;
  ngayNhanPhong: string;
  ngayTraPhong: string;
};

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

export function validateDatPhongFormInput(
  input: DatPhongFormValidationInput,
) {
  const values = {
    khachHangId:
      typeof input.khachHangId === "number"
        ? input.khachHangId
        : Number(input.khachHangId),
    soPhong: input.soPhong.trim(),
    ngayNhanPhong: input.ngayNhanPhong.trim(),
    ngayTraPhong: input.ngayTraPhong.trim(),
  };

  if (!Number.isFinite(values.khachHangId) || values.khachHangId <= 0) {
    return {
      error: "Vui lòng chọn khách hàng hợp lệ.",
      values,
    };
  }

  if (!values.ngayNhanPhong) {
    return {
      error: "Vui lòng chọn ngày nhận phòng.",
      values,
    };
  }

  if (!values.ngayTraPhong) {
    return {
      error: "Vui lòng chọn ngày trả phòng.",
      values,
    };
  }

  if (!isDatPhongDateRangeValid(values.ngayNhanPhong, values.ngayTraPhong)) {
    return {
      error: "Ngày trả phòng phải sau ngày nhận phòng.",
      values,
    };
  }

  if (!values.soPhong) {
    return {
      error: "Vui lòng chọn phòng trống.",
      values,
    };
  }

  return {
    error: null,
    values,
  };
}

export function mapDatPhongErrorMessage(
  error: unknown,
  fallbackMessage = "Không thể lưu đặt phòng.",
) {
  const rawMessage = error instanceof Error ? error.message : fallbackMessage;
  const message = repairVietnameseText(rawMessage);
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("overbook") ||
    normalizedMessage.includes("đã được đặt") ||
    (normalizedMessage.includes("phòng") &&
      normalizedMessage.includes("thời gian"))
  ) {
    return "Phòng đã được đặt trong khoảng thời gian này.";
  }

  if (
    normalizedMessage.includes("ngày trả") ||
    normalizedMessage.includes("invalid date")
  ) {
    return "Ngày trả phòng phải sau ngày nhận phòng.";
  }

  if (
    normalizedMessage.includes("check-in") &&
    normalizedMessage.includes("trạng thái")
  ) {
    return "Không thể check-in do trạng thái đặt phòng không hợp lệ.";
  }

  return message || fallbackMessage;
}
