"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DichVuForm } from "@/components/dich-vu-form";
import { DichVuTable } from "@/components/dich-vu-table";
import { SuDungDichVuForm } from "@/components/su-dung-dich-vu-form";
import { SuDungDichVuTable } from "@/components/su-dung-dich-vu-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { useAuthUser } from "@/hooks/use-auth-user";
import { formatCurrencyVND } from "@/lib/hotel";
import { repairVietnameseText } from "@/lib/text";
import {
  createDichVu,
  createSuDungDichVu,
  deleteDichVu,
  deleteSuDungDichVu,
  getDichVuList,
  getSuDungDichVuByReservation,
  updateDichVu,
} from "@/services/dich-vu";
import { isAdmin, isNhanVien } from "@/services/auth";
import { getDatPhongList } from "@/services/dat-phong";
import {
  getTrangThaiDatPhongLabel,
  getTrangThaiDatPhongTone,
  type DatPhong,
} from "@/types/dat-phong";
import type { DichVu, DichVuPayload, SuDungDichVu } from "@/types/dich-vu";

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

type FormMode = "create" | "edit";

function normalizeMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = repairVietnameseText(error.message).trim();
  return message.length > 0 ? message : fallback;
}

function mapDichVuError(error: unknown, action: "save" | "delete") {
  const message = normalizeMessage(
    error,
    action === "save"
      ? "Không thể lưu dịch vụ."
      : "Không thể xóa dịch vụ.",
  );
  const normalizedMessage = message.toLowerCase();

  if (
    action === "delete" &&
    (normalizedMessage.includes("foreign") ||
      normalizedMessage.includes("constraint") ||
      normalizedMessage.includes("sử dụng dịch vụ") ||
      normalizedMessage.includes("su dung dich vu") ||
      normalizedMessage.includes("invoice") ||
      normalizedMessage.includes("hóa đơn") ||
      normalizedMessage.includes("hoa don"))
  ) {
    return "Không thể xóa dịch vụ vì đã phát sinh sử dụng hoặc đã liên kết với hóa đơn.";
  }

  return message;
}

function mapSuDungDichVuError(
  error: unknown,
  action: "load" | "save" | "delete",
) {
  const message = normalizeMessage(
    error,
    action === "load"
      ? "Không thể tải lịch sử sử dụng dịch vụ."
      : action === "save"
        ? "Không thể thêm sử dụng dịch vụ."
        : "Không thể xóa sử dụng dịch vụ.",
  );
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("not found") ||
    normalizedMessage.includes("không tìm thấy") ||
    normalizedMessage.includes("khong tim thay")
  ) {
    if (action === "load") {
      return "Không tìm thấy dữ liệu sử dụng dịch vụ cho DatPhong_ID đã chọn.";
    }

    return "Không tìm thấy bản ghi cần thao tác.";
  }

  if (
    normalizedMessage.includes("đã hủy") ||
    normalizedMessage.includes("da huy") ||
    normalizedMessage.includes("đã trả phòng") ||
    normalizedMessage.includes("da tra phong") ||
    normalizedMessage.includes("checkout") ||
    normalizedMessage.includes("check-out")
  ) {
    return "Đặt phòng không còn hợp lệ để thêm dịch vụ mới.";
  }

  return message;
}

function sortDichVuList(list: DichVu[]) {
  return [...list].sort((currentItem, nextItem) => nextItem.id - currentItem.id);
}

function sortDatPhongList(list: DatPhong[]) {
  return [...list].sort(
    (currentItem, nextItem) => nextItem.datPhongId - currentItem.datPhongId,
  );
}

function sortSuDungDichVuList(list: SuDungDichVu[]) {
  return [...list].sort((currentItem, nextItem) => {
    const currentTime = currentItem.ngaySuDung
      ? new Date(currentItem.ngaySuDung).getTime()
      : 0;
    const nextTime = nextItem.ngaySuDung
      ? new Date(nextItem.ngaySuDung).getTime()
      : 0;

    if (currentTime !== nextTime) {
      return nextTime - currentTime;
    }

    return nextItem.id - currentItem.id;
  });
}

function upsertDichVu(currentList: DichVu[], nextItem: DichVu) {
  const existed = currentList.some((item) => item.id === nextItem.id);

  if (!existed) {
    return sortDichVuList([nextItem, ...currentList]);
  }

  return sortDichVuList(
    currentList.map((item) => (item.id === nextItem.id ? nextItem : item)),
  );
}

