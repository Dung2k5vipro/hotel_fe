"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { createPhong, updatePhong } from "@/services/phong";
import type { LoaiPhong } from "@/types/loai-phong";
import {
  isTrangThaiPhong,
  TRANG_THAI_PHONG_OPTIONS,
  type Phong,
  type TrangThaiPhong,
} from "@/types/phong";

type FormMode = "create" | "edit";

type PhongFormProps = {
  initialData?: Phong | null;
  loaiPhongOptions: LoaiPhong[];
  mode: FormMode;
  onClose: () => void;
  onSuccess: (result: {
    item: Phong | null;
    mode: FormMode;
  }) => Promise<void> | void;
  open: boolean;
};

export function PhongForm({
  initialData,
  loaiPhongOptions,
  mode,
  onClose,
  onSuccess,
  open,
}: PhongFormProps) {
  const [soPhong, setSoPhong] = useState("");
  const [loaiPhongId, setLoaiPhongId] = useState("");
  const [trangThai, setTrangThai] = useState<TrangThaiPhong>("Trong");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setError(null);
      setSubmitting(false);
      return;
    }

    setSoPhong(initialData?.soPhong ?? "");
    setLoaiPhongId(initialData ? String(initialData.loaiPhongId) : "");
    setTrangThai(initialData?.trangThai ?? "Trong");
    setError(null);
  }, [
    initialData,
    initialData?.loaiPhongId,
    initialData?.soPhong,
    initialData?.trangThai,
    open,
  ]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const normalizedSoPhong = soPhong.trim();
    const normalizedLoaiPhongId = Number(loaiPhongId);

    if (!normalizedSoPhong) {
      setError("Số phòng không được để trống.");
      return;
    }

    if (!Number.isFinite(normalizedLoaiPhongId) || normalizedLoaiPhongId <= 0) {
      setError("Vui lòng chọn loại phòng hợp lệ.");
      return;
    }

    if (!loaiPhongOptions.some((item) => item.loaiPhongId === normalizedLoaiPhongId)) {
      setError("Loại phòng đã chọn không tồn tại trong danh mục hiện tại.");
      return;
    }

    if (!isTrangThaiPhong(trangThai)) {
      setError("Trạng thái phòng không hợp lệ.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        soPhong: normalizedSoPhong,
        loaiPhongId: normalizedLoaiPhongId,
        trangThai,
      };

      if (mode === "edit") {
        if (!initialData) {
          throw new Error("Không tìm thấy dữ liệu phòng để cập nhật.");
        }

        const updatedItem = await updatePhong(initialData.soPhong, payload);

        await onSuccess({
          item: updatedItem,
          mode,
        });
      } else {
        const createdItem = await createPhong(payload);

        await onSuccess({
          item: createdItem,
          mode,
        });
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Không thể lưu phòng.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      description={
        mode === "create"
          ? "Thêm phòng vật lý mới vào danh mục vận hành khách sạn."
          : "Cập nhật thông tin và trạng thái phòng."
      }
      isOpen={open}
      onClose={submitting ? () => undefined : onClose}
      title={mode === "create" ? "Thêm phòng" : "Cập nhật phòng"}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="soPhong">
            Số phòng
          </label>
          <Input
            disabled={mode === "edit"}
            id="soPhong"
            onChange={(event) => setSoPhong(event.target.value)}
            placeholder="Ví dụ: 101, 305A"
            value={soPhong}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="loaiPhong">
            Loại phòng
          </label>
          <Select
            id="loaiPhong"
            onChange={(event) => setLoaiPhongId(event.target.value)}
            value={loaiPhongId}
          >
            <option value="">Chọn loại phòng</option>
            {loaiPhongOptions.map((item) => (
              <option key={item.loaiPhongId} value={item.loaiPhongId}>
                {item.tenLoaiPhong}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="trangThai">
            Trạng thái
          </label>
          <Select
            id="trangThai"
            onChange={(event) => setTrangThai(event.target.value as TrangThaiPhong)}
            value={trangThai}
          >
            {TRANG_THAI_PHONG_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </div>

        {trangThai === "BaoTri" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Phòng đang ở trạng thái bảo trì sẽ không nên gán cho đặt phòng.
          </div>
        ) : null}

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
                ? "Tạo phòng"
                : "Lưu thay đổi"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
