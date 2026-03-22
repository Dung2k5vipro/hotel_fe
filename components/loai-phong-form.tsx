"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createLoaiPhong, updateLoaiPhong } from "@/services/loai-phong";
import type { LoaiPhong } from "@/types/loai-phong";

type FormMode = "create" | "edit";

type LoaiPhongFormProps = {
  initialData?: LoaiPhong | null;
  mode: FormMode;
  onClose: () => void;
  onSuccess: (result: {
    item: LoaiPhong | null;
    mode: FormMode;
  }) => Promise<void> | void;
  open: boolean;
};

export function LoaiPhongForm({
  initialData,
  mode,
  onClose,
  onSuccess,
  open,
}: LoaiPhongFormProps) {
  const [tenLoaiPhong, setTenLoaiPhong] = useState("");
  const [giaCoBan, setGiaCoBan] = useState("");
  const [soNguoiToiDa, setSoNguoiToiDa] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setError(null);
      setSubmitting(false);
      return;
    }

    setTenLoaiPhong(initialData?.tenLoaiPhong ?? "");
    setGiaCoBan(initialData ? String(initialData.giaCoBan) : "");
    setSoNguoiToiDa(initialData ? String(initialData.soNguoiToiDa) : "1");
    setError(null);
  }, [
    initialData,
    initialData?.giaCoBan,
    initialData?.loaiPhongId,
    initialData?.soNguoiToiDa,
    initialData?.tenLoaiPhong,
    open,
  ]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const normalizedTenLoaiPhong = tenLoaiPhong.trim();
    const normalizedGiaCoBan = Number(giaCoBan);
    const normalizedSoNguoiToiDa = Number(soNguoiToiDa);

    if (!normalizedTenLoaiPhong) {
      setError("Tên loại phòng không được để trống.");
      return;
    }

    if (!Number.isFinite(normalizedGiaCoBan) || normalizedGiaCoBan <= 0) {
      setError("Giá cơ bản phải lớn hơn 0.");
      return;
    }

    if (
      !Number.isFinite(normalizedSoNguoiToiDa) ||
      normalizedSoNguoiToiDa < 1
    ) {
      setError("Số người tối đa phải lớn hơn hoặc bằng 1.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        tenLoaiPhong: normalizedTenLoaiPhong,
        giaCoBan: normalizedGiaCoBan,
        soNguoiToiDa: normalizedSoNguoiToiDa,
      };

      if (mode === "edit") {
        if (!initialData) {
          throw new Error("Không tìm thấy dữ liệu loại phòng để cập nhật.");
        }

        const updatedItem = await updateLoaiPhong(initialData.loaiPhongId, payload);

        await onSuccess({
          item: updatedItem,
          mode,
        });
      } else {
        const createdItem = await createLoaiPhong(payload);

        await onSuccess({
          item: createdItem,
          mode,
        });
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Không thể lưu loại phòng.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      description={
        mode === "create"
          ? "Tạo loại phòng mới cho danh mục vận hành khách sạn."
          : "Cập nhật thông tin loại phòng hiện có."
      }
      isOpen={open}
      onClose={submitting ? () => undefined : onClose}
      title={mode === "create" ? "Thêm loại phòng" : "Cập nhật loại phòng"}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="tenLoaiPhong">
            Tên loại phòng
          </label>
          <Input
            id="tenLoaiPhong"
            onChange={(event) => setTenLoaiPhong(event.target.value)}
            placeholder="Ví dụ: Standard, Suite, VIP"
            value={tenLoaiPhong}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="giaCoBan">
              Giá cơ bản
            </label>
            <Input
              id="giaCoBan"
              min="0"
              onChange={(event) => setGiaCoBan(event.target.value)}
              placeholder="Nhập giá cơ bản"
              step="1000"
              type="number"
              value={giaCoBan}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="soNguoiToiDa">
              Số người tối đa
            </label>
            <Input
              id="soNguoiToiDa"
              min="1"
              onChange={(event) => setSoNguoiToiDa(event.target.value)}
              type="number"
              value={soNguoiToiDa}
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-3 pt-2">
          <Button disabled={submitting} onClick={onClose} type="button" variant="secondary">
            Hủy
          </Button>
          <Button disabled={submitting} type="submit">
            {submitting
              ? "Đang lưu..."
              : mode === "create"
                ? "Tạo mới"
                : "Lưu thay đổi"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
