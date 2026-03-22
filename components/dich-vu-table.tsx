"use client";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrencyVND } from "@/lib/hotel";
import type { DichVu } from "@/types/dich-vu";

type DichVuTableProps = {
  canManage: boolean;
  items: DichVu[];
  onDelete: (item: DichVu) => void;
  onEdit: (item: DichVu) => void;
};

export function DichVuTable({
  canManage,
  items,
  onDelete,
  onEdit,
}: DichVuTableProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        description="Chưa có dịch vụ nào trong danh mục hiện tại."
        title="Danh mục dịch vụ đang trống"
      />
    );
  }

  return (
    <DataTable
      head={
        <tr>
          <th className="px-4 py-3 text-left font-semibold text-slate-600">ID</th>
          <th className="px-4 py-3 text-left font-semibold text-slate-600">
            Tên dịch vụ
          </th>
          <th className="px-4 py-3 text-left font-semibold text-slate-600">
            Giá hiện tại
          </th>
          <th className="px-4 py-3 text-right font-semibold text-slate-600">
            Hành động
          </th>
        </tr>
      }
    >
      {items.map((item) => (
        <tr key={item.id} className="bg-white">
          <td className="px-4 py-4 text-slate-900">{item.id}</td>
          <td className="px-4 py-4 text-slate-900">{item.tenDichVu}</td>
          <td className="px-4 py-4 text-slate-900">
            {formatCurrencyVND(item.giaHienTai)}
          </td>
          <td className="px-4 py-4">
            <div className="flex justify-end gap-2">
              {canManage ? (
                <>
                  <Button onClick={() => onEdit(item)} variant="secondary">
                    Sửa
                  </Button>
                  <Button onClick={() => onDelete(item)} variant="danger">
                    Xóa
                  </Button>
                </>
              ) : (
                <span className="text-sm text-slate-400">Chỉ xem</span>
              )}
            </div>
          </td>
        </tr>
      ))}
    </DataTable>
  );
}
