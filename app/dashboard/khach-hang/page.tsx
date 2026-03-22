"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { KhachHangDetail } from "@/components/khach-hang-detail";
import { KhachHangForm } from "@/components/khach-hang-form";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { useAuthUser } from "@/hooks/use-auth-user";
import {
  canDeleteCustomers,
  canManageCustomers,
  formatDateTimeVN,
} from "@/lib/hotel";
import {
  deleteKhachHang,
  getKhachHangList,
  searchKhachHang,
} from "@/services/khach-hang";
import type { KhachHang } from "@/types/khach-hang";

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

type FormMode = "create" | "edit";

function mapKhachHangError(error: unknown, action: "delete" | "save") {
  const message =
    error instanceof Error
      ? error.message
      : "Có lỗi xảy ra, vui lòng thử lại.";
  const normalizedMessage = message.toLowerCase();

  if (
    action === "save" &&
    normalizedMessage.includes("cccd") &&
    (normalizedMessage.includes("exist") ||
      normalizedMessage.includes("unique") ||
      normalizedMessage.includes("duplicate") ||
      normalizedMessage.includes("tồn tại"))
  ) {
    return "CCCD đã tồn tại trong hệ thống.";
  }

  if (
    action === "delete" &&
    (normalizedMessage.includes("foreign") ||
      normalizedMessage.includes("constraint") ||
      normalizedMessage.includes("reservation") ||
      normalizedMessage.includes("đặt phòng"))
  ) {
    return "Không thể xóa khách hàng vì đang gắn với dữ liệu đặt phòng.";
  }

  return message;
}

function matchesKhachHangQuery(item: KhachHang, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [item.hoTen, item.cccd, item.thongTinLienHe].some((value) =>
    value.toLowerCase().includes(normalizedQuery),
  );
}

function upsertKhachHang(currentList: KhachHang[], nextItem: KhachHang) {
  const existed = currentList.some(
    (item) => item.khachHangId === nextItem.khachHangId,
  );

  if (!existed) {
    return [nextItem, ...currentList];
  }

  return currentList.map((item) =>
    item.khachHangId === nextItem.khachHangId ? nextItem : item,
  );
}

