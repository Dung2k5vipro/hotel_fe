"use client";

import { useEffect, useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  calculateSoDemLuuTruFallback,
  calculateTongTienPhongDuKienFallback,
} from "@/lib/dat-phong";
import { formatCurrencyVND } from "@/lib/hotel";
import {
  checkAvailability,
  requestBooking,
} from "@/services/public/booking.service";
import type {
  BookingRequestPayload,
  CheckAvailabilityPayload,
  CheckAvailabilityResponse,
} from "@/types/public/public-booking";
import type { PublicRoomType } from "@/types/public/public-room";

type BookingFormValues = {
  hoTen: string;
  thongTinLienHe: string;
  email: string;
  cccd: string;
  quocTich: string;
  loaiPhongId: string;
  ngayNhanPhong: string;
  ngayTraPhong: string;
  soNguoi: string;
  ghiChu: string;
};

type BookingField = keyof BookingFormValues;
type BookingFieldErrors = Partial<Record<BookingField, string>>;
type FeedbackState = {
  tone: "success" | "error" | "info";
  message: string;
} | null;

type BookingFormProps = {
  roomTypes: PublicRoomType[];
  initialLoaiPhongId?: number | null;
};

const DEFAULT_FORM_VALUES: BookingFormValues = {
  hoTen: "",
  thongTinLienHe: "",
  email: "",
  cccd: "",
  quocTich: "",
  loaiPhongId: "",
  ngayNhanPhong: "",
  ngayTraPhong: "",
  soNguoi: "1",
  ghiChu: "",
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getDefaultBookingDateTimeValues() {
  const now = new Date();
  const ngayNhanPhong = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    14,
    0,
    0,
    0,
  );
  const ngayTraPhong = new Date(
    ngayNhanPhong.getFullYear(),
    ngayNhanPhong.getMonth(),
    ngayNhanPhong.getDate() + 1,
    12,
    0,
    0,
    0,
  );

  return {
    ngayNhanPhong: formatDateTimeLocalValue(ngayNhanPhong),
    ngayTraPhong: formatDateTimeLocalValue(ngayTraPhong),
  };
}

function toBackendDateTimeValue(value: string) {
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

  return normalized;
}

function parsePositiveInteger(value: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return Math.floor(parsed);
}