function upsertSuDungDichVu(currentList: SuDungDichVu[], nextItem: SuDungDichVu) {
  const existed = currentList.some((item) => item.id === nextItem.id);

  if (!existed) {
    return sortSuDungDichVuList([nextItem, ...currentList]);
  }

  return sortSuDungDichVuList(
    currentList.map((item) => (item.id === nextItem.id ? nextItem : item)),
  );
}

function matchesDichVuSearch(item: DichVu, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return item.tenDichVu.toLowerCase().includes(normalizedQuery);
}

function getReservationUsageWarning(item: DatPhong | null) {
  if (!item) {
    return "Chọn đúng DatPhong_ID để ghi nhận sử dụng dịch vụ.";
  }

  if (item.trangThai === "DaHuy") {
    return "Đặt phòng này đã hủy. Bạn chỉ có thể xem lịch sử, không thể thêm dịch vụ mới.";
  }

  if (item.trangThai === "DaTraPhong") {
    return "Đặt phòng này đã check-out. Bạn chỉ có thể xem lịch sử, không thể thêm dịch vụ mới.";
  }

  return null;
}

function getReservationSummary(item: DatPhong | null) {
  if (!item) {
    return null;
  }

  return {
    datPhongId: item.datPhongId,
    soPhong: item.soPhong,
    tenKhachHang: item.tenKhachHang ?? item.khachHang?.hoTen ?? "Chưa cập nhật",
    trangThai: item.trangThai,
  };
}

