import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { formatDateTimeVN } from "@/lib/hotel";
import { repairVietnameseText } from "@/lib/text";
import {
  getTrangThaiDatPhongLabel,
  getTrangThaiDatPhongTone,
  type DatPhong,
} from "@/types/dat-phong";

type DatPhongDetailProps = {
  open: boolean;
  item: DatPhong | null;
  onClose: () => void;
};

function renderValue(value?: string | null) {
  if (!value || value.trim().length === 0) {
    return "Chưa cập nhật";
  }

  return repairVietnameseText(value);
}

export function DatPhongDetail({ open, item, onClose }: DatPhongDetailProps) {
  if (!item) {
    return null;
  }

  return (
    <Modal
      description="Thông tin chi tiết của đơn đặt phòng đang chọn."
      isOpen={open}
      onClose={onClose}
      title={`Chi tiết đặt phòng #${item.datPhongId}`}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">ID đặt phòng</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {item.datPhongId}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Trạng thái</p>
          <div className="mt-2">
            <Badge tone={getTrangThaiDatPhongTone(item.trangThai)}>
              {getTrangThaiDatPhongLabel(item.trangThai)}
            </Badge>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Khách hàng</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {renderValue(item.tenKhachHang ?? item.khachHang?.hoTen)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">CCCD</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {renderValue(item.khachHang?.cccd)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Thông tin liên hệ</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {renderValue(item.khachHang?.thongTinLienHe)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Số phòng</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {renderValue(item.soPhong)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Số người</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{item.soNguoi}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Loại phòng</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {renderValue(item.tenLoaiPhong ?? item.phong?.tenLoaiPhong)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Ngày nhận phòng</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {formatDateTimeVN(item.ngayNhanPhong)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Ngày trả phòng</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {formatDateTimeVN(item.ngayTraPhong)}
          </p>
        </div>
      </div>
    </Modal>
  );
}