export default function KhachHangPage() {
  const user = useAuthUser();
  const [allKhachHangList, setAllKhachHangList] = useState<KhachHang[]>([]);
  const [khachHangList, setKhachHangList] = useState<KhachHang[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKhachHang, setSelectedKhachHang] = useState<KhachHang | null>(
    null,
  );
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [openForm, setOpenForm] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [deleteItem, setDeleteItem] = useState<KhachHang | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canManage = canManageCustomers(user);
  const canDelete = canDeleteCustomers(user);
  const searchQueryRef = useRef(searchQuery);
  const requestIdRef = useRef(0);
  const selectedKhachHangId = selectedKhachHang?.khachHangId ?? null;
  const deleteKhachHangId = deleteItem?.khachHangId ?? null;
  const isSearching = searchQuery.trim().length > 0;

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  const loadKhachHangList = useCallback(
    async (showLoading = true, queryOverride?: string) => {
      const requestId = ++requestIdRef.current;
      const normalizedQuery = (queryOverride ?? searchQueryRef.current).trim();

      if (showLoading) {
        setLoading(true);
      }

      try {
        if (normalizedQuery) {
          const [fullList, searchedList] = await Promise.all([
            getKhachHangList(),
            searchKhachHang(normalizedQuery),
          ]);

          if (requestId !== requestIdRef.current) {
            return;
          }

          setAllKhachHangList(fullList);
          setKhachHangList(searchedList);
        } else {
          const fullList = await getKhachHangList();

          if (requestId !== requestIdRef.current) {
            return;
          }

          setAllKhachHangList(fullList);
          setKhachHangList(fullList);
        }

        setError(null);
      } catch (loadError) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Không thể tải danh sách khách hàng.",
        );
      } finally {
        if (showLoading && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const debounceTimer = window.setTimeout(
      () => {
        void loadKhachHangList(true, searchQuery);
      },
      searchQuery.trim() ? 350 : 0,
    );

    return () => {
      window.clearTimeout(debounceTimer);
    };
  }, [loadKhachHangList, searchQuery]);

  useEffect(() => {
    if (selectedKhachHangId === null) {
      return;
    }

    const latestItem =
      allKhachHangList.find((item) => item.khachHangId === selectedKhachHangId) ??
      null;

    if (!latestItem) {
      setSelectedKhachHang(null);
      setOpenDetail(false);
      if (formMode === "edit") {
        setOpenForm(false);
      }
      return;
    }

    if (latestItem !== selectedKhachHang) {
      setSelectedKhachHang(latestItem);
    }
  }, [allKhachHangList, formMode, selectedKhachHang, selectedKhachHangId]);

  useEffect(() => {
    if (deleteKhachHangId === null) {
      return;
    }

    const latestItem =
      allKhachHangList.find((item) => item.khachHangId === deleteKhachHangId) ??
      null;

    if (!latestItem) {
      setDeleteItem(null);
      return;
    }

    if (latestItem !== deleteItem) {
      setDeleteItem(latestItem);
    }
  }, [allKhachHangList, deleteItem, deleteKhachHangId]);

  const stats = useMemo(() => {
    const withCccd = allKhachHangList.filter((item) => item.cccd.length > 0).length;

    return {
      total: allKhachHangList.length,
      withCccd,
      withoutCccd: allKhachHangList.length - withCccd,
    };
  }, [allKhachHangList]);

  function handleCreateClick() {
    setFeedback(null);
    setSelectedKhachHang(null);
    setFormMode("create");
    setOpenForm(true);
  }

  function handleEditClick(item: KhachHang) {
    setFeedback(null);
    setSelectedKhachHang(item);
    setFormMode("edit");
    setOpenForm(true);
  }

  function handleDetailClick(item: KhachHang) {
    setSelectedKhachHang(item);
    setOpenDetail(true);
  }

  async function handleFormSuccess({
    item,
    mode,
  }: {
    item: KhachHang | null;
    mode: FormMode;
  }) {
    const currentQuery = searchQueryRef.current;

    setFeedback({
      type: "success",
      message:
        mode === "create"
          ? "Tạo khách hàng thành công."
          : "Cập nhật khách hàng thành công.",
    });

    if (item) {
      setAllKhachHangList((currentList) => upsertKhachHang(currentList, item));
      setKhachHangList((currentList) => {
        if (!matchesKhachHangQuery(item, currentQuery)) {
          return currentList.filter(
            (currentItem) => currentItem.khachHangId !== item.khachHangId,
          );
        }

        return upsertKhachHang(currentList, item);
      });
      setSelectedKhachHang(item);
    }

    setOpenForm(false);

    try {
      await loadKhachHangList(false, currentQuery);
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
      await deleteKhachHang(deleteItem.khachHangId);

      setAllKhachHangList((currentList) =>
        currentList.filter(
          (item) => item.khachHangId !== deleteItem.khachHangId,
        ),
      );
      setKhachHangList((currentList) =>
        currentList.filter(
          (item) => item.khachHangId !== deleteItem.khachHangId,
        ),
      );
      setFeedback({
        type: "success",
        message: "Xóa khách hàng thành công.",
      });
      setDeleteItem(null);

      if (selectedKhachHangId === deleteItem.khachHangId) {
        setSelectedKhachHang(null);
        setOpenDetail(false);
        if (formMode === "edit") {
          setOpenForm(false);
        }
      }

      await loadKhachHangList(false, searchQueryRef.current);
    } catch (deleteError) {
      setFeedback({
        type: "error",
        message: mapKhachHangError(deleteError, "delete"),
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
            <Button onClick={handleCreateClick}>Thêm khách hàng</Button>
          ) : undefined
        }
        description="Quản lý hồ sơ khách lưu trú, hỗ trợ tra cứu nhanh theo CCCD và thông tin liên hệ."
        title="Quản lý khách hàng"
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
          <p className="text-sm text-slate-500">Tổng số khách hàng</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {stats.total}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Có CCCD</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {stats.withCccd}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Chưa có CCCD</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {stats.withoutCccd}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <Input
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Tìm theo họ tên, CCCD hoặc thông tin liên hệ"
          value={searchQuery}
        />
        <p className="mt-3 text-sm text-slate-500">
          Ưu tiên tra cứu khách cũ bằng CCCD hoặc số điện thoại để tránh tạo trùng hồ sơ.
        </p>
      </div>

      {loading && allKhachHangList.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          {isSearching
            ? "Đang tìm khách hàng..."
            : "Đang cập nhật danh sách khách hàng..."}
        </div>
      ) : null}

      {loading && allKhachHangList.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          {isSearching
            ? "Đang tìm khách hàng..."
            : "Đang tải danh sách khách hàng..."}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error}
        </div>
      ) : khachHangList.length === 0 ? (
        <EmptyState
          description={
            allKhachHangList.length === 0
              ? "Chưa có khách hàng nào. Hãy tạo hồ sơ khách đầu tiên để bắt đầu."
              : "Không tìm thấy khách hàng phù hợp với từ khóa hiện tại."
          }
          title={
            allKhachHangList.length === 0
              ? "Danh sách khách hàng đang trống"
              : "Không có kết quả tìm kiếm"
          }
        />
      ) : (
        <DataTable
          head={
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                ID
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Họ tên
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                CCCD
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Thông tin liên hệ
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Quốc tịch
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Ngày tạo
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">
                Hành động
              </th>
            </tr>
          }
        >
          {khachHangList.map((item) => (
            <tr key={item.khachHangId} className="bg-white">
              <td className="px-4 py-4 text-slate-900">{item.khachHangId}</td>
              <td className="px-4 py-4 text-slate-900">{item.hoTen}</td>
              <td className="px-4 py-4 text-slate-900">
                {item.cccd || "Chưa cập nhật"}
              </td>
              <td className="px-4 py-4 text-slate-900">
                {item.thongTinLienHe || "Chưa cập nhật"}
              </td>
              <td className="px-4 py-4 text-slate-900">
                {item.quocTich || "Chưa cập nhật"}
              </td>
              <td className="px-4 py-4 text-slate-900">
                {formatDateTimeVN(item.ngayTao)}
              </td>
              <td className="px-4 py-4">
                <div className="flex justify-end gap-2">
                  <Button onClick={() => handleDetailClick(item)} variant="ghost">
                    Xem chi tiết
                  </Button>
                  {canManage ? (
                    <Button
                      onClick={() => handleEditClick(item)}
                      variant="secondary"
                    >
                      Sửa
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button onClick={() => setDeleteItem(item)} variant="danger">
                      Xóa
                    </Button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <KhachHangForm
        initialData={formMode === "edit" ? selectedKhachHang : null}
        mode={formMode}
        onClose={() => setOpenForm(false)}
        onSuccess={handleFormSuccess}
        open={openForm}
      />

      <KhachHangDetail
        item={selectedKhachHang}
        onClose={() => setOpenDetail(false)}
        open={openDetail}
      />

      <ConfirmDialog
        confirmLabel="Xóa khách hàng"
        description={
          deleteItem
            ? `Bạn có chắc muốn xóa hồ sơ khách hàng "${deleteItem.hoTen}"?`
            : ""
        }
        isLoading={deleting}
        isOpen={Boolean(deleteItem)}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Xác nhận xóa khách hàng"
      />
    </section>
  );
}
