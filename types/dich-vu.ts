export interface DichVu {
  id: number;
  tenDichVu: string;
  giaHienTai: number;
}

export interface DichVuPayload {
  tenDichVu: string;
  giaHienTai: number;
}

export interface SuDungDichVu {
  id: number;
  datPhongId: number;
  dichVuId: number;
  soLuong: number;
  giaTaiThoiDiem: number;
  ngaySuDung: string;
  tenDichVu?: string;
  dichVu?: DichVu | null;
}

export interface SuDungDichVuPayload {
  datPhongId: number;
  dichVuId: number;
  soLuong: number;
}
