import { Modal } from "@/components/ui/modal";
import { formatDateTimeVN } from "@/lib/hotel";
import type { KhachHang } from "@/types/khach-hang";

type KhachHangDetailProps = {
  item: KhachHang | null;
  onClose: () => void;
  open: boolean;
};

function renderValue(value: string) {
  return value || "Chưa cập nhật";
}

export function KhachHangDetail({
  item,
  onClose,
  open,
}: KhachHangDetailProps) {
  if (!item) {
    return null;
  }

  return (
    <Modal
      description="Thông tin chi tiết của hồ sơ khách hàng đang chọn."
      isOpen={open}
      onClose={onClose}
      title="Chi tiết khách hàng"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">ID khách hàng</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {item.khachHangId}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Họ tên</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {renderValue(item.hoTen)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">CCCD</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {renderValue(item.cccd)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Thông tin liên hệ</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {renderValue(item.thongTinLienHe)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Quốc tịch</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {renderValue(item.quocTich)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Ngày tạo</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {formatDateTimeVN(item.ngayTao)}
          </p>
        </div>
      </div>
    </Modal>
  );
}
