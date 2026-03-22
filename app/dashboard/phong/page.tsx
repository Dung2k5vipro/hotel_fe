"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PhongDetail } from "@/components/phong-detail";
import { PhongForm } from "@/components/phong-form";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuthUser } from "@/hooks/use-auth-user";
import { canManageRooms, formatCurrencyVND } from "@/lib/hotel";
import { getLoaiPhongList } from "@/services/loai-phong";
import { deletePhong, getPhongList } from "@/services/phong";
import type { LoaiPhong } from "@/types/loai-phong";
import {
  mergePhongListWithLoaiPhong,
  type Phong,
  type TrangThaiPhong,
} from "@/types/phong";

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

type FormMode = "create" | "edit";

type FilterState = {
  search: string;
  loaiPhongId: string;
  trangThai: string;
};

function mapPhongError(error: unknown, action: "delete" | "save") {
  const message =
    error instanceof Error
      ? error.message
      : "Có lỗi xảy ra, vui lòng thử lại.";
  const normalizedMessage = message.toLowerCase();

  if (
    action === "delete" &&
    (normalizedMessage.includes("dat phong") ||
      normalizedMessage.includes("booking") ||
      normalizedMessage.includes("reservation") ||
      normalizedMessage.includes("foreign") ||
      normalizedMessage.includes("constraint"))
  ) {
    return "Không thể xóa phòng vì đang gắn với dữ liệu đặt phòng.";
  }

  return message;
}

function upsertPhong(currentList: Phong[], nextItem: Phong, mode: FormMode) {
  const existingIndex = currentList.findIndex(
    (item) => item.soPhong === nextItem.soPhong,
  );

  if (existingIndex === -1) {
    return mode === "create"
      ? [nextItem, ...currentList]
      : [...currentList, nextItem];
  }

  return currentList.map((item) =>
    item.soPhong === nextItem.soPhong ? nextItem : item,
  );
}

