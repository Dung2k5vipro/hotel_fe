"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkAvailability } from "@/services/public/booking.service";
import type { CheckAvailabilityResponse } from "@/types/public/public-booking";

type RoomAvailabilityCheckProps = {
  loaiPhongId: number;
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

function getDefaultDateTimes() {
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

function parsePositiveInteger(value: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return Math.floor(parsed);
}

function toBackendDateTime(value: string) {
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

function normalizeErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.trim();
  return message.length > 0 ? message : fallback;
}

export function RoomAvailabilityCheck({ loaiPhongId }: RoomAvailabilityCheckProps) {
  const router = useRouter();
  const defaults = getDefaultDateTimes();

  const [ngayNhanPhong, setNgayNhanPhong] = useState(defaults.ngayNhanPhong);
  const [ngayTraPhong, setNgayTraPhong] = useState(defaults.ngayTraPhong);
  const [soNguoi, setSoNguoi] = useState("1");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckAvailabilityResponse | null>(null);

  function resetCheckedState() {
    setError(null);
    setResult(null);
  }

  async function handleCheckAvailability() {
    const normalizedSoNguoi = parsePositiveInteger(soNguoi);

    if (!ngayNhanPhong || !ngayTraPhong) {
      setError("Vui lòng chọn ngày giờ nhận phòng và ngày giờ trả phòng.");
      setResult(null);
      return;
    }

    if (!normalizedSoNguoi) {
      setError("Số người phải lớn hơn hoặc bằng 1.");
      setResult(null);
      return;
    }

    if (new Date(ngayTraPhong).getTime() <= new Date(ngayNhanPhong).getTime()) {
      setError("Ngày giờ trả phòng phải sau ngày giờ nhận phòng.");
      setResult(null);
      return;
    }

    const payload = {
      loaiPhongId,
      ngayNhanPhong: toBackendDateTime(ngayNhanPhong),
      ngayTraPhong: toBackendDateTime(ngayTraPhong),
      soNguoi: normalizedSoNguoi,
    };

    setChecking(true);
    setError(null);

    try {
      const response = await checkAvailability(payload);
      setResult(response);
    } catch (checkError) {
      setResult(null);
      setError(
        normalizeErrorMessage(checkError, "Không thể kiểm tra phòng vào lúc này."),
      );
    } finally {
      setChecking(false);
    }
  }

  function handleContinueBooking() {
    const query = new URLSearchParams({
      loaiPhongId: String(loaiPhongId),
      ngayNhanPhong: toBackendDateTime(ngayNhanPhong),
      ngayTraPhong: toBackendDateTime(ngayTraPhong),
      soNguoi: soNguoi.trim() || "1",
    }).toString();

    router.push(`/dat-phong?${query}`);
  }

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Kiểm tra phòng theo thời gian</h3>
        <p className="mt-1 text-sm text-slate-600">
          Chọn ngày giờ và số người để kiểm tra số phòng còn phù hợp.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="ngayNhanPhong">
            Ngày giờ nhận phòng
          </label>
          <Input
            id="ngayNhanPhong"
            min={formatDateTimeLocalValue(new Date())}
            onChange={(event) => {
              setNgayNhanPhong(event.target.value);
              resetCheckedState();
            }}
            type="datetime-local"
            value={ngayNhanPhong}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="ngayTraPhong">
            Ngày giờ trả phòng
          </label>
          <Input
            id="ngayTraPhong"
            min={ngayNhanPhong || formatDateTimeLocalValue(new Date())}
            onChange={(event) => {
              setNgayTraPhong(event.target.value);
              resetCheckedState();
            }}
            type="datetime-local"
            value={ngayTraPhong}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="soNguoi">
            Số người
          </label>
          <Input
            id="soNguoi"
            min={1}
            onChange={(event) => {
              setSoNguoi(event.target.value);
              resetCheckedState();
            }}
            type="number"
            value={soNguoi}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={checking}
          onClick={() => {
            void handleCheckAvailability();
          }}
          type="button"
          variant="secondary"
        >
          {checking ? "Đang kiểm tra..." : "Kiểm tra phòng"}
        </Button>

        {result?.available ? (
          <Button onClick={handleContinueBooking} type="button">
            Tiếp tục đặt phòng
          </Button>
        ) : null}
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {result ? (
        <Alert tone={result.available ? "success" : "info"}>
          <p>
            Trạng thái: {result.available ? "Còn phòng" : "Hết phòng"}
          </p>
          <p className="mt-1">{result.message}</p>
          {typeof result.availableCount === "number" ? (
            <p className="mt-1">Số phòng phù hợp còn lại: {result.availableCount}</p>
          ) : null}
        </Alert>
      ) : null}
    </section>
  );
}
