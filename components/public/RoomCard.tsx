import Link from "next/link";

import { formatCurrencyVND } from "@/lib/hotel";
import type { PublicRoomType } from "@/types/public/public-room";

type RoomCardProps = {
  roomType: PublicRoomType;
};

export function RoomCard({ roomType }: RoomCardProps) {
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="relative h-44 w-full overflow-hidden bg-slate-200">
        {roomType.HinhAnh ? (
          <div
            aria-label={roomType.TenLoaiPhong}
            className="h-full w-full bg-cover bg-center"
            role="img"
            style={{
              backgroundImage: `url("${roomType.HinhAnh}")`,
            }}
          />
        ) : (
          <div className="grid h-full place-items-center bg-[linear-gradient(135deg,#e2e8f0_0%,#cbd5e1_100%)] px-4 text-center text-sm text-slate-600">
            Chưa có hình ảnh
          </div>
        )}
      </div>

      <div className="space-y-4 p-5">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{roomType.TenLoaiPhong}</h3>
          <p className="mt-2 text-sm text-slate-600">
            Giá cơ bản:{" "}
            <span className="font-medium text-slate-900">
              {formatCurrencyVND(roomType.GiaCoBan)}
            </span>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Số người tối đa:{" "}
            <span className="font-medium text-slate-900">{roomType.SoNguoiToiDa}</span>
          </p>
        </div>

        <p className="line-clamp-3 text-sm leading-6 text-slate-600">
          {roomType.MoTa || "Hiện chưa có mô tả cho loại phòng này."}
        </p>

        <Link
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          href={`/phong/${roomType.LoaiPhong_ID}`}
        >
          Xem chi tiết
        </Link>
      </div>
    </article>
  );
}
