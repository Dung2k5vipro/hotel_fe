"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrencyVND } from "@/lib/hotel";
import type { DichVu, SuDungDichVuPayload } from "@/types/dich-vu";

type SuDungDichVuFormProps = {
  datPhongId: number | null;
  dichVuOptions: DichVu[];
  disabledReason?: string | null;
  onSubmit: (payload: SuDungDichVuPayload) => Promise<void>;
};

function validateSuDungDichVuForm(values: {
  datPhongId: number | null;
  dichVuId: number;
  soLuong: number;
}) {
  if (!values.datPhongId || values.datPhongId <= 0) {
    return "DatPhong_ID là bắt buộc.";
  }

  if (!Number.isFinite(values.dichVuId) || values.dichVuId <= 0) {
    return "DichVu_ID là bắt buộc.";
  }

  if (!Number.isFinite(values.soLuong) || values.soLuong <= 0) {
    return "Số lượng là bắt buộc và phải lớn hơn 0.";
  }

  return null;
}

export function SuDungDichVuForm({
  datPhongId,
  dichVuOptions,
  disabledReason,
  onSubmit,
}: SuDungDichVuFormProps) {
  const [dichVuId, setDichVuId] = useState("");
  const [soLuong, setSoLuong] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDichVu = useMemo(
    () =>
      dichVuOptions.find((item) => item.id === Number(dichVuId)) ?? null,
    [dichVuId, dichVuOptions],
  );
  const giaTaiThoiDiem = selectedDichVu?.giaHienTai ?? null;
  const thanhTienTamTinh =
    giaTaiThoiDiem !== null && Number(soLuong) > 0
      ? giaTaiThoiDiem * Number(soLuong)
      : null;
  const canSubmit =
    datPhongId !== null &&
    !disabledReason &&
    dichVuOptions.length > 0 &&
    !submitting;

  useEffect(() => {
    setDichVuId("");
    setSoLuong("1");
    setSubmitting(false);
    setError(null);
  }, [datPhongId]);

  useEffect(() => {
    if (!dichVuId) {
      return;
    }

    const hasSelectedService = dichVuOptions.some(
      (item) => item.id === Number(dichVuId),
    );

    if (!hasSelectedService) {
      setDichVuId("");
    }
  }, [dichVuId, dichVuOptions]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    const payload = {
      datPhongId,
      dichVuId: Number(dichVuId),
      soLuong: Number(soLuong),
    };
    const validationError = validateSuDungDichVuForm(payload);

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(payload);
      setDichVuId("");
      setSoLuong("1");
      setError(null);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Không thể ghi nhận sử dụng dịch vụ.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Ghi nhận sử dụng dịch vụ
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Chọn đúng DatPhong_ID và dịch vụ để ghi nhận chi phí phát sinh.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <span className="font-medium">DatPhong_ID:</span>{" "}
          {datPhongId ?? "Chưa chọn"}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="dichVuId">
            Dịch vụ
          </label>
          <Select
            disabled={dichVuOptions.length === 0 || Boolean(disabledReason)}
            id="dichVuId"
            onChange={(event) => setDichVuId(event.target.value)}
            value={dichVuId}
          >
            <option value="">Chọn dịch vụ</option>
            {dichVuOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.tenDichVu} - {formatCurrencyVND(item.giaHienTai)}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="soLuong">
            Số lượng
          </label>
          <Input
            disabled={Boolean(disabledReason)}
            id="soLuong"
            min={1}
            onChange={(event) => setSoLuong(event.target.value)}
            step="1"
            type="number"
            value={soLuong}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Giá tại thời điểm
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {giaTaiThoiDiem !== null
              ? formatCurrencyVND(giaTaiThoiDiem)
              : "Chọn dịch vụ để xem giá"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Thành tiền tạm tính
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {thanhTienTamTinh !== null
              ? formatCurrencyVND(thanhTienTamTinh)
              : "Chưa đủ dữ liệu"}
          </p>
        </div>
      </div>

      {disabledReason ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {disabledReason}
        </div>
      ) : null}

      {!disabledReason && dichVuOptions.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Chưa có dịch vụ nào trong danh mục để ghi nhận sử dụng.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button disabled={!canSubmit} type="submit">
          {submitting ? "Đang ghi nhận..." : "Thêm sử dụng dịch vụ"}
        </Button>
      </div>
    </form>
  );
}
