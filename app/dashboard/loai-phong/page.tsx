"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { LoaiPhongDetail } from "@/components/loai-phong-detail";
import { LoaiPhongForm } from "@/components/loai-phong-form";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { useAuthUser } from "@/hooks/use-auth-user";
import { canManageRoomTypes, formatCurrencyVND } from "@/lib/hotel";
import { deleteLoaiPhong, getLoaiPhongList } from "@/services/loai-phong";
import type { LoaiPhong } from "@/types/loai-phong";

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

type FormMode = "create" | "edit";

function mapLoaiPhongError(error: unknown, action: "delete" | "save") {
  const message =
    error instanceof Error
      ? error.message
      : "Có lỗi xảy ra, vui lòng thử lại.";
  const normalizedMessage = message.toLowerCase();

  if (
    action === "delete" &&
    (normalizedMessage.includes("foreign") ||
      normalizedMessage.includes("constraint") ||
      normalizedMessage.includes("phong"))
  ) {
    return "Không thể xóa loại phòng vì đang có phòng sử dụng loại này.";
  }

  return message;
}

function upsertLoaiPhong(
  currentList: LoaiPhong[],
  nextItem: LoaiPhong,
  mode: FormMode,
) {
  const existingIndex = currentList.findIndex(
    (item) => item.loaiPhongId === nextItem.loaiPhongId,
  );

  if (existingIndex === -1) {
    return mode === "create"
      ? [nextItem, ...currentList]
      : [...currentList, nextItem];
  }

  return currentList.map((item) =>
    item.loaiPhongId === nextItem.loaiPhongId ? nextItem : item,
  );
}

