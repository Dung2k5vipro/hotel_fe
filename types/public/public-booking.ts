export interface CheckAvailabilityPayload {
  loaiPhongId: number;
  ngayNhanPhong: string;
  ngayTraPhong: string;
  soNguoi?: number;
}

export interface CheckAvailabilityResponse {
  success: boolean;
  available: boolean;
  message: string;
  availableCount?: number;
}

export interface BookingRequestPayload {
  hoTen: string;
  thongTinLienHe: string;
  email?: string;
  cccd?: string;
  quocTich?: string;
  loaiPhongId: number;
  ngayNhanPhong: string;
  ngayTraPhong: string;
  soNguoi: number;
  ghiChu?: string;
}

export interface BookingRequestResponse {
  success: boolean;
  message: string;
  data?: unknown;
}
