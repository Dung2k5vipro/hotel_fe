import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrencyVND } from "@/lib/hotel";
import type { Phong } from "@/types/phong";

type PhongDetailProps = {
  item: Phong | null;
  onClose: () => void;
  open: boolean;
};

export function PhongDetail({ item, onClose, open }: PhongDetailProps) {
  if (!item) {
    return null;
  }

  return (
    <Modal
      description="Thông tin chi tiết của phòng và loại phòng đang liên kết."
      isOpen={open}
      onClose={onClose}
      title={`Chi tiết phòng ${item.soPhong}`}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Số phòng</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {item.soPhong}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Loại phòng</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {item.tenLoaiPhong ?? item.loaiPhong?.tenLoaiPhong ?? "Chưa xác định"}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Mã loại phòng</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {item.loaiPhongId}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Giá cơ bản</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {item.loaiPhong ? formatCurrencyVND(item.loaiPhong.giaCoBan) : "N/A"}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Số người tối đa</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {item.loaiPhong?.soNguoiToiDa ?? "N/A"}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Trạng thái hiện tại</p>
          <div className="mt-2">
            <StatusBadge status={item.trangThai} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
