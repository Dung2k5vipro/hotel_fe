"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  createLoaiPhong,
  getLoaiPhongById,
  updateLoaiPhong,
} from "@/services/loai-phong";
import type { LoaiPhong, LoaiPhongPayload } from "@/types/loai-phong";

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

function toGalleryInputValues(values?: string[]) {
  if (!values || values.length === 0) {
    return [""];
  }

  return values;
}

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
  const [moTa, setMoTa] = useState("");
  const [hinhAnh, setHinhAnh] = useState("");
  const [galleryImages, setGalleryImages] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!open) {
      setError(null);
      setSubmitting(false);
      setLoadingDetail(false);
      return;
    }

    setTenLoaiPhong(initialData?.tenLoaiPhong ?? "");
    setGiaCoBan(initialData ? String(initialData.giaCoBan) : "");
    setSoNguoiToiDa(initialData ? String(initialData.soNguoiToiDa) : "1");
    setMoTa(initialData?.moTa ?? "");
    setHinhAnh(initialData?.hinhAnh ?? "");
    setGalleryImages(toGalleryInputValues(initialData?.galleryImages));
    setError(null);
  }, [initialData, open]);

  useEffect(() => {
    if (!open || mode !== "edit" || !initialData?.loaiPhongId) {
      return;
    }

    const needsDetailData =
      initialData.moTa === undefined ||
      initialData.hinhAnh === undefined ||
      initialData.galleryImages === undefined;

    if (!needsDetailData) {
      return;
    }

    let active = true;

    setLoadingDetail(true);

    void getLoaiPhongById(initialData.loaiPhongId)
      .then((detail) => {
        if (!active) {
          return;
        }

        setMoTa(detail.moTa ?? "");
        setHinhAnh(detail.hinhAnh ?? "");
        setGalleryImages(toGalleryInputValues(detail.galleryImages));
      })
      .catch(() => {
        if (!active) {
          return;
        }
      })
      .finally(() => {
        if (active) {
          setLoadingDetail(false);
        }
      });

    return () => {
      active = false;
    };
  }, [initialData, mode, open]);

  function handleGalleryImageChange(index: number, value: string) {
    setGalleryImages((currentList) =>
      currentList.map((item, itemIndex) => (itemIndex === index ? value : item)),
    );
  }

  function handleAddGalleryRow() {
    setGalleryImages((currentList) => [...currentList, ""]);
  }

  function handleRemoveGalleryRow(index: number) {
    setGalleryImages((currentList) => {
      const nextList = currentList.filter((_, itemIndex) => itemIndex !== index);

      if (nextList.length === 0) {
        return [""];
      }

      return nextList;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const normalizedTenLoaiPhong = tenLoaiPhong.trim();
    const normalizedGiaCoBan = Number(giaCoBan);
    const normalizedSoNguoiToiDa = Number(soNguoiToiDa);
    const normalizedMoTa = moTa.trim();
    const normalizedHinhAnh = hinhAnh.trim();
    const normalizedGalleryImages = galleryImages
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (!normalizedTenLoaiPhong) {
      setError("Tên loại phòng không được để trống.");
      return;
    }

    if (!Number.isFinite(normalizedGiaCoBan) || normalizedGiaCoBan <= 0) {
      setError("Giá cơ bản phải lớn hơn 0.");
      return;
    }

    if (!Number.isFinite(normalizedSoNguoiToiDa) || normalizedSoNguoiToiDa < 1) {
      setError("Số người tối đa phải lớn hơn hoặc bằng 1.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const payload: LoaiPhongPayload = {
        tenLoaiPhong: normalizedTenLoaiPhong,
        giaCoBan: normalizedGiaCoBan,
        soNguoiToiDa: normalizedSoNguoiToiDa,
        moTa: normalizedMoTa,
        hinhAnh: normalizedHinhAnh,
        galleryImages: normalizedGalleryImages,
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

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="moTaLoaiPhong">
            Mô tả
          </label>
          <textarea
            className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            id="moTaLoaiPhong"
            onChange={(event) => setMoTa(event.target.value)}
            placeholder="Nhập mô tả loại phòng"
            value={moTa}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="hinhAnhLoaiPhong">
            Ảnh đại diện (URL)
          </label>
          <Input
            id="hinhAnhLoaiPhong"
            onChange={(event) => setHinhAnh(event.target.value)}
            placeholder="https://example.com/room-type.jpg"
            value={hinhAnh}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Ảnh gallery</label>
            <Button
              disabled={submitting || loadingDetail}
              onClick={handleAddGalleryRow}
              type="button"
              variant="secondary"
            >
              Thêm ảnh
            </Button>
          </div>

          <div className="space-y-2">
            {galleryImages.map((imageUrl, index) => (
              <div key={`gallery-${index}`} className="flex flex-col gap-2 sm:flex-row">
                <Input
                  onChange={(event) => handleGalleryImageChange(index, event.target.value)}
                  placeholder={`URL ảnh gallery ${index + 1}`}
                  value={imageUrl}
                />
                <Button
                  className="sm:min-w-24"
                  disabled={submitting || loadingDetail}
                  onClick={() => handleRemoveGalleryRow(index)}
                  type="button"
                  variant="ghost"
                >
                  Xóa
                </Button>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500">
            Có thể để trống nếu chưa có ảnh gallery.
          </p>
        </div>

        {loadingDetail ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Đang tải dữ liệu mô tả và ảnh của loại phòng...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            disabled={submitting || loadingDetail}
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            Hủy
          </Button>
          <Button disabled={submitting || loadingDetail} type="submit">
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