export default function PhongPage() {
  const user = useAuthUser();
  const [phongList, setPhongList] = useState<Phong[]>([]);
  const [loaiPhongList, setLoaiPhongList] = useState<LoaiPhong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [filter, setFilter] = useState<FilterState>({
    search: "",
    loaiPhongId: "all",
    trangThai: "all",
  });
  const [selectedPhong, setSelectedPhong] = useState<Phong | null>(null);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [openForm, setOpenForm] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Phong | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canManage = canManageRooms(user);
  const selectedSoPhong = selectedPhong?.soPhong ?? null;
  const deleteSoPhong = deleteItem?.soPhong ?? null;

  const loadLoaiPhongList = useCallback(async () => {
    const data = await getLoaiPhongList();
    setLoaiPhongList(data);
    return data;
  }, []);

  const loadPhongData = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setLoading(true);
      }

      try {
        const [roomTypes, rooms] = await Promise.all([
          loadLoaiPhongList(),
          getPhongList(),
        ]);

        setPhongList(mergePhongListWithLoaiPhong(rooms, roomTypes));
        setError(null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Không thể tải dữ liệu phòng.",
        );
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [loadLoaiPhongList],
  );

  useEffect(() => {
    void loadPhongData();
  }, [loadPhongData]);

  useEffect(() => {
    if (loaiPhongList.length === 0) {
      return;
    }

    setPhongList((currentList) =>
      mergePhongListWithLoaiPhong(currentList, loaiPhongList),
    );
  }, [loaiPhongList]);

  useEffect(() => {
    if (selectedSoPhong === null) {
      return;
    }

    const latestItem =
      phongList.find((item) => item.soPhong === selectedSoPhong) ?? null;

    if (!latestItem) {
      setSelectedPhong(null);
      setOpenDetail(false);
      if (formMode === "edit") {
        setOpenForm(false);
      }
      return;
    }

    if (latestItem !== selectedPhong) {
      setSelectedPhong(latestItem);
    }
  }, [formMode, phongList, selectedPhong, selectedSoPhong]);

  useEffect(() => {
    if (deleteSoPhong === null) {
      return;
    }

    const latestItem =
      phongList.find((item) => item.soPhong === deleteSoPhong) ?? null;

    if (!latestItem) {
      setDeleteItem(null);
      return;
    }

    if (latestItem !== deleteItem) {
      setDeleteItem(latestItem);
    }
  }, [deleteItem, deleteSoPhong, phongList]);

  const filteredPhongList = useMemo(() => {
    const normalizedSearch = filter.search.trim().toLowerCase();

    return phongList.filter((item) => {
      const matchSearch =
        item.soPhong.toLowerCase().includes(normalizedSearch) ||
        (item.tenLoaiPhong ?? item.loaiPhong?.tenLoaiPhong ?? "")
          .toLowerCase()
          .includes(normalizedSearch);
      const matchLoaiPhong =
        filter.loaiPhongId === "all" ||
        String(item.loaiPhongId) === filter.loaiPhongId;
      const matchTrangThai =
        filter.trangThai === "all" || item.trangThai === filter.trangThai;

      return matchSearch && matchLoaiPhong && matchTrangThai;
    });
  }, [filter, phongList]);

  const stats = useMemo(() => {
    const countByStatus = (status: TrangThaiPhong) =>
      phongList.filter((item) => item.trangThai === status).length;

    return {
      total: phongList.length,
      trong: countByStatus("Trong"),
      dangO: countByStatus("DangO"),
      canDon: countByStatus("CanDon"),
      baoTri: countByStatus("BaoTri"),
    };
  }, [phongList]);

  function handleCreateClick() {
    setFeedback(null);
    setSelectedPhong(null);
    setFormMode("create");
    setOpenForm(true);
  }

  function handleEditClick(item: Phong) {
    setFeedback(null);
    setSelectedPhong(item);
    setFormMode("edit");
    setOpenForm(true);
  }

  function handleDetailClick(item: Phong) {
    setSelectedPhong(item);
    setOpenDetail(true);
  }

  async function handleFormSuccess({
    item,
    mode,
  }: {
    item: Phong | null;
    mode: FormMode;
  }) {
    const mergedItem =
      item !== null
        ? mergePhongListWithLoaiPhong([item], loaiPhongList)[0] ?? item
        : null;

    setFeedback({
      type: "success",
      message:
        mode === "create"
          ? "Tạo phòng thành công."
          : "Cập nhật phòng thành công.",
    });

    if (mergedItem) {
      setPhongList((currentList) => upsertPhong(currentList, mergedItem, mode));
      setSelectedPhong(mergedItem);
    }

    setOpenForm(false);

    try {
      await loadPhongData(false);
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
      await deletePhong(deleteItem.soPhong);

      setPhongList((currentList) =>
        currentList.filter((item) => item.soPhong !== deleteItem.soPhong),
      );
      setFeedback({
        type: "success",
        message: "Xóa phòng thành công.",
      });
      setDeleteItem(null);

      if (selectedSoPhong === deleteItem.soPhong) {
        setSelectedPhong(null);
        setOpenDetail(false);
        if (formMode === "edit") {
          setOpenForm(false);
        }
      }

      await loadPhongData(false);
    } catch (deleteError) {
      setFeedback({
        type: "error",
        message: mapPhongError(deleteError, "delete"),
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
            <Button
              disabled={loaiPhongList.length === 0}
              onClick={handleCreateClick}
            >
              Thêm phòng
            </Button>
          ) : undefined
        }
        description="Quản lý phòng vật lý, trạng thái vận hành và loại phòng đang gán cho từng phòng."
        title="Quản lý phòng"
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Tổng số phòng</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {stats.total}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Phòng trống</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {stats.trong}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Phòng đang ở</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {stats.dangO}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Phòng cần dọn</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {stats.canDon}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Phòng bảo trì</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {stats.baoTri}
          </p>
        </div>
      </div>

      <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm xl:grid-cols-[minmax(0,1fr)_260px_220px]">
        <Input
          onChange={(event) =>
            setFilter((currentFilter) => ({
              ...currentFilter,
              search: event.target.value,
            }))
          }
          placeholder="Tìm theo số phòng hoặc loại phòng"
          value={filter.search}
        />
        <Select
          onChange={(event) =>
            setFilter((currentFilter) => ({
              ...currentFilter,
              loaiPhongId: event.target.value,
            }))
          }
          value={filter.loaiPhongId}
        >
          <option value="all">Tất cả loại phòng</option>
          {loaiPhongList.map((item) => (
            <option key={item.loaiPhongId} value={item.loaiPhongId}>
              {item.tenLoaiPhong}
            </option>
          ))}
        </Select>
        <Select
          onChange={(event) =>
            setFilter((currentFilter) => ({
              ...currentFilter,
              trangThai: event.target.value,
            }))
          }
          value={filter.trangThai}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="Trong">Trong</option>
          <option value="DangO">DangO</option>
          <option value="CanDon">CanDon</option>
          <option value="BaoTri">BaoTri</option>
        </Select>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Đang tải danh sách phòng...
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error}
        </div>
      ) : filteredPhongList.length === 0 ? (
        <EmptyState
          description={
            phongList.length === 0
              ? "Chưa có phòng nào. Hãy tạo phòng đầu tiên sau khi đã có loại phòng."
              : "Không tìm thấy phòng phù hợp với điều kiện lọc hiện tại."
          }
          title="Danh sách phòng đang trống"
        />
      ) : (
        <DataTable
          head={
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Số phòng
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Loại phòng
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Trạng thái
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
          {filteredPhongList.map((item) => (
            <tr key={item.soPhong} className="bg-white">
              <td className="px-4 py-4 text-slate-900">{item.soPhong}</td>
              <td className="px-4 py-4 text-slate-900">
                {item.tenLoaiPhong ?? item.loaiPhong?.tenLoaiPhong ?? "Chưa xác định"}
              </td>
              <td className="px-4 py-4">
                <StatusBadge status={item.trangThai} />
              </td>
              <td className="px-4 py-4 text-slate-900">
                {item.loaiPhong
                  ? formatCurrencyVND(item.loaiPhong.giaCoBan)
                  : "N/A"}
              </td>
              <td className="px-4 py-4 text-slate-900">
                {item.loaiPhong?.soNguoiToiDa ?? "N/A"}
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

      <PhongForm
        initialData={formMode === "edit" ? selectedPhong : null}
        loaiPhongOptions={loaiPhongList}
        mode={formMode}
        onClose={() => setOpenForm(false)}
        onSuccess={handleFormSuccess}
        open={openForm}
      />

      <PhongDetail
        item={selectedPhong}
        onClose={() => setOpenDetail(false)}
        open={openDetail}
      />

      <ConfirmDialog
        confirmLabel="Xóa phòng"
        description={
          deleteItem
            ? `Bạn có chắc muốn xóa phòng "${deleteItem.soPhong}"?`
            : ""
        }
        isLoading={deleting}
        isOpen={Boolean(deleteItem)}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Xác nhận xóa phòng"
      />
    </section>
  );
}