function normalizeOptionalText(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.trim();
  return message.length > 0 ? message : fallback;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getCheckPayload(values: BookingFormValues): CheckAvailabilityPayload | null {
  const loaiPhongId = parsePositiveInteger(values.loaiPhongId);
  const soNguoi = parsePositiveInteger(values.soNguoi);

  if (!loaiPhongId || !soNguoi || !values.ngayNhanPhong || !values.ngayTraPhong) {
    return null;
  }

  return {
    loaiPhongId,
    ngayNhanPhong: toBackendDateTimeValue(values.ngayNhanPhong),
    ngayTraPhong: toBackendDateTimeValue(values.ngayTraPhong),
    soNguoi,
  };
}

function isSameCheckPayload(
  currentPayload: CheckAvailabilityPayload,
  nextPayload: CheckAvailabilityPayload,
) {
  return (
    currentPayload.loaiPhongId === nextPayload.loaiPhongId &&
    currentPayload.ngayNhanPhong === nextPayload.ngayNhanPhong &&
    currentPayload.ngayTraPhong === nextPayload.ngayTraPhong &&
    currentPayload.soNguoi === nextPayload.soNguoi
  );
}

function validateBookingValues(values: BookingFormValues): BookingFieldErrors {
  const errors: BookingFieldErrors = {};

  if (!values.hoTen.trim()) {
    errors.hoTen = "Vui lòng nhập họ tên.";
  }

  if (!values.thongTinLienHe.trim()) {
    errors.thongTinLienHe = "Vui lòng nhập thông tin liên hệ.";
  }

  if (!values.loaiPhongId) {
    errors.loaiPhongId = "Vui lòng chọn loại phòng.";
  }

  if (!values.ngayNhanPhong) {
    errors.ngayNhanPhong = "Vui lòng chọn ngày nhận phòng.";
  }

  if (!values.ngayTraPhong) {
    errors.ngayTraPhong = "Vui lòng chọn ngày trả phòng.";
  }

  if (values.ngayNhanPhong && values.ngayTraPhong) {
    const ngayNhanPhong = new Date(values.ngayNhanPhong).getTime();
    const ngayTraPhong = new Date(values.ngayTraPhong).getTime();

    if (ngayTraPhong <= ngayNhanPhong) {
      errors.ngayTraPhong = "Ngày trả phòng phải lớn hơn ngày nhận phòng.";
    }
  }

  if (values.email.trim() && !isValidEmail(values.email.trim())) {
    errors.email = "Email không đúng định dạng.";
  }

  const soNguoi = parsePositiveInteger(values.soNguoi);

  if (!soNguoi) {
    errors.soNguoi = "Số người phải lớn hơn hoặc bằng 1.";
  }

  return errors;
}

function buildBookingPayload(values: BookingFormValues): BookingRequestPayload {
  return {
    hoTen: values.hoTen.trim(),
    thongTinLienHe: values.thongTinLienHe.trim(),
    email: normalizeOptionalText(values.email),
    cccd: normalizeOptionalText(values.cccd),
    quocTich: normalizeOptionalText(values.quocTich),
    loaiPhongId: parsePositiveInteger(values.loaiPhongId) ?? 0,
    ngayNhanPhong: toBackendDateTimeValue(values.ngayNhanPhong),
    ngayTraPhong: toBackendDateTimeValue(values.ngayTraPhong),
    soNguoi: parsePositiveInteger(values.soNguoi) ?? 1,
    ghiChu: normalizeOptionalText(values.ghiChu),
  };
}

function resolveBookingEstimate(params: {
  ngayNhanPhong: string;
  ngayTraPhong: string;
  giaMoiDemMacDinh?: number | null;
  giaMoiDem?: number;
  soDemLuuTru?: number;
  tongTienPhongDuKien?: number;
}) {
  const soDemLuuTru =
    (typeof params.soDemLuuTru === "number" && Number.isFinite(params.soDemLuuTru)
      ? Math.max(1, Math.floor(params.soDemLuuTru))
      : null) ??
    calculateSoDemLuuTruFallback(params.ngayNhanPhong, params.ngayTraPhong);
  const tongTienPhongDuKienFromApi =
    typeof params.tongTienPhongDuKien === "number" &&
    Number.isFinite(params.tongTienPhongDuKien)
      ? params.tongTienPhongDuKien
      : null;
  const giaMoiDem =
    typeof params.giaMoiDem === "number" && Number.isFinite(params.giaMoiDem)
      ? params.giaMoiDem
      : typeof params.giaMoiDemMacDinh === "number" &&
          Number.isFinite(params.giaMoiDemMacDinh)
        ? params.giaMoiDemMacDinh
        : null;
  const tongTienPhongDuKien =
    tongTienPhongDuKienFromApi ??
    calculateTongTienPhongDuKienFallback({
      giaMoiDem,
      soDemLuuTru,
    });

  return {
    soDemLuuTru,
    tongTienPhongDuKien,
  };
}

function hasBookingEstimate(estimate: {
  soDemLuuTru: number | null;
  tongTienPhongDuKien: number | null;
}) {
  return (
    typeof estimate.soDemLuuTru === "number" ||
    typeof estimate.tongTienPhongDuKien === "number"
  );
}

export function BookingForm({ roomTypes, initialLoaiPhongId }: BookingFormProps) {
  const [values, setValues] = useState<BookingFormValues>(() => {
    const defaultDateTimes = getDefaultBookingDateTimeValues();

    return {
      ...DEFAULT_FORM_VALUES,
      ...defaultDateTimes,
      loaiPhongId: initialLoaiPhongId ? String(initialLoaiPhongId) : "",
    };
  });
  const [errors, setErrors] = useState<BookingFieldErrors>({});
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availability, setAvailability] = useState<CheckAvailabilityResponse | null>(
    null,
  );
  const [checkedPayload, setCheckedPayload] = useState<CheckAvailabilityPayload | null>(
    null,
  );
  const [confirmedEstimate, setConfirmedEstimate] = useState<{
    soDemLuuTru: number | null;
    tongTienPhongDuKien: number | null;
  } | null>(null);

  const minDateTimeLocal = useMemo(() => formatDateTimeLocalValue(new Date()), []);
  const selectedRoomType = useMemo(
    () =>
      roomTypes.find(
        (item) =>
          item.LoaiPhong_ID === (parsePositiveInteger(values.loaiPhongId) ?? -1),
      ) ?? null,
    [roomTypes, values.loaiPhongId],
  );

  const currentCheckPayload = useMemo(() => getCheckPayload(values), [values]);
  const isAvailabilityUpToDate = Boolean(
    checkedPayload &&
      currentCheckPayload &&
      isSameCheckPayload(checkedPayload, currentCheckPayload),
  );
  const currentAvailabilityEstimate = useMemo(() => {
    if (!availability || !isAvailabilityUpToDate) {
      return null;
    }

    const estimate = resolveBookingEstimate({
      ngayNhanPhong: values.ngayNhanPhong,
      ngayTraPhong: values.ngayTraPhong,
      giaMoiDemMacDinh: selectedRoomType?.GiaCoBan ?? null,
      soDemLuuTru: availability.soDemLuuTru,
      tongTienPhongDuKien: availability.tongTienPhongDuKien,
    });

    return hasBookingEstimate(estimate) ? estimate : null;
  }, [
    availability,
    isAvailabilityUpToDate,
    selectedRoomType,
    values.ngayNhanPhong,
    values.ngayTraPhong,
  ]);
  const canSubmitBooking = Boolean(
    isAvailabilityUpToDate && availability?.available && !checking && !submitting,
  );

  useEffect(() => {
    if (!initialLoaiPhongId) {
      return;
    }

    setValues((currentValues) => {
      if (currentValues.loaiPhongId) {
        return currentValues;
      }

      return {
        ...currentValues,
        loaiPhongId: String(initialLoaiPhongId),
      };
    });
  }, [initialLoaiPhongId]);

  useEffect(() => {
    if (!checkedPayload || !currentCheckPayload) {
      return;
    }

    if (!isSameCheckPayload(checkedPayload, currentCheckPayload)) {
      setCheckedPayload(null);
      setAvailability(null);
      setFeedback(null);
      setConfirmedEstimate(null);
    }
  }, [checkedPayload, currentCheckPayload]);

  function handleFieldChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    const key = name as BookingField;

    setValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
    setConfirmedEstimate(null);
    setErrors((currentErrors) => {
      if (!currentErrors[key]) {
        return currentErrors;
      }

      return {
        ...currentErrors,
        [key]: undefined,
      };
    });
  }

  async function handleCheckAvailability() {
    const nextErrors = validateBookingValues(values);
    const payload = getCheckPayload(values);

    setErrors(nextErrors);
    setFeedback(null);
    setConfirmedEstimate(null);

    if (Object.keys(nextErrors).length > 0 || !payload) {
      return;
    }

    setChecking(true);

    try {
      const response = await checkAvailability(payload);
      const availableRoomLabel =
        typeof response.availableCount === "number"
          ? ` (số phòng còn lại: ${response.availableCount})`
          : "";

      setCheckedPayload(payload);
      setAvailability(response);
      setFeedback({
        tone: response.available ? "success" : "info",
        message: `${response.message}${availableRoomLabel}`,
      });
    } catch (error) {
      setCheckedPayload(null);
      setAvailability(null);
      setConfirmedEstimate(null);
      setFeedback({
        tone: "error",
        message: normalizeErrorMessage(error, "Không thể kiểm tra phòng vào lúc này."),
      });
    } finally {
      setChecking(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateBookingValues(values);
    const payload = getCheckPayload(values);

    setErrors(nextErrors);
    setFeedback(null);
    setConfirmedEstimate(null);

    if (Object.keys(nextErrors).length > 0 || !payload) {
      return;
    }

    if (!checkedPayload || !availability?.available) {
      setFeedback({
        tone: "error",
        message: "Vui lòng kiểm tra phòng thành công trước khi gửi yêu cầu.",
      });
      return;
    }

    if (!isSameCheckPayload(checkedPayload, payload)) {
      setCheckedPayload(null);
      setAvailability(null);
      setFeedback({
        tone: "error",
        message: "Bạn đã thay đổi thông tin phòng. Vui lòng kiểm tra lại.",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await requestBooking(buildBookingPayload(values));

      if (!response.success) {
        setFeedback({
          tone: "error",
          message: response.message || "Không thể gửi yêu cầu đặt phòng.",
        });
        return;
      }

      const nextConfirmedEstimate = resolveBookingEstimate({
        ngayNhanPhong: values.ngayNhanPhong,
        ngayTraPhong: values.ngayTraPhong,
        giaMoiDemMacDinh: selectedRoomType?.GiaCoBan ?? null,
        giaMoiDem: response.data?.giaMoiDem,
        soDemLuuTru: response.data?.soDemLuuTru,
        tongTienPhongDuKien: response.data?.tongTienPhongDuKien,
      });
      const preservedRoomId = values.loaiPhongId;
      const defaultDateTimes = getDefaultBookingDateTimeValues();

      setValues({
        ...DEFAULT_FORM_VALUES,
        ...defaultDateTimes,
        loaiPhongId: preservedRoomId,
      });
      setErrors({});
      setCheckedPayload(null);
      setAvailability(null);
      setConfirmedEstimate(
        hasBookingEstimate(nextConfirmedEstimate) ? nextConfirmedEstimate : null,
      );
      setFeedback({
        tone: "success",
        message:
          response.message ||
          "Yêu cầu đặt phòng của bạn đã được ghi nhận. Chúng tôi sẽ liên hệ sớm.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: normalizeErrorMessage(error, "Không thể gửi yêu cầu đặt phòng."),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      onSubmit={handleSubmit}
    >
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Gửi yêu cầu đặt phòng
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Điền thông tin bên dưới, kiểm tra phòng còn trống, sau đó gửi yêu cầu để
          lễ tân liên hệ xác nhận.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="hoTen">
            Họ tên *
          </label>
          <Input
            id="hoTen"
            name="hoTen"
            onChange={handleFieldChange}
            placeholder="Nguyễn Văn A"
            value={values.hoTen}
          />
          {errors.hoTen ? <p className="text-sm text-rose-600">{errors.hoTen}</p> : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="thongTinLienHe">
            Thông tin liên hệ *
          </label>
          <Input
            id="thongTinLienHe"
            name="thongTinLienHe"
            onChange={handleFieldChange}
            placeholder="Số điện thoại hoặc Zalo"
            value={values.thongTinLienHe}
          />
          {errors.thongTinLienHe ? (
            <p className="text-sm text-rose-600">{errors.thongTinLienHe}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <Input
            id="email"
            name="email"
            onChange={handleFieldChange}
            placeholder="email@example.com"
            type="email"
            value={values.email}
          />
          {errors.email ? <p className="text-sm text-rose-600">{errors.email}</p> : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="cccd">
            CCCD
          </label>
          <Input
            id="cccd"
            name="cccd"
            onChange={handleFieldChange}
            placeholder="012345678901"
            value={values.cccd}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="quocTich">
            Quốc tịch
          </label>
          <Input
            id="quocTich"
            name="quocTich"
            onChange={handleFieldChange}
            placeholder="Việt Nam"
            value={values.quocTich}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="loaiPhongId">
            Loại phòng *
          </label>
          <Select
            id="loaiPhongId"
            name="loaiPhongId"
            onChange={handleFieldChange}
            value={values.loaiPhongId}
          >
            <option value="">Chọn loại phòng</option>
            {roomTypes.map((item) => (
              <option key={item.LoaiPhong_ID} value={item.LoaiPhong_ID}>
                {item.TenLoaiPhong}
              </option>
            ))}
          </Select>
          {errors.loaiPhongId ? (
            <p className="text-sm text-rose-600">{errors.loaiPhongId}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="ngayNhanPhong">
            Ngày nhận phòng *
          </label>
          <Input
            id="ngayNhanPhong"
            min={minDateTimeLocal}
            name="ngayNhanPhong"
            onChange={handleFieldChange}
            type="datetime-local"
            value={values.ngayNhanPhong}
          />
          {errors.ngayNhanPhong ? (
            <p className="text-sm text-rose-600">{errors.ngayNhanPhong}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="ngayTraPhong">
            Ngày trả phòng *
          </label>
          <Input
            id="ngayTraPhong"
            min={values.ngayNhanPhong || minDateTimeLocal}
            name="ngayTraPhong"
            onChange={handleFieldChange}
            type="datetime-local"
            value={values.ngayTraPhong}
          />
          {errors.ngayTraPhong ? (
            <p className="text-sm text-rose-600">{errors.ngayTraPhong}</p>
          ) : null}
        </div>

        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="soNguoi">
            Số người *
          </label>
          <Input
            id="soNguoi"
            min={1}
            name="soNguoi"
            onChange={handleFieldChange}
            type="number"
            value={values.soNguoi}
          />
          {errors.soNguoi ? <p className="text-sm text-rose-600">{errors.soNguoi}</p> : null}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="ghiChu">
            Ghi chú
          </label>
          <textarea
            className="min-h-28 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            id="ghiChu"
            name="ghiChu"
            onChange={handleFieldChange}
            placeholder="Ví dụ: cần phòng yên tĩnh, nhận phòng muộn..."
            value={values.ghiChu}
          />
        </div>
      </div>

      {feedback ? <Alert tone={feedback.tone}>{feedback.message}</Alert> : null}

      {currentAvailabilityEstimate ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p className="font-medium text-slate-900">Tóm tắt chi phí dự kiến</p>
          {typeof currentAvailabilityEstimate.soDemLuuTru === "number" ? (
            <p className="mt-1">
              Số đêm lưu trú:{" "}
              <span className="font-semibold text-slate-900">
                {currentAvailabilityEstimate.soDemLuuTru}
              </span>
            </p>
          ) : null}
          {typeof currentAvailabilityEstimate.tongTienPhongDuKien === "number" ? (
            <p className="mt-1">
              Tổng tiền phòng dự kiến:{" "}
              <span className="font-semibold text-slate-900">
                {formatCurrencyVND(currentAvailabilityEstimate.tongTienPhongDuKien)}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      {confirmedEstimate ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="font-medium text-emerald-900">Thông tin xác nhận đặt phòng</p>
          {typeof confirmedEstimate.soDemLuuTru === "number" ? (
            <p className="mt-1">
              Số đêm lưu trú:{" "}
              <span className="font-semibold text-emerald-900">
                {confirmedEstimate.soDemLuuTru}
              </span>
            </p>
          ) : null}
          {typeof confirmedEstimate.tongTienPhongDuKien === "number" ? (
            <p className="mt-1">
              Tổng tiền phòng dự kiến:{" "}
              <span className="font-semibold text-emerald-900">
                {formatCurrencyVND(confirmedEstimate.tongTienPhongDuKien)}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button
          disabled={checking || submitting}
          onClick={() => {
            void handleCheckAvailability();
          }}
          type="button"
          variant="secondary"
        >
          {checking ? "Đang kiểm tra..." : "Kiểm tra phòng"}
        </Button>
        <Button disabled={!canSubmitBooking} type="submit">
          {submitting ? "Đang gửi yêu cầu..." : "Gửi yêu cầu đặt phòng"}
        </Button>
      </div>

      {!canSubmitBooking ? (
        <p className="text-sm text-slate-500">
          Nút gửi yêu cầu chỉ khả dụng sau khi kiểm tra phòng thành công và còn phòng.
        </p>
      ) : null}
    </form>
  );
}
