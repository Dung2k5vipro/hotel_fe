"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatCurrencyVND } from "@/lib/hotel";
import type { DichVu, DichVuPayload } from "@/types/dich-vu";

type FormMode = "create" | "edit";

type DichVuFormProps = {
  initialData?: DichVu | null;
  mode: FormMode;
  onClose: () => void;
  onSubmit: (params: {
    mode: FormMode;
    payload: DichVuPayload;
    dichVuId?: number;
  }) => Promise<DichVu | null>;
  onSuccess: (result: {
    item: DichVu | null;
    mode: FormMode;
  }) => Promise<void> | void;
  open: boolean;
};

function validateDichVuForm(values: {
  tenDichVu: string;
  giaHienTai: number;
}) {
  if (!values.tenDichVu) {
    return "Tên dịch vụ là bắt buộc.";
  }

  if (!Number.isFinite(values.giaHienTai) || values.giaHienTai < 0) {
    return "Giá hiện tại là bắt buộc và phải lớn hơn hoặc bằng 0.";
  }

  return null;
}

export function DichVuForm({
  initialData,
  mode,
  onClose,
  onSubmit,
  onSuccess,
  open,
}: DichVuFormProps) {
  const [tenDichVu, setTenDichVu] = useState("");
  const [giaHienTai, setGiaHienTai] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedGia = useMemo(() => {
    const parsedValue = Number(giaHienTai);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }, [giaHienTai]);

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setError(null);
      return;
    }

    setTenDichVu(initialData?.tenDichVu ?? "");
    setGiaHienTai(
      initialData?.giaHienTai !== undefined ? String(initialData.giaHienTai) : "",
    );
    setSubmitting(false);
    setError(null);
  }, [initialData, open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const payload = {
      tenDichVu: tenDichVu.trim(),
      giaHienTai: Number(giaHienTai),
    };
    const validationError = validateDichVuForm(payload);

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const item = await onSubmit({
        mode,
        payload,
        dichVuId: initialData?.id,
      });

      await onSuccess({
        item,
        mode,
      });

      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Không thể lưu dịch vụ.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      className="max-w-lg"
      description={
        mode === "create"
          ? "Tạo mới dịch vụ để sử dụng cho đặt phòng và hóa đơn."
          : "Cập nhật thông tin danh mục dịch vụ hiện có."
      }
      isOpen={open}
      onClose={submitting ? () => undefined : onClose}
      title={mode === "create" ? "Thêm dịch vụ" : "Cập nhật dịch vụ"}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="tenDichVu">
            Tên dịch vụ
          </label>
          <Input
            id="tenDichVu"
            onChange={(event) => setTenDichVu(event.target.value)}
            placeholder="Ví dụ: Giặt ủi, ăn sáng, minibar"
            value={tenDichVu}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="giaHienTai">
            Giá hiện tại
          </label>
          <Input
            id="giaHienTai"
            min={0}
            onChange={(event) => setGiaHienTai(event.target.value)}
            placeholder="Nhập giá dịch vụ"
            step="1000"
            type="number"
            value={giaHienTai}
          />
          <p className="text-xs text-slate-500">
            {normalizedGia !== null && normalizedGia >= 0
              ? `Giá sẽ hiển thị: ${formatCurrencyVND(normalizedGia)}`
              : "Giá phải là số lớn hơn hoặc bằng 0."}
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            disabled={submitting}
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            Hủy
          </Button>
          <Button disabled={submitting} type="submit">
            {submitting
              ? "Đang lưu..."
              : mode === "create"
                ? "Tạo dịch vụ"
                : "Lưu thay đổi"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
