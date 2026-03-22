"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { DatPhongDetail } from "@/components/dat-phong-detail";
import { DatPhongForm } from "@/components/dat-phong-form";
import {
  DatPhongStatusAction,
  type DatPhongStatusActionType,
} from "@/components/dat-phong-status-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { useAuthUser } from "@/hooks/use-auth-user";
import {
  mapDatPhongErrorMessage,
  normalizeDatPhongDateInput,
} from "@/lib/dat-phong";
import {
  canDeleteBookings,
  canManageBookings,
  formatDateTimeVN,
  getPhongGiaThamKhao,
} from "@/lib/hotel";
import { getKhachHangList } from "@/services/khach-hang";
import { getPhongList } from "@/services/phong";
import {
  cancelDatPhong,
  checkAvailability,
  checkInDatPhong,
  checkOutDatPhong,
  createDatPhong,
  deleteDatPhong,
  getDatPhongList,
  updateDatPhong,
} from "@/services/dat-phong";
import type { KhachHang } from "@/types/khach-hang";
import type { Phong } from "@/types/phong";
import {
  TRANG_THAI_DAT_PHONG_OPTIONS,
  getTrangThaiDatPhongLabel,
  getTrangThaiDatPhongTone,
  type AvailablePhong,
  type DatPhong,
  type DatPhongPayload,
  type TrangThaiDatPhong,
} from "@/types/dat-phong";

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

type FormMode = "create" | "edit";

type DatPhongFilters = {
  trangThai: "all" | TrangThaiDatPhong;
  ngayNhanFrom: string;
  ngayTraTo: string;
};

function mapDatPhongError(error: unknown) {
  return mapDatPhongErrorMessage(error, "Có lỗi xảy ra, vui lòng thử lại.");
}

function enrichAvailableRooms(
  availableRooms: AvailablePhong[],
  phongList: Phong[],
) {
  const phongMap = new Map(phongList.map((item) => [item.soPhong, item]));

  return availableRooms.map((item) => {
    const matchedPhong = phongMap.get(item.soPhong);

    return {
      ...item,
      loaiPhongId: item.loaiPhongId ?? matchedPhong?.loaiPhongId,
      tenLoaiPhong:
        item.tenLoaiPhong ??
        matchedPhong?.tenLoaiPhong ??
        matchedPhong?.loaiPhong?.tenLoaiPhong,
      trangThai: item.trangThai ?? matchedPhong?.trangThai,
      giaThamKhao: item.giaThamKhao ?? getPhongGiaThamKhao(matchedPhong) ?? undefined,
    };
  });
}

function enrichDatPhongRelations(
  datPhongList: DatPhong[],
  khachHangList: KhachHang[],
  phongList: Phong[],
) {
  const khachHangMap = new Map(
    khachHangList.map((item) => [item.khachHangId, item]),
  );
  const phongMap = new Map(phongList.map((item) => [item.soPhong, item]));

  return datPhongList.map((item) => {
    const matchedKhachHang = khachHangMap.get(item.khachHangId);
    const matchedPhong = phongMap.get(item.soPhong);

    return {
      ...item,
      khachHang:
        item.khachHang ??
        (matchedKhachHang
          ? {
              khachHangId: matchedKhachHang.khachHangId,
              hoTen: matchedKhachHang.hoTen,
              cccd: matchedKhachHang.cccd || undefined,
              thongTinLienHe: matchedKhachHang.thongTinLienHe || undefined,
            }
          : null),
      phong:
        item.phong ??
        (matchedPhong
          ? {
              soPhong: matchedPhong.soPhong,
              loaiPhongId: matchedPhong.loaiPhongId,
              tenLoaiPhong:
                matchedPhong.tenLoaiPhong ?? matchedPhong.loaiPhong?.tenLoaiPhong,
              trangThai: matchedPhong.trangThai,
            }
          : null),
      tenKhachHang: item.tenKhachHang ?? matchedKhachHang?.hoTen,
      tenLoaiPhong:
        item.tenLoaiPhong ??
        matchedPhong?.tenLoaiPhong ??
        matchedPhong?.loaiPhong?.tenLoaiPhong,
    };
  });
}

