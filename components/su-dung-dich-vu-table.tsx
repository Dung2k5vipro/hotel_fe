"use client";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrencyVND, formatDateTimeVN } from "@/lib/hotel";
import type { DichVu, SuDungDichVu } from "@/types/dich-vu";

type SuDungDichVuTableProps = {
  canDelete: boolean;
  deletingId?: number | null;
  dichVuList: DichVu[];
  items: SuDungDichVu[];
  onDelete: (item: SuDungDichVu) => void;
};

function getDichVuName(item: SuDungDichVu, dichVuMap: Map<number, DichVu>) {
  return (
    item.tenDichVu ??
    item.dichVu?.tenDichVu ??
    dichVuMap.get(item.dichVuId)?.tenDichVu ??
    `Dịch vụ #${item.dichVuId}`
  );
}

export function SuDungDichVuTable({
  canDelete,
  deletingId = null,
  dichVuList,
  items,
  onDelete,
}: SuDungDichVuTableProps) {
  const dichVuMap = new Map(dichVuList.map((item) => [item.id, item]));

  if (items.length === 0) {
    return (
      <EmptyState
        description="Đơn đặt phòng này chưa có lịch sử sử dụng dịch vụ."
        title="Chưa phát sinh dịch vụ"
      />
    );
  }

  return (
    <DataTable
      head={
        <tr>
          <th className="px-4 py-3 text-left font-semibold text-slate-600">ID</th>
          <th className="px-4 py-3 text-left font-semibold text-slate-600">
            Ngày sử dụng
          </th>
          <th className="px-4 py-3 text-left font-semibold text-slate-600">
            Dịch vụ
          </th>
          <th className="px-4 py-3 text-left font-semibold text-slate-600">
            Số lượng
          </th>
          <th className="px-4 py-3 text-left font-semibold text-slate-600">
            Giá tại thời điểm
          </th>
          <th className="px-4 py-3 text-left font-semibold text-slate-600">
            Thành tiền
          </th>
          <th className="px-4 py-3 text-right font-semibold text-slate-600">
            Hành động
          </th>
        </tr>
      }
    >
      {items.map((item) => {
        const thanhTien = item.soLuong * item.giaTaiThoiDiem;

        return (
          <tr key={item.id} className="bg-white">
            <td className="px-4 py-4 text-slate-900">{item.id}</td>
            <td className="px-4 py-4 text-slate-900">
              {formatDateTimeVN(item.ngaySuDung)}
            </td>
            <td className="px-4 py-4 text-slate-900">
              {getDichVuName(item, dichVuMap)}
            </td>
            <td className="px-4 py-4 text-slate-900">{item.soLuong}</td>
            <td className="px-4 py-4 text-slate-900">
              {formatCurrencyVND(item.giaTaiThoiDiem)}
            </td>
            <td className="px-4 py-4 font-medium text-slate-900">
              {formatCurrencyVND(thanhTien)}
            </td>
            <td className="px-4 py-4">
              <div className="flex justify-end gap-2">
                {canDelete ? (
                  <Button
                    disabled={deletingId === item.id}
                    onClick={() => onDelete(item)}
                    variant="danger"
                  >
                    {deletingId === item.id ? "Đang xóa..." : "Xóa"}
                  </Button>
                ) : (
                  <span className="text-sm text-slate-400">Chỉ xem</span>
                )}
              </div>
            </td>
          </tr>
        );
      })}
    </DataTable>
  );
}
