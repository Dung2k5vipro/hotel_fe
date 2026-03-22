export type HoaDon = {
  id: number;
  datPhongId: number;
  tongTienPhong: number;
  tongTienDichVu: number;
  tongThanhToan: number;
  daThanhToan: boolean;
  ngayThanhToan?: string | null;
  hoTenKhachHang?: string | null;
  soPhong?: string | null;
  trangThaiDatPhong?: string | null;
};

export type HoaDonPaymentPayload = {
  hoaDonId: number;
};

export type HoaDonSummaryStatus = "idle" | "loading" | "ready" | "error";

export type HoaDonSummaryState = {
  status: HoaDonSummaryStatus;
  item: HoaDon | null;
  error: string | null;
  lastDatPhongId: number | null;
};