export default function LoaiPhongPage() {
  const user = useAuthUser();
  const [loaiPhongList, setLoaiPhongList] = useState<LoaiPhong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [selectedLoaiPhong, setSelectedLoaiPhong] = useState<LoaiPhong | null>(
    null,
  );
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [openForm, setOpenForm] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [deleteItem, setDeleteItem] = useState<LoaiPhong | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canManage = canManageRoomTypes(user);
  const selectedLoaiPhongId = selectedLoaiPhong?.loaiPhongId ?? null;
  const deleteLoaiPhongId = deleteItem?.loaiPhongId ?? null;

  const loadLoaiPhongList = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const data = await getLoaiPhongList();
      setLoaiPhongList(data);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải danh sách loại phòng.",
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadLoaiPhongList();
  }, [loadLoaiPhongList]);

  useEffect(() => {
    if (selectedLoaiPhongId === null) {
      return;
    }

    const latestItem =
      loaiPhongList.find((item) => item.loaiPhongId === selectedLoaiPhongId) ??
      null;

    if (!latestItem) {
      setSelectedLoaiPhong(null);
      setOpenDetail(false);
      if (formMode === "edit") {
        setOpenForm(false);
      }
      return;
    }

    if (latestItem !== selectedLoaiPhong) {
      setSelectedLoaiPhong(latestItem);
    }
  }, [formMode, loaiPhongList, selectedLoaiPhong, selectedLoaiPhongId]);

  useEffect(() => {
    if (deleteLoaiPhongId === null) {
      return;
    }

    const latestItem =
      loaiPhongList.find((item) => item.loaiPhongId === deleteLoaiPhongId) ??
      null;

    if (!latestItem) {
      setDeleteItem(null);
      return;
    }

    if (latestItem !== deleteItem) {
      setDeleteItem(latestItem);
    }
  }, [deleteItem, deleteLoaiPhongId, loaiPhongList]);

  const filteredLoaiPhongList = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    const filtered = loaiPhongList.filter((item) =>
      item.tenLoaiPhong.toLowerCase().includes(normalizedSearchTerm),
    );

    if (sortBy === "priceAsc") {
      return [...filtered].sort(
        (currentItem, nextItem) => currentItem.giaCoBan - nextItem.giaCoBan,
      );
    }

    if (sortBy === "priceDesc") {
      return [...filtered].sort(
        (currentItem, nextItem) => nextItem.giaCoBan - currentItem.giaCoBan,
      );
    }

    return filtered;
  }, [loaiPhongList, searchTerm, sortBy]);

  const stats = useMemo(() => {
    if (loaiPhongList.length === 0) {
      return {
        total: 0,
        minPrice: null,
        maxPrice: null,
      };
    }

    const prices = loaiPhongList.map((item) => item.giaCoBan);

    return {
      total: loaiPhongList.length,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
    };
  }, [loaiPhongList]);

  function handleCreateClick() {
    setFeedback(null);
    setSelectedLoaiPhong(null);
    setFormMode("create");
    setOpenForm(true);
  }

  function handleEditClick(item: LoaiPhong) {
    setFeedback(null);
    setSelectedLoaiPhong(item);
    setFormMode("edit");
    setOpenForm(true);
  }

  function handleDetailClick(item: LoaiPhong) {
    setSelectedLoaiPhong(item);
    setOpenDetail(true);
  }

  async function handleFormSuccess({
    item,
    mode,
  }: {
    item: LoaiPhong | null;
    mode: FormMode;
  }) {
    setFeedback({
      type: "success",
      message:
        mode === "create"
          ? "Tạo loại phòng thành công."
          : "Cập nhật loại phòng thành công.",
    });

    if (item) {
      setLoaiPhongList((currentList) => upsertLoaiPhong(currentList, item, mode));
      setSelectedLoaiPhong(item);
    }

    setOpenForm(false);

    try {
      await loadLoaiPhongList(false);
    } catch {
      return;
    }
  }

  async function handleDelete() {
    if (!deleteItem) {
      return;
    }

    setDeleting(true);

    try {
      await deleteLoaiPhong(deleteItem.loaiPhongId);

      setLoaiPhongList((currentList) =>
        currentList.filter((item) => item.loaiPhongId !== deleteItem.loaiPhongId),
      );
      setFeedback({
        type: "success",
        message: "Xóa loại phòng thành công.",
      });
      setDeleteItem(null);

      if (selectedLoaiPhongId === deleteItem.loaiPhongId) {
        setSelectedLoaiPhong(null);
        setOpenDetail(false);
        if (formMode === "edit") {
          setOpenForm(false);
        }
      }

      await loadLoaiPhongList(false);
    } catch (deleteError) {
      setFeedback({
        type: "error",
        message: mapLoaiPhongError(deleteError, "delete"),
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        action={
          canManage ? (
            <Button onClick={handleCreateClick}>Thêm loại phòng</Button>
          ) : undefined
        }
        description="Quản lý danh mục loại phòng, giá cơ bản và số người tối đa cho từng loại."
        title="Quản lý loại phòng"
      />

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Tổng số loại phòng</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {stats.total}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Giá thấp nhất</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {stats.minPrice === null ? "—" : formatCurrencyVND(stats.minPrice)}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Giá cao nhất</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {stats.maxPrice === null ? "—" : formatCurrencyVND(stats.maxPrice)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_240px]">
        <Input
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Tìm theo tên loại phòng"
          value={searchTerm}
        />
        <Select onChange={(event) => setSortBy(event.target.value)} value={sortBy}>
          <option value="default">Sắp xếp mặc định</option>
          <option value="priceAsc">Giá tăng dần</option>
          <option value="priceDesc">Giá giảm dần</option>
        </Select>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Đang tải danh sách loại phòng...
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error}
        </div>
      ) : filteredLoaiPhongList.length === 0 ? (
        <EmptyState
          description={
            loaiPhongList.length === 0
              ? "Chưa có loại phòng nào. Hãy thêm loại phòng đầu tiên để bắt đầu."
              : "Không tìm thấy loại phòng phù hợp với bộ lọc hiện tại."
          }
          title="Danh sách loại phòng đang trống"
        />
      ) : (
        <DataTable
          head={
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                ID
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Tên loại phòng
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Giá cơ bản
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Số người tối đa
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">
                Hành động
              </th>
            </tr>
          }
        >
          {filteredLoaiPhongList.map((item) => (
            <tr key={item.loaiPhongId} className="bg-white">
              <td className="px-4 py-4 text-slate-900">{item.loaiPhongId}</td>
              <td className="px-4 py-4 text-slate-900">{item.tenLoaiPhong}</td>
              <td className="px-4 py-4 text-slate-900">
                {formatCurrencyVND(item.giaCoBan)}
              </td>
              <td className="px-4 py-4 text-slate-900">
                {item.soNguoiToiDa}
              </td>
              <td className="px-4 py-4">
                <div className="flex justify-end gap-2">
                  <Button onClick={() => handleDetailClick(item)} variant="ghost">
                    Xem chi tiết
                  </Button>
                  {canManage ? (
                    <>
                      <Button
                        onClick={() => handleEditClick(item)}
                        variant="secondary"
                      >
                        Sửa
                      </Button>
                      <Button onClick={() => setDeleteItem(item)} variant="danger">
                        Xóa
                      </Button>
                    </>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <LoaiPhongForm
        initialData={formMode === "edit" ? selectedLoaiPhong : null}
        mode={formMode}
        onClose={() => setOpenForm(false)}
        onSuccess={handleFormSuccess}
        open={openForm}
      />

      <LoaiPhongDetail
        item={selectedLoaiPhong}
        onClose={() => setOpenDetail(false)}
        open={openDetail}
      />

      <ConfirmDialog
        confirmLabel="Xóa loại phòng"
        description={
          deleteItem
            ? `Bạn có chắc muốn xóa loại phòng "${deleteItem.tenLoaiPhong}"?`
            : ""
        }
        isLoading={deleting}
        isOpen={Boolean(deleteItem)}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Xác nhận xóa loại phòng"
      />
    </section>
  );
}