export default function DichVuPage() {
  const user = useAuthUser();
  const [dichVuList, setDichVuList] = useState<DichVu[]>([]);
  const [datPhongList, setDatPhongList] = useState<DatPhong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDichVu, setSelectedDichVu] = useState<DichVu | null>(null);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [openDichVuForm, setOpenDichVuForm] = useState(false);
  const [deleteDichVuItem, setDeleteDichVuItem] = useState<DichVu | null>(null);
  const [deletingDichVu, setDeletingDichVu] = useState(false);
  const [reservationInput, setReservationInput] = useState("");
  const [activeDatPhongId, setActiveDatPhongId] = useState<number | null>(null);
  const [suDungDichVuList, setSuDungDichVuList] = useState<SuDungDichVu[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [deleteUsageItem, setDeleteUsageItem] = useState<SuDungDichVu | null>(null);
  const [deletingUsageId, setDeletingUsageId] = useState<number | null>(null);

  const usageRequestIdRef = useRef(0);
  const canManageDanhMuc = isAdmin(user);
  const canCreateUsage = isAdmin(user) || isNhanVien(user);
  const canDeleteUsage = isAdmin(user);
  const selectedDichVuId = selectedDichVu?.id ?? null;
  const deleteDichVuId = deleteDichVuItem?.id ?? null;
  const deleteUsageId = deleteUsageItem?.id ?? null;

  const loadModuleData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const [services, reservations] = await Promise.all([
        getDichVuList(),
        getDatPhongList(),
      ]);

      setDichVuList(sortDichVuList(services));
      setDatPhongList(sortDatPhongList(reservations));
      setError(null);
    } catch (loadError) {
      setError(normalizeMessage(loadError, "Không thể tải dữ liệu dịch vụ."));
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  const loadUsageByReservation = useCallback(async (datPhongId: number) => {
    const requestId = ++usageRequestIdRef.current;
    setUsageLoading(true);
    setUsageError(null);

    try {
      const items = await getSuDungDichVuByReservation(datPhongId);

      if (requestId !== usageRequestIdRef.current) {
        return;
      }

      setSuDungDichVuList(sortSuDungDichVuList(items));
      setUsageError(null);
    } catch (loadError) {
      if (requestId !== usageRequestIdRef.current) {
        return;
      }

      setSuDungDichVuList([]);
      setUsageError(mapSuDungDichVuError(loadError, "load"));
    } finally {
      if (requestId === usageRequestIdRef.current) {
        setUsageLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadModuleData();
  }, [loadModuleData]);

  useEffect(() => {
    if (selectedDichVuId === null) {
      return;
    }

    const latestItem =
      dichVuList.find((item) => item.id === selectedDichVuId) ?? null;

    if (!latestItem) {
      setSelectedDichVu(null);
      if (formMode === "edit") {
        setOpenDichVuForm(false);
      }
      return;
    }

    if (latestItem !== selectedDichVu) {
      setSelectedDichVu(latestItem);
    }
  }, [dichVuList, formMode, selectedDichVu, selectedDichVuId]);

  useEffect(() => {
    if (deleteDichVuId === null) {
      return;
    }

    const latestItem = dichVuList.find((item) => item.id === deleteDichVuId) ?? null;

    if (!latestItem) {
      setDeleteDichVuItem(null);
      return;
    }

    if (latestItem !== deleteDichVuItem) {
      setDeleteDichVuItem(latestItem);
    }
  }, [deleteDichVuId, deleteDichVuItem, dichVuList]);

  useEffect(() => {
    if (deleteUsageId === null) {
      return;
    }

    const latestItem =
      suDungDichVuList.find((item) => item.id === deleteUsageId) ?? null;

    if (!latestItem) {
      setDeleteUsageItem(null);
      return;
    }

    if (latestItem !== deleteUsageItem) {
      setDeleteUsageItem(latestItem);
    }
  }, [deleteUsageId, deleteUsageItem, suDungDichVuList]);

  const filteredDichVuList = useMemo(() => {
    return dichVuList.filter((item) => matchesDichVuSearch(item, searchQuery));
  }, [dichVuList, searchQuery]);

  const currentReservation = useMemo(
    () =>
      activeDatPhongId === null
        ? null
        : datPhongList.find((item) => item.datPhongId === activeDatPhongId) ?? null,
    [activeDatPhongId, datPhongList],
  );

  const reservationSummary = useMemo(
    () => getReservationSummary(currentReservation),
    [currentReservation],
  );
  const reservationUsageWarning = useMemo(
    () => getReservationUsageWarning(currentReservation),
    [currentReservation],
  );
  const currentReservationServiceTotal = useMemo(
    () =>
      suDungDichVuList.reduce(
        (total, item) => total + item.soLuong * item.giaTaiThoiDiem,
        0,
      ),
    [suDungDichVuList],
  );
  const stats = useMemo(() => {
    const highestPrice =
      dichVuList.length > 0
        ? Math.max(...dichVuList.map((item) => item.giaHienTai))
        : null;
    const averagePrice =
      dichVuList.length > 0
        ? Math.round(
            dichVuList.reduce((total, item) => total + item.giaHienTai, 0) /
              dichVuList.length,
          )
        : null;

    return {
      totalServices: dichVuList.length,
      highestPrice,
      averagePrice,
      loadedUsageCount: suDungDichVuList.length,
      loadedUsageTotal: currentReservationServiceTotal,
    };
  }, [currentReservationServiceTotal, dichVuList, suDungDichVuList.length]);

  const reservationSelectValue = useMemo(() => {
    if (!reservationInput) {
      return "";
    }

    return datPhongList.some((item) => String(item.datPhongId) === reservationInput)
      ? reservationInput
      : "";
  }, [datPhongList, reservationInput]);

  function handleCreateDichVuClick() {
    setFeedback(null);
    setSelectedDichVu(null);
    setFormMode("create");
    setOpenDichVuForm(true);
  }

  function handleEditDichVuClick(item: DichVu) {
    setFeedback(null);
    setSelectedDichVu(item);
    setFormMode("edit");
    setOpenDichVuForm(true);
  }

  async function handleDichVuSubmit(params: {
    mode: FormMode;
    payload: DichVuPayload;
    dichVuId?: number;
  }) {
    try {
      return params.mode === "create"
        ? await createDichVu(params.payload)
        : await updateDichVu(params.dichVuId ?? 0, params.payload);
    } catch (submitError) {
      throw new Error(mapDichVuError(submitError, "save"));
    }
  }

  async function handleDichVuSuccess(params: {
    item: DichVu | null;
    mode: FormMode;
  }) {
    setFeedback({
      type: "success",
      message:
        params.mode === "create"
          ? "Tạo dịch vụ thành công."
          : "Cập nhật dịch vụ thành công.",
    });

    if (params.item) {
      setDichVuList((currentList) => upsertDichVu(currentList, params.item!));
      setSelectedDichVu(params.item);
    }

    setOpenDichVuForm(false);

    try {
      await loadModuleData(false);
    } catch {
      return;
    }
  }

  async function handleDeleteDichVu() {
    if (!deleteDichVuItem) {
      return;
    }

    setDeletingDichVu(true);

    try {
      await deleteDichVu(deleteDichVuItem.id);

      setDichVuList((currentList) =>
        currentList.filter((item) => item.id !== deleteDichVuItem.id),
      );
      setDeleteDichVuItem(null);
      setFeedback({
        type: "success",
        message: "Xóa dịch vụ thành công.",
      });

      if (selectedDichVuId === deleteDichVuItem.id) {
        setSelectedDichVu(null);
        if (formMode === "edit") {
          setOpenDichVuForm(false);
        }
      }

      await loadModuleData(false);
    } catch (deleteError) {
      setFeedback({
        type: "error",
        message: mapDichVuError(deleteError, "delete"),
      });
    } finally {
      setDeletingDichVu(false);
    }
  }

  function parseReservationId(value: string) {
    const parsedValue = Number(value.trim());

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return null;
    }

    return parsedValue;
  }

  async function handleLoadReservationUsage() {
    setFeedback(null);

    const parsedReservationId = parseReservationId(reservationInput);

    if (parsedReservationId === null) {
      setActiveDatPhongId(null);
      setSuDungDichVuList([]);
      setUsageError("Vui lòng nhập DatPhong_ID hợp lệ.");
      return;
    }

    const matchedReservation =
      datPhongList.find((item) => item.datPhongId === parsedReservationId) ?? null;

    if (!matchedReservation) {
      setActiveDatPhongId(null);
      setSuDungDichVuList([]);
      setUsageError(`Không tìm thấy đơn đặt phòng #${parsedReservationId}.`);
      return;
    }

    setActiveDatPhongId(parsedReservationId);
    await loadUsageByReservation(parsedReservationId);
  }

  async function handleCreateUsage(payload: {
    datPhongId: number;
    dichVuId: number;
    soLuong: number;
  }) {
    try {
      const createdItem = await createSuDungDichVu(payload);

      if (createdItem) {
        setSuDungDichVuList((currentList) =>
          upsertSuDungDichVu(currentList, createdItem),
        );
      }

      setFeedback({
        type: "success",
        message: "Thêm sử dụng dịch vụ thành công.",
      });

      await loadUsageByReservation(payload.datPhongId);
    } catch (submitError) {
      throw new Error(mapSuDungDichVuError(submitError, "save"));
    }
  }

  async function handleDeleteUsage() {
    if (!deleteUsageItem || activeDatPhongId === null) {
      return;
    }

    setDeletingUsageId(deleteUsageItem.id);

    try {
      await deleteSuDungDichVu(deleteUsageItem.id);

      setSuDungDichVuList((currentList) =>
        currentList.filter((item) => item.id !== deleteUsageItem.id),
      );
      setDeleteUsageItem(null);
      setFeedback({
        type: "success",
        message: "Xóa sử dụng dịch vụ thành công.",
      });

      await loadUsageByReservation(activeDatPhongId);
    } catch (deleteError) {
      setFeedback({
        type: "error",
        message: mapSuDungDichVuError(deleteError, "delete"),
      });
    } finally {
      setDeletingUsageId(null);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        description="Quản lý danh mục dịch vụ và ghi nhận sử dụng dịch vụ theo đúng DatPhong_ID để đồng bộ chi phí với đặt phòng và hóa đơn."
        title="Quản lý dịch vụ"
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
          <p className="text-sm text-slate-500">Tổng dịch vụ</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {stats.totalServices}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Giá cao nhất</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {stats.highestPrice !== null
              ? formatCurrencyVND(stats.highestPrice)
              : "—"}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Giá trung bình</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {stats.averagePrice !== null
              ? formatCurrencyVND(stats.averagePrice)
              : "—"}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Lượt đang xem</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {stats.loadedUsageCount}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Tổng dịch vụ đặt phòng</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatCurrencyVND(stats.loadedUsageTotal)}
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Quản lý danh mục dịch vụ
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Admin có thể thêm, sửa, xóa danh mục dịch vụ. Nhân viên chỉ được xem
              danh sách để dùng khi ghi nhận phát sinh.
            </p>
          </div>
          {canManageDanhMuc ? (
            <Button onClick={handleCreateDichVuClick}>Thêm dịch vụ</Button>
          ) : (
            <Badge tone="default">Nhân viên chỉ được xem danh mục</Badge>
          )}
        </div>

        <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_260px]">
          <Input
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Tìm theo tên dịch vụ"
            value={searchQuery}
          />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Kết quả hiển thị:{" "}
            <span className="font-semibold text-slate-900">
              {filteredDichVuList.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Đang tải danh mục dịch vụ...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            {error}
          </div>
        ) : (
          <DichVuTable
            canManage={canManageDanhMuc}
            items={filteredDichVuList}
            onDelete={(item) => setDeleteDichVuItem(item)}
            onEdit={handleEditDichVuClick}
          />
        )}
      </div>

      <div className="space-y-4 rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Sử dụng dịch vụ theo đặt phòng
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Chọn đúng DatPhong_ID để xem lịch sử dịch vụ, ghi nhận phát sinh mới và
            sẵn sàng đồng bộ tổng tiền cho hóa đơn.
          </p>
        </div>

        <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm xl:grid-cols-[220px_minmax(0,1fr)_auto_auto]">
          <Input
            inputMode="numeric"
            onChange={(event) => setReservationInput(event.target.value)}
            placeholder="Nhập DatPhong_ID"
            value={reservationInput}
          />
          <Select
            onChange={(event) => setReservationInput(event.target.value)}
            value={reservationSelectValue}
          >
            <option value="">Chọn nhanh từ danh sách đặt phòng</option>
            {datPhongList.map((item) => (
              <option key={item.datPhongId} value={item.datPhongId}>
                #{item.datPhongId} - Phòng {item.soPhong} -{" "}
                {item.tenKhachHang ?? item.khachHang?.hoTen ?? "Chưa cập nhật"}
              </option>
            ))}
          </Select>
          <Button
            disabled={loading}
            onClick={() => {
              void handleLoadReservationUsage();
            }}
            variant="secondary"
          >
            {usageLoading ? "Đang tải..." : "Tải lịch sử"}
          </Button>
          <Button
            disabled={activeDatPhongId === null || usageLoading}
            onClick={() => {
              if (activeDatPhongId !== null) {
                void loadUsageByReservation(activeDatPhongId);
              }
            }}
            variant="ghost"
          >
            Làm mới
          </Button>
        </div>

        <div className="grid gap-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Đặt phòng đang chọn
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">
                  {reservationSummary
                    ? `Đơn #${reservationSummary.datPhongId}`
                    : "Chưa chọn đặt phòng"}
                </h3>
              </div>
              {reservationSummary ? (
                <Badge tone={getTrangThaiDatPhongTone(reservationSummary.trangThai)}>
                  {getTrangThaiDatPhongLabel(reservationSummary.trangThai)}
                </Badge>
              ) : null}
            </div>

            {reservationSummary ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-400">DatPhong_ID</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {reservationSummary.datPhongId}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-400">Khách hàng</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {reservationSummary.tenKhachHang}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-400">Phòng</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {reservationSummary.soPhong}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Nhập hoặc chọn DatPhong_ID để tải lịch sử sử dụng dịch vụ.
              </p>
            )}

            {usageError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {usageError}
              </div>
            ) : null}

            {!usageError && reservationUsageWarning ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {reservationUsageWarning}
              </div>
            ) : null}
          </div>
        </div>

        <SuDungDichVuForm
          datPhongId={activeDatPhongId}
          dichVuOptions={dichVuList}
          disabledReason={
            !canCreateUsage
              ? "Tài khoản hiện tại không có quyền thêm sử dụng dịch vụ."
              : reservationUsageWarning
          }
          onSubmit={handleCreateUsage}
        />

        {usageLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Đang tải lịch sử sử dụng dịch vụ...
          </div>
        ) : activeDatPhongId === null ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600 shadow-sm">
            Chọn một DatPhong_ID hợp lệ để xem lịch sử sử dụng dịch vụ.
          </div>
        ) : (
          <SuDungDichVuTable
            canDelete={canDeleteUsage}
            deletingId={deletingUsageId}
            dichVuList={dichVuList}
            items={suDungDichVuList}
            onDelete={(item) => setDeleteUsageItem(item)}
          />
        )}
      </div>

      <DichVuForm
        initialData={formMode === "edit" ? selectedDichVu : null}
        mode={formMode}
        onClose={() => setOpenDichVuForm(false)}
        onSubmit={handleDichVuSubmit}
        onSuccess={handleDichVuSuccess}
        open={openDichVuForm}
      />

      <ConfirmDialog
        confirmLabel="Xóa dịch vụ"
        description={
          deleteDichVuItem
            ? `Bạn có chắc muốn xóa dịch vụ "${deleteDichVuItem.tenDichVu}"?`
            : ""
        }
        isLoading={deletingDichVu}
        isOpen={Boolean(deleteDichVuItem)}
        onClose={() => setDeleteDichVuItem(null)}
        onConfirm={handleDeleteDichVu}
        title="Xác nhận xóa dịch vụ"
      />

      <ConfirmDialog
        confirmLabel="Xóa bản ghi"
        description={
          deleteUsageItem
            ? `Bạn có chắc muốn xóa bản ghi sử dụng dịch vụ #${deleteUsageItem.id}?`
            : ""
        }
        isLoading={deletingUsageId === deleteUsageId}
        isOpen={Boolean(deleteUsageItem)}
        onClose={() => setDeleteUsageItem(null)}
        onConfirm={handleDeleteUsage}
        title="Xác nhận xóa sử dụng dịch vụ"
      />
    </section>
  );
}