function upsertDatPhong(currentList: DatPhong[], nextItem: DatPhong) {
  const existed = currentList.some(
    (item) => item.datPhongId === nextItem.datPhongId,
  );

  if (!existed) {
    return [nextItem, ...currentList];
  }

  return currentList.map((item) =>
    item.datPhongId === nextItem.datPhongId ? nextItem : item,
  );
}

function matchesSearchQuery(item: DatPhong, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [
    item.tenKhachHang ?? item.khachHang?.hoTen ?? "",
    item.khachHang?.cccd ?? "",
    item.khachHang?.thongTinLienHe ?? "",
    item.soPhong,
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

function isDateGreaterOrEqual(value: string, compareWith: string) {
  const currentDate = new Date(value);
  const compareDate = new Date(compareWith);

  if (Number.isNaN(currentDate.getTime()) || Number.isNaN(compareDate.getTime())) {
    return true;
  }

  return currentDate.getTime() >= compareDate.getTime();
}

function isDateLessOrEqual(value: string, compareWith: string) {
  const currentDate = new Date(value);
  const compareDate = new Date(compareWith);

  if (Number.isNaN(currentDate.getTime()) || Number.isNaN(compareDate.getTime())) {
    return true;
  }

  return currentDate.getTime() <= compareDate.getTime();
}

function isDateRangeOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
) {
  const firstStartDate = new Date(firstStart);
  const firstEndDate = new Date(firstEnd);
  const secondStartDate = new Date(secondStart);
  const secondEndDate = new Date(secondEnd);

  if (
    Number.isNaN(firstStartDate.getTime()) ||
    Number.isNaN(firstEndDate.getTime()) ||
    Number.isNaN(secondStartDate.getTime()) ||
    Number.isNaN(secondEndDate.getTime())
  ) {
    return false;
  }

  return (
    firstStartDate.getTime() < secondEndDate.getTime() &&
    secondStartDate.getTime() < firstEndDate.getTime()
  );
}

function deriveAvailableRoomsLocally(params: {
  ngayNhanPhong: string;
  ngayTraPhong: string;
  phongList: Phong[];
  datPhongList: DatPhong[];
  ignoreDatPhongId?: number;
}) {
  const activeBookingStatuses: TrangThaiDatPhong[] = ["DatTruoc", "DaNhanPhong"];
  const occupiedRoomSet = new Set(
    params.datPhongList
      .filter((booking) => {
        if (params.ignoreDatPhongId && booking.datPhongId === params.ignoreDatPhongId) {
          return false;
        }

        if (!activeBookingStatuses.includes(booking.trangThai)) {
          return false;
        }

        return isDateRangeOverlap(
          normalizeDatPhongDateInput(booking.ngayNhanPhong),
          normalizeDatPhongDateInput(booking.ngayTraPhong),
          params.ngayNhanPhong,
          params.ngayTraPhong,
        );
      })
      .map((booking) => booking.soPhong),
  );

  return params.phongList
    .filter((room) => room.trangThai !== "BaoTri")
    .filter((room) => !occupiedRoomSet.has(room.soPhong))
    .map((room) => ({
      soPhong: room.soPhong,
      loaiPhongId: room.loaiPhongId,
      tenLoaiPhong: room.tenLoaiPhong ?? room.loaiPhong?.tenLoaiPhong,
      trangThai: room.trangThai,
      giaThamKhao: getPhongGiaThamKhao(room) ?? undefined,
    }));
}

export default function DatPhongPage() {
  const user = useAuthUser();
  const [datPhongList, setDatPhongList] = useState<DatPhong[]>([]);
  const [khachHangList, setKhachHangList] = useState<KhachHang[]>([]);
  const [phongList, setPhongList] = useState<Phong[]>([]);
  const [availableRooms, setAvailableRooms] = useState<AvailablePhong[]>([]);
  const [availabilityQuery, setAvailabilityQuery] = useState<{
    ngayNhanPhong: string;
    ngayTraPhong: string;
  } | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<DatPhongFilters>({
    trangThai: "all",
    ngayNhanFrom: "",
    ngayTraTo: "",
  });
  const [selectedDatPhong, setSelectedDatPhong] = useState<DatPhong | null>(null);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [openForm, setOpenForm] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [deleteItem, setDeleteItem] = useState<DatPhong | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusActionLoading, setStatusActionLoading] = useState<{
    datPhongId: number;
    action: DatPhongStatusActionType;
  } | null>(null);

  const canManage = canManageBookings(user);
  const canDelete = canDeleteBookings(user);
  const selectedDatPhongId = selectedDatPhong?.datPhongId ?? null;
  const deleteDatPhongId = deleteItem?.datPhongId ?? null;

  const loadDatPhongModuleData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const [bookings, customers, rooms] = await Promise.all([
        getDatPhongList(),
        getKhachHangList(),
        getPhongList(),
      ]);

      setKhachHangList(customers);
      setPhongList(rooms);
      setDatPhongList(enrichDatPhongRelations(bookings, customers, rooms));
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải dữ liệu đặt phòng.",
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadDatPhongModuleData();
  }, [loadDatPhongModuleData]);

  useEffect(() => {
    if (selectedDatPhongId === null) {
      return;
    }

    const latestItem =
      datPhongList.find((item) => item.datPhongId === selectedDatPhongId) ?? null;

    if (!latestItem) {
      setSelectedDatPhong(null);
      setOpenDetail(false);
      if (formMode === "edit") {
        setOpenForm(false);
      }
      return;
    }

    if (latestItem !== selectedDatPhong) {
      setSelectedDatPhong(latestItem);
    }
  }, [datPhongList, formMode, selectedDatPhong, selectedDatPhongId]);

  useEffect(() => {
    if (deleteDatPhongId === null) {
      return;
    }

    const latestItem =
      datPhongList.find((item) => item.datPhongId === deleteDatPhongId) ?? null;

    if (!latestItem) {
      setDeleteItem(null);
      return;
    }

    if (latestItem !== deleteItem) {
      setDeleteItem(latestItem);
    }
  }, [datPhongList, deleteItem, deleteDatPhongId]);

  const filteredDatPhongList = useMemo(() => {
    return datPhongList.filter((item) => {
      const matchSearch = matchesSearchQuery(item, searchQuery);
      const matchStatus =
        filters.trangThai === "all" || item.trangThai === filters.trangThai;
      const matchNgayNhan =
        !filters.ngayNhanFrom ||
        isDateGreaterOrEqual(item.ngayNhanPhong, filters.ngayNhanFrom);
      const matchNgayTra =
        !filters.ngayTraTo || isDateLessOrEqual(item.ngayTraPhong, filters.ngayTraTo);

      return matchSearch && matchStatus && matchNgayNhan && matchNgayTra;
    });
  }, [datPhongList, filters.ngayNhanFrom, filters.ngayTraTo, filters.trangThai, searchQuery]);

  const stats = useMemo(() => {
    const countByStatus = (status: TrangThaiDatPhong) =>
      datPhongList.filter((item) => item.trangThai === status).length;

    return {
      total: datPhongList.length,
      datTruoc: countByStatus("DatTruoc"),
      daNhanPhong: countByStatus("DaNhanPhong"),
      daTraPhong: countByStatus("DaTraPhong"),
      daHuy: countByStatus("DaHuy"),
    };
  }, [datPhongList]);

  function handleCreateClick() {
    setFeedback(null);
    setSelectedDatPhong(null);
    setFormMode("create");
    setAvailableRooms([]);
    setAvailabilityQuery(null);
    setOpenForm(true);

    if (phongList.length === 0) {
      void getPhongList()
        .then((rooms) => {
          setPhongList(rooms);
        })
        .catch(() => undefined);
    }
  }

  function handleEditClick(item: DatPhong) {
    setFeedback(null);
    setSelectedDatPhong(item);
    setFormMode("edit");
    setAvailableRooms(
      enrichAvailableRooms(
        [
          {
            soPhong: item.soPhong,
            loaiPhongId: item.phong?.loaiPhongId,
            tenLoaiPhong: item.tenLoaiPhong ?? item.phong?.tenLoaiPhong,
            giaThamKhao:
              getPhongGiaThamKhao(
                phongList.find((room) => room.soPhong === item.soPhong),
              ) ?? undefined,
          },
        ],
        phongList,
      ),
    );
    setAvailabilityQuery({
      ngayNhanPhong: normalizeDatPhongDateInput(item.ngayNhanPhong),
      ngayTraPhong: normalizeDatPhongDateInput(item.ngayTraPhong),
    });
    setOpenForm(true);
  }

  function handleOpenDetail(item: DatPhong) {
    setSelectedDatPhong(item);
    setOpenDetail(true);
  }

  function handleFormDateChange(params: {
    ngayNhanPhong: string;
    ngayTraPhong: string;
  }) {
    if (
      availabilityQuery?.ngayNhanPhong === params.ngayNhanPhong &&
      availabilityQuery?.ngayTraPhong === params.ngayTraPhong
    ) {
      return;
    }

    setAvailabilityQuery(null);
    setAvailableRooms([]);
  }

  async function handleCheckAvailability(params: {
    ngayNhanPhong: string;
    ngayTraPhong: string;
  }) {
    setAvailabilityLoading(true);
    let latestPhongList = phongList;

    if (latestPhongList.length === 0) {
      try {
        latestPhongList = await getPhongList();
        setPhongList(latestPhongList);
      } catch {
        latestPhongList = phongList;
      }
    }

    const fallbackRooms = deriveAvailableRoomsLocally({
      ngayNhanPhong: params.ngayNhanPhong,
      ngayTraPhong: params.ngayTraPhong,
      phongList: latestPhongList,
      datPhongList,
      ignoreDatPhongId:
        formMode === "edit" ? selectedDatPhong?.datPhongId : undefined,
    });

    try {
      const rooms = await checkAvailability(params);
      const enrichedRooms = enrichAvailableRooms(
        rooms.length > 0 ? rooms : fallbackRooms,
        latestPhongList,
      );
      const softFallbackRooms =
        enrichedRooms.length > 0
          ? enrichedRooms
          : enrichAvailableRooms(
              latestPhongList
                .filter((room) => room.trangThai !== "BaoTri")
                .map((room) => ({
                  soPhong: room.soPhong,
                  loaiPhongId: room.loaiPhongId,
                  tenLoaiPhong: room.tenLoaiPhong ?? room.loaiPhong?.tenLoaiPhong,
                  trangThai: room.trangThai,
                  giaThamKhao: getPhongGiaThamKhao(room) ?? undefined,
                })),
              latestPhongList,
            );

      setAvailableRooms(softFallbackRooms);
      setAvailabilityQuery(params);

      return softFallbackRooms;
    } catch (availabilityError) {
      if (fallbackRooms.length > 0) {
        const enrichedFallbackRooms = enrichAvailableRooms(
          fallbackRooms,
          latestPhongList,
        );

        setAvailableRooms(enrichedFallbackRooms);
        setAvailabilityQuery(params);
        setFeedback({
          type: "error",
          message: `${mapDatPhongError(
            availabilityError,
          )} Đã dùng danh sách phòng dự phòng để tiếp tục thao tác.`,
        });

        return enrichedFallbackRooms;
      }

      if (latestPhongList.length > 0) {
        const softFallbackRooms = enrichAvailableRooms(
          latestPhongList
            .filter((room) => room.trangThai !== "BaoTri")
            .map((room) => ({
              soPhong: room.soPhong,
              loaiPhongId: room.loaiPhongId,
              tenLoaiPhong: room.tenLoaiPhong ?? room.loaiPhong?.tenLoaiPhong,
              trangThai: room.trangThai,
              giaThamKhao: getPhongGiaThamKhao(room) ?? undefined,
            })),
          latestPhongList,
        );

        if (softFallbackRooms.length > 0) {
          setAvailableRooms(softFallbackRooms);
          setAvailabilityQuery(params);
          setFeedback({
            type: "error",
            message: `${mapDatPhongError(
              availabilityError,
            )} Đã hiển thị danh sách phòng khả dụng tạm thời để bạn tiếp tục.`,
          });

          return softFallbackRooms;
        }
      }

      throw new Error(mapDatPhongError(availabilityError));
    } finally {
      setAvailabilityLoading(false);
    }
  }

  async function handleFormSubmit(params: {
    mode: FormMode;
    payload: DatPhongPayload;
    datPhongId?: number;
  }) {
    try {
      const responseItem =
        params.mode === "create"
          ? await createDatPhong(params.payload)
          : await updateDatPhong(params.datPhongId ?? 0, params.payload);

      if (!responseItem) {
        return null;
      }

      return enrichDatPhongRelations([responseItem], khachHangList, phongList)[0] ?? null;
    } catch (submitError) {
      throw new Error(mapDatPhongError(submitError));
    }
  }

  async function handleFormSuccess({
    item,
    mode,
  }: {
    item: DatPhong | null;
    mode: FormMode;
  }) {
    setFeedback({
      type: "success",
      message:
        mode === "create"
          ? "Tạo đặt phòng thành công."
          : "Cập nhật đặt phòng thành công.",
    });

    if (item) {
      setDatPhongList((currentList) => upsertDatPhong(currentList, item));
      setSelectedDatPhong(item);
    }

    setAvailableRooms([]);
    setAvailabilityQuery(null);

    try {
      await loadDatPhongModuleData(false);
    } catch {
      return;
    }
  }

  async function runStatusAction(
    action: DatPhongStatusActionType,
    datPhongId: number,
  ) {
    setStatusActionLoading({ datPhongId, action });

    try {
      const responseItem =
        action === "checkIn"
          ? await checkInDatPhong(datPhongId)
          : action === "checkOut"
            ? await checkOutDatPhong(datPhongId)
            : await cancelDatPhong(datPhongId);

      if (!responseItem) {
        return null;
      }

      return (
        enrichDatPhongRelations([responseItem], khachHangList, phongList)[0] ?? null
      );
    } catch (statusError) {
      throw new Error(mapDatPhongError(statusError));
    } finally {
      setStatusActionLoading(null);
    }
  }

  async function handleStatusSuccess({
    action,
    item,
  }: {
    action: DatPhongStatusActionType;
    item: DatPhong | null;
  }) {
    const messageByAction: Record<DatPhongStatusActionType, string> = {
      checkIn: "Check-in thành công.",
      checkOut: "Check-out thành công.",
      cancel: "Hủy đặt phòng thành công.",
    };

    setFeedback({
      type: "success",
      message: messageByAction[action],
    });

    if (item) {
      setDatPhongList((currentList) => upsertDatPhong(currentList, item));
      setSelectedDatPhong(item);
    }

    try {
      await loadDatPhongModuleData(false);
    } catch {
      return;
    }
  }

  function handleStatusError(statusError: unknown) {
    setFeedback({
      type: "error",
      message: mapDatPhongError(statusError),
    });
  }

  async function handleDelete() {
    if (!deleteItem) {
      return;
    }

    setDeleting(true);

    try {
      await deleteDatPhong(deleteItem.datPhongId);

      setDatPhongList((currentList) =>
        currentList.filter((item) => item.datPhongId !== deleteItem.datPhongId),
      );
      setFeedback({
        type: "success",
        message: "Xóa đặt phòng thành công.",
      });
      setDeleteItem(null);

      if (selectedDatPhongId === deleteItem.datPhongId) {
        setSelectedDatPhong(null);
        setOpenDetail(false);
        if (formMode === "edit") {
          setOpenForm(false);
        }
      }

      await loadDatPhongModuleData(false);
    } catch (deleteError) {
      setFeedback({
        type: "error",
        message: mapDatPhongError(deleteError),
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
            <Button onClick={handleCreateClick}>Tạo đặt phòng</Button>
          ) : undefined
        }
        description="Quản lý vòng đời đặt phòng, kiểm tra phòng trống, check-in, check-out và hủy đơn."
        title="Quản lý đặt phòng"
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
          <p className="text-sm text-slate-500">Tổng số đơn</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Đặt trước</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {stats.datTruoc}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Đã nhận phòng</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {stats.daNhanPhong}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Đã trả phòng</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {stats.daTraPhong}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Đã hủy</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{stats.daHuy}</p>
        </div>
      </div>

      <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm xl:grid-cols-[minmax(0,1fr)_220px_200px_200px]">
        <Input
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Tìm theo khách hàng, CCCD hoặc số phòng"
          value={searchQuery}
        />
        <Select
          onChange={(event) =>
            setFilters((currentFilters) => ({
              ...currentFilters,
              trangThai: event.target.value as DatPhongFilters["trangThai"],
            }))
          }
          value={filters.trangThai}
        >
          <option value="all">Tất cả trạng thái</option>
          {TRANG_THAI_DAT_PHONG_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {getTrangThaiDatPhongLabel(item)}
            </option>
          ))}
        </Select>
        <Input
          onChange={(event) =>
            setFilters((currentFilters) => ({
              ...currentFilters,
              ngayNhanFrom: event.target.value,
            }))
          }
          type="date"
          value={filters.ngayNhanFrom}
        />
        <Input
          onChange={(event) =>
            setFilters((currentFilters) => ({
              ...currentFilters,
              ngayTraTo: event.target.value,
            }))
          }
          type="date"
          value={filters.ngayTraTo}
        />
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Đang tải dữ liệu đặt phòng...
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error}
        </div>
      ) : filteredDatPhongList.length === 0 ? (
        <EmptyState
          description={
            datPhongList.length === 0
              ? "Chưa có đơn đặt phòng nào. Hãy tạo đơn đầu tiên để bắt đầu."
              : "Không tìm thấy đơn đặt phòng phù hợp với bộ lọc hiện tại."
          }
          title={
            datPhongList.length === 0
              ? "Danh sách đặt phòng đang trống"
              : "Không có kết quả phù hợp"
          }
        />
      ) : (
        <DataTable
          head={
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">ID</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Khách hàng
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Số phòng
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Loại phòng
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Ngày nhận
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Ngày trả
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Trạng thái
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">
                Hành động
              </th>
            </tr>
          }
        >
          {filteredDatPhongList.map((item) => (
            <tr key={item.datPhongId} className="bg-white">
              <td className="px-4 py-4 text-slate-900">{item.datPhongId}</td>
              <td className="px-4 py-4 text-slate-900">
                {item.tenKhachHang ?? item.khachHang?.hoTen ?? "Chưa cập nhật"}
              </td>
              <td className="px-4 py-4 text-slate-900">{item.soPhong}</td>
              <td className="px-4 py-4 text-slate-900">
                {item.tenLoaiPhong ?? item.phong?.tenLoaiPhong ?? "Chưa cập nhật"}
              </td>
              <td className="px-4 py-4 text-slate-900">
                {formatDateTimeVN(item.ngayNhanPhong)}
              </td>
              <td className="px-4 py-4 text-slate-900">
                {formatDateTimeVN(item.ngayTraPhong)}
              </td>
              <td className="px-4 py-4">
                <Badge tone={getTrangThaiDatPhongTone(item.trangThai)}>
                  {getTrangThaiDatPhongLabel(item.trangThai)}
                </Badge>
              </td>
              <td className="px-4 py-4">
                <div className="flex flex-wrap justify-end gap-2">
                  <Button onClick={() => handleOpenDetail(item)} variant="ghost">
                    Xem chi tiết
                  </Button>
                  {canManage && item.trangThai === "DatTruoc" ? (
                    <Button
                      onClick={() => handleEditClick(item)}
                      variant="secondary"
                    >
                      Sửa
                    </Button>
                  ) : null}

                  <DatPhongStatusAction
                    canManage={canManage}
                    datPhong={item}
                    loadingAction={statusActionLoading}
                    onCancel={(id) => runStatusAction("cancel", id)}
                    onCheckIn={(id) => runStatusAction("checkIn", id)}
                    onCheckOut={(id) => runStatusAction("checkOut", id)}
                    onError={handleStatusError}
                    onSuccess={handleStatusSuccess}
                  />

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

      <DatPhongForm
        availabilityLoading={availabilityLoading}
        availabilityQuery={availabilityQuery}
        availableRooms={availableRooms}
        initialData={formMode === "edit" ? selectedDatPhong : null}
        khachHangOptions={khachHangList}
        mode={formMode}
        onCheckAvailability={handleCheckAvailability}
        onClose={() => {
          setOpenForm(false);
          setAvailableRooms([]);
          setAvailabilityQuery(null);
        }}
        onDateChange={handleFormDateChange}
        onSubmit={handleFormSubmit}
        onSuccess={handleFormSuccess}
        open={openForm}
        phongOptions={phongList}
      />

      <DatPhongDetail
        item={selectedDatPhong}
        onClose={() => setOpenDetail(false)}
        open={openDetail}
      />

      <ConfirmDialog
        confirmLabel="Xóa đặt phòng"
        description={
          deleteItem
            ? `Bạn có chắc muốn xóa đặt phòng #${deleteItem.datPhongId}?`
            : ""
        }
        isLoading={deleting}
        isOpen={Boolean(deleteItem)}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Xác nhận xóa đặt phòng"
      />
    </section>
  );
}



