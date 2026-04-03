import Link from "next/link";

type PublicHeroProps = {
  roomTypeCount: number;
  serviceCount: number;
  loadingHighlights?: boolean;
};

export function PublicHero({
  roomTypeCount,
  serviceCount,
  loadingHighlights = false,
}: PublicHeroProps) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#e2e8f0_100%)] p-6 shadow-sm sm:p-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
            Giới thiệu nhanh
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Không gian lưu trú thuận tiện cho mọi hành trình
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Xem danh sách loại phòng, dịch vụ hiện có và gửi yêu cầu đặt phòng nhanh.
            Bộ phận lễ tân sẽ liên hệ để xác nhận trong thời gian sớm nhất.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              href="/dat-phong"
            >
              Gửi yêu cầu đặt phòng
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              href="/phong"
            >
              Xem loại phòng
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
              Loại phòng
            </p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">
              {loadingHighlights ? "..." : roomTypeCount}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Dịch vụ</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">
              {loadingHighlights ? "..." : serviceCount}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
