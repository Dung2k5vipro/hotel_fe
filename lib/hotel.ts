import { repairVietnameseText } from "@/lib/text";
import { isAdmin, isNhanVien } from "@/services/auth";
import type { TaiKhoan } from "@/types/tai-khoan";
import type { Phong, TrangThaiPhong } from "@/types/phong";

export function formatCurrencyVND(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getTrangThaiPhongLabel(value: TrangThaiPhong) {
  const labelMap: Record<TrangThaiPhong, string> = {
    Trong: "Trống",
    DangO: "Đang ở",
    CanDon: "Cần dọn",
    BaoTri: "Bảo trì",
  };

  return labelMap[value];
}

export function getTrangThaiPhongVariant(value: TrangThaiPhong) {
  const variantMap: Record<
    TrangThaiPhong,
    "success" | "warning" | "default" | "danger"
  > = {
    Trong: "success",
    DangO: "default",
    CanDon: "warning",
    BaoTri: "danger",
  };

  return variantMap[value];
}

export function canManageRoomTypes(user: TaiKhoan | null) {
  return isAdmin(user);
}

export function canManageRooms(user: TaiKhoan | null) {
  return isAdmin(user);
}

export function canManageCustomers(user: TaiKhoan | null) {
  return isAdmin(user) || isNhanVien(user);
}

export function canDeleteCustomers(user: TaiKhoan | null) {
  return isAdmin(user);
}

export function canManageBookings(user: TaiKhoan | null) {
  return isAdmin(user) || isNhanVien(user);
}

export function canDeleteBookings(user: TaiKhoan | null) {
  return isAdmin(user);
}

export function getPhongGiaThamKhao(phong?: Phong | null) {
  const giaThamKhao = phong?.giaCoBan ?? phong?.loaiPhong?.giaCoBan;

  if (typeof giaThamKhao === "number" && Number.isFinite(giaThamKhao)) {
    return giaThamKhao;
  }

  return null;
}

export function formatDateTimeVN(value?: string | null) {
  if (!value) {
    return "Chưa cập nhật";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return repairVietnameseText(value);
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsedDate);
}
