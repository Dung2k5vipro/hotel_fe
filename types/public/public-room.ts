export interface PublicRoomType {
  LoaiPhong_ID: number;
  TenLoaiPhong: string;
  GiaCoBan: number;
  SoNguoiToiDa: number;
  MoTa: string;
  HinhAnh: string | null;
  galleryImages?: string[];
}

export interface PublicRoomDetail extends PublicRoomType {
  galleryImages: string[];
}
