import { Modal } from "@/components/ui/modal";
import { formatCurrencyVND } from "@/lib/hotel";
import type { LoaiPhong } from "@/types/loai-phong";

type LoaiPhongDetailProps = {
  item: LoaiPhong | null;
  onClose: () => void;
  open: boolean;
};

export function LoaiPhongDetail({
  item,
  onClose,
  open,
}: LoaiPhongDetailProps) {
  if (!item) {
    return null;
  }

  return (
    <Modal
      description="Thông tin chi tiết của loại phòng đang chọn."
      isOpen={open}
      onClose={onClose}
      title="Chi tiết loại phòng"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">ID</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {item.loaiPhongId}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Tên loại phòng</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {item.tenLoaiPhong}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Giá cơ bản</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {formatCurrencyVND(item.giaCoBan)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Số người tối đa</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {item.soNguoiToiDa}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Mô tả</p>
          <p className="mt-2 text-sm text-slate-900">
            {item.moTa?.trim() ? item.moTa : "Chưa có mô tả."}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Ảnh đại diện</p>
          <p className="mt-2 break-all text-sm text-slate-900">
            {item.hinhAnh?.trim() ? item.hinhAnh : "Chưa có ảnh đại diện."}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Gallery</p>
          {item.galleryImages && item.galleryImages.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {item.galleryImages.map((imageUrl, index) => (
                <li
                  key={`${index}-${imageUrl}`}
                  className="break-all text-sm text-slate-900"
                >
                  {imageUrl}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-900">Chưa có ảnh gallery.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
