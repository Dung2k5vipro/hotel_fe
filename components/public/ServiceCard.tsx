import { formatCurrencyVND } from "@/lib/hotel";
import type { PublicServiceItem } from "@/types/public/public-service";

type ServiceCardProps = {
  service: PublicServiceItem;
};

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{service.TenDichVu}</h3>
      <p className="mt-2 text-sm text-slate-600">Giá hiện tại</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">
        {formatCurrencyVND(service.GiaHienTai)}
      </p>
    </article>
  );
}
