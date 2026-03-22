import { repairVietnameseText } from "@/lib/text";

type DatPhongFormValidationInput = {
  khachHangId: number | string;
  soPhong: string;
  ngayNhanPhong: string;
  ngayTraPhong: string;
};

export function normalizeDatPhongDateInput(value?: string | null) {
  if (!value) {
    return "";
  }

  const normalized = repairVietnameseText(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  if (normalized.includes("T")) {
    return normalized.slice(0, 10);
  }

  const parsedDate = new Date(normalized);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toISOString().slice(0, 10);
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
