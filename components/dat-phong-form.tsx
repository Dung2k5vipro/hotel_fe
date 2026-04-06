"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  isDatPhongDateRangeValid,
  mapDatPhongErrorMessage,
  normalizeDatPhongDateInput,
  validateDatPhongFormInput,
} from "@/lib/dat-phong";
import { getPhongGiaThamKhao } from "@/lib/hotel";
import type { KhachHang } from "@/types/khach-hang";
import type { Phong } from "@/types/phong";
import {
  TRANG_THAI_DAT_PHONG_OPTIONS,
  getTrangThaiDatPhongLabel,
  type AvailablePhong,
  type DatPhong,
  type DatPhongPayload,
  type TrangThaiDatPhong,
} from "@/types/dat-phong";

type FormMode = "create" | "edit";

type DatPhongFormProps = {
  open: boolean;
  mode: FormMode;
  initialData?: DatPhong | null;
  khachHangOptions: KhachHang[];
  phongOptions: Phong[];
  availableRooms: AvailablePhong[];
  availabilityQuery: {
    ngayNhanPhong: string;
    ngayTraPhong: string;
  } | null;
  availabilityLoading: boolean;
  onCheckAvailability: (params: {
    ngayNhanPhong: string;
    ngayTraPhong: string;
  }) => Promise<AvailablePhong[]>;
  onDateChange: (params: { ngayNhanPhong: string; ngayTraPhong: string }) => void;
  onSubmit: (params: {
    mode: FormMode;
    payload: DatPhongPayload;
    datPhongId?: number;
  }) => Promise<DatPhong | null>;
  onClose: () => void;
  onSuccess: (result: {
    mode: FormMode;
    item: DatPhong | null;
  }) => Promise<void> | void;
};

function formatCurrencyVnd(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(value)} VND`;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getDefaultNgayNhanPhongValue() {
  const now = new Date();
  const checkIn = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    14,
    0,
    0,
    0,
  );

  return formatDateTimeLocalValue(checkIn);
}

function getDefaultNgayTraPhongValue(ngayNhanPhongValue: string) {
  const checkInDate = new Date(ngayNhanPhongValue);
  const fallbackDate = new Date();
  const baseDate = Number.isNaN(checkInDate.getTime()) ? fallbackDate : checkInDate;
  const checkOut = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate() + 1,
    12,
    0,
    0,
    0,
  );

  return formatDateTimeLocalValue(checkOut);
}

export function DatPhongForm({
  open,
  mode,
  initialData,
  khachHangOptions,
  phongOptions,
  availableRooms,
  availabilityQuery,
  availabilityLoading,
  onCheckAvailability,
  onDateChange,
  onSubmit,
  onClose,
  onSuccess,
}: DatPhongFormProps) {
  const [khachHangId, setKhachHangId] = useState("");
  const [soPhong, setSoPhong] = useState("");
  const [soNguoi, setSoNguoi] = useState("1");
  const [ngayNhanPhong, setNgayNhanPhong] = useState("");
  const [ngayTraPhong, setNgayTraPhong] = useState("");
  const [trangThai, setTrangThai] = useState<TrangThaiDatPhong>("DatTruoc");
  const [searchKhachHang, setSearchKhachHang] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phongMap = useMemo(
    () => new Map(phongOptions.map((item) => [item.soPhong, item])),
    [phongOptions],
  );

  const filteredKhachHangOptions = useMemo(() => {
    const normalizedSearch = searchKhachHang.trim().toLowerCase();

    if (!normalizedSearch) {
      return khachHangOptions;
    }

    return khachHangOptions.filter((item) =>
      [item.hoTen, item.cccd, item.thongTinLienHe]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [khachHangOptions, searchKhachHang]);

  const fallbackRoomOptions = useMemo(() => {
    return phongOptions
      .filter((item) => item.trangThai !== "BaoTri")
      .map((item) => ({
        soPhong: item.soPhong,
        loaiPhongId: item.loaiPhongId,
        tenLoaiPhong: item.tenLoaiPhong ?? item.loaiPhong?.tenLoaiPhong,
        trangThai: item.trangThai,
        giaThamKhao: getPhongGiaThamKhao(item) ?? undefined,
      }));
  }, [phongOptions]);

  const roomSelectOptions = useMemo(() => {
    if (availableRooms.length > 0) {
      return availableRooms;
    }

    if (mode === "edit" && initialData?.soPhong) {
      return [
        {
          soPhong: initialData.soPhong,
          loaiPhongId: initialData.phong?.loaiPhongId,
          tenLoaiPhong:
            initialData.tenLoaiPhong ??
            initialData.phong?.tenLoaiPhong ??
            phongMap.get(initialData.soPhong)?.tenLoaiPhong,
          giaThamKhao:
            getPhongGiaThamKhao(phongMap.get(initialData.soPhong)) ?? undefined,
        },
      ];
    }

    if (availabilityQuery && fallbackRoomOptions.length > 0) {
      return fallbackRoomOptions;
    }

    return [] as AvailablePhong[];
  }, [
    availabilityQuery,
    availableRooms,
    fallbackRoomOptions,
    initialData,
    mode,
    phongMap,
  ]);

  const giaThamKhao = useMemo(() => {
    if (!soPhong) {
      return null;
    }

    const fromOptions = roomSelectOptions.find(
      (item) => item.soPhong === soPhong,
    )?.giaThamKhao;

    if (typeof fromOptions === "number" && Number.isFinite(fromOptions)) {
      return fromOptions;
    }

    const fromPhong = getPhongGiaThamKhao(phongMap.get(soPhong));

    if (typeof fromPhong === "number" && Number.isFinite(fromPhong)) {
      return fromPhong;
    }

    return null;
  }, [phongMap, roomSelectOptions, soPhong]);

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setError(null);
      return;
    }

    if (mode === "edit" && initialData) {
      setKhachHangId(String(initialData.khachHangId));
      setSoPhong(initialData.soPhong);
      setSoNguoi(String(initialData.soNguoi));
      setNgayNhanPhong(normalizeDatPhongDateInput(initialData.ngayNhanPhong));
      setNgayTraPhong(normalizeDatPhongDateInput(initialData.ngayTraPhong));
      setTrangThai(initialData.trangThai);
    } else {
      const defaultNgayNhanPhong = getDefaultNgayNhanPhongValue();
      const defaultNgayTraPhong = getDefaultNgayTraPhongValue(defaultNgayNhanPhong);

      setKhachHangId("");
      setSoPhong("");
      setSoNguoi("1");
      setNgayNhanPhong(defaultNgayNhanPhong);
      setNgayTraPhong(defaultNgayTraPhong);
      setTrangThai("DatTruoc");
    }

    setSearchKhachHang("");
    setError(null);
  }, [initialData, mode, open]);

  function handleNgayNhanPhongChange(value: string) {
    setNgayNhanPhong(value);
    setSoPhong("");
    onDateChange({
      ngayNhanPhong: value,
      ngayTraPhong,
    });
  }

  function handleNgayTraPhongChange(value: string) {
    setNgayTraPhong(value);
    setSoPhong("");
    onDateChange({
      ngayNhanPhong,
      ngayTraPhong: value,
    });
  }

  async function handleCheckAvailability() {
    if (!ngayNhanPhong || !ngayTraPhong) {
      setError("Vui lòng chọn ngày nhận phòng và ngày trả phòng.");
      return;
    }

    if (!isDatPhongDateRangeValid(ngayNhanPhong, ngayTraPhong)) {
      setError("Ngày trả phòng phải sau ngày nhận phòng.");
      return;
    }

    setError(null);

    try {
      const rooms = await onCheckAvailability({
        ngayNhanPhong,
        ngayTraPhong,
      });

      if (!rooms.some((item) => item.soPhong === soPhong)) {
        setSoPhong("");
      }

      if (rooms.length === 0) {
        setError("Không còn phòng trống trong khoảng thời gian đã chọn.");
      }
    } catch (availabilityError) {
      setError(
        mapDatPhongErrorMessage(
          availabilityError,
          "Không thể kiểm tra phòng trống.",
        ),
      );
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const validationResult = validateDatPhongFormInput({
      khachHangId,
      soPhong,
      soNguoi,
      ngayNhanPhong,
      ngayTraPhong,
    });

    if (validationResult.error) {
      setError(validationResult.error);
      return;
    }

    const normalizedKhachHangId = validationResult.values.khachHangId;
    const normalizedSoPhong = validationResult.values.soPhong;
    const normalizedSoNguoi = validationResult.values.soNguoi;
    const normalizedNgayNhanPhong = validationResult.values.ngayNhanPhong;
    const normalizedNgayTraPhong = validationResult.values.ngayTraPhong;
    const normalizedTrangThai = trangThai;

    const sameAsCheckedAvailability =
      availabilityQuery?.ngayNhanPhong === normalizedNgayNhanPhong &&
      availabilityQuery?.ngayTraPhong === normalizedNgayTraPhong;
    const roomExistsInAvailableList = availableRooms.some(
      (item) => item.soPhong === normalizedSoPhong,
    );
    const roomExistsInSelectableList = roomSelectOptions.some(
      (item) => item.soPhong === normalizedSoPhong,
    );
    const isEditWithoutDateRoomChange =
      mode === "edit" &&
      initialData !== null &&
      initialData !== undefined &&
      normalizeDatPhongDateInput(initialData.ngayNhanPhong) ===
        normalizedNgayNhanPhong &&
      normalizeDatPhongDateInput(initialData.ngayTraPhong) ===
        normalizedNgayTraPhong &&
      initialData.soPhong === normalizedSoPhong;
    const roomValidatedByAvailability =
      roomExistsInAvailableList ||
      (availabilityQuery !== null && roomExistsInSelectableList);

    if (
      !isEditWithoutDateRoomChange &&
      (!sameAsCheckedAvailability || !roomValidatedByAvailability)
    ) {
      setError("Vui lòng kiểm tra phòng trống và chọn lại phòng trước khi lưu.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: DatPhongPayload = {
        khachHangId: normalizedKhachHangId,
        soPhong: normalizedSoPhong,
        soNguoi: normalizedSoNguoi,
        ngayNhanPhong: normalizedNgayNhanPhong,
        ngayTraPhong: normalizedNgayTraPhong,
        giaThucTeMoiDem: giaThamKhao ?? undefined,
        ...(mode === "edit" ? { trangThai: normalizedTrangThai } : {}),
      };
      const item = await onSubmit({
        mode,
        payload,
        datPhongId: initialData?.datPhongId,
      });

      await onSuccess({
        item,
        mode,
      });

      onClose();
    } catch (submitError) {
      setError(
        mapDatPhongErrorMessage(submitError, "Không thể lưu đặt phòng."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      description={
        mode === "create"
          ? "Tạo đơn đặt phòng mới và kiểm tra phòng trống theo thời gian lưu trú."
          : "Cập nhật thông tin đơn đặt phòng hiện có."
      }
      isOpen={open}
      onClose={submitting ? () => undefined : onClose}
      title={mode === "create" ? "Tạo đặt phòng" : "Cập nhật đặt phòng"}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="searchKhachHang"
          >
            Tìm khách hàng
          </label>
          <Input
            id="searchKhachHang"
            onChange={(event) => setSearchKhachHang(event.target.value)}
            placeholder="Tìm theo họ tên, CCCD hoặc liên hệ"
            value={searchKhachHang}
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="khachHangId"
          >
            Khách hàng
          </label>
          <Select
            id="khachHangId"
            onChange={(event) => setKhachHangId(event.target.value)}
            value={khachHangId}
          >
            <option value="">Chọn khách hàng</option>
            {filteredKhachHangOptions.map((item) => (
              <option key={item.khachHangId} value={item.khachHangId}>
                {item.hoTen} {item.cccd ? `- ${item.cccd}` : ""}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="ngayNhanPhong"
            >
              Ngày nhận phòng
            </label>
            <Input
              id="ngayNhanPhong"
              min={mode === "create" ? formatDateTimeLocalValue(new Date()) : undefined}
              onChange={(event) => handleNgayNhanPhongChange(event.target.value)}
              type="datetime-local"
              value={ngayNhanPhong}
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="ngayTraPhong"
            >
              Ngày trả phòng
            </label>
            <Input
              id="ngayTraPhong"
              min={
                ngayNhanPhong ||
                (mode === "create" ? formatDateTimeLocalValue(new Date()) : undefined)
              }
              onChange={(event) => handleNgayTraPhongChange(event.target.value)}
              type="datetime-local"
              value={ngayTraPhong}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Kiểm tra phòng trống theo ngày đã chọn trước khi lưu.
            </p>
            <Button
              disabled={availabilityLoading || submitting}
              onClick={() => {
                void handleCheckAvailability();
              }}
              type="button"
              variant="secondary"
            >
              {availabilityLoading
                ? "Đang kiểm tra..."
                : "Kiểm tra phòng trống"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="soPhong">
            Phòng trống
          </label>
          <Select
            id="soPhong"
            onChange={(event) => setSoPhong(event.target.value)}
            value={soPhong}
          >
            <option value="">Chọn phòng</option>
            {roomSelectOptions.map((item) => (
              <option key={item.soPhong} value={item.soPhong}>
                {item.soPhong}
                {item.tenLoaiPhong ? ` - ${item.tenLoaiPhong}` : ""}
              </option>
            ))}
          </Select>
          {availabilityQuery ? (
            <p className="text-xs text-slate-500">
              Danh sách phòng đang áp dụng cho khoảng ngày{" "}
              {availabilityQuery.ngayNhanPhong} đến {availabilityQuery.ngayTraPhong}.
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Chưa có kết quả kiểm tra phòng trống.
            </p>
          )}
          {giaThamKhao ? (
            <p className="text-xs text-slate-600">
              Giá tham khảo:{" "}
              <span className="font-semibold text-slate-900">
                {formatCurrencyVnd(giaThamKhao)}
              </span>
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="soNguoi">
            Số người
          </label>
          <Input
            id="soNguoi"
            min={1}
            onChange={(event) => setSoNguoi(event.target.value)}
            type="number"
            value={soNguoi}
          />
        </div>

        {mode === "edit" ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="trangThai">
              Trạng thái
            </label>
            <Select
              id="trangThai"
              onChange={(event) =>
                setTrangThai(event.target.value as TrangThaiDatPhong)
              }
              value={trangThai}
            >
              {TRANG_THAI_DAT_PHONG_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {getTrangThaiDatPhongLabel(item)}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            disabled={submitting}
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            Hủy
          </Button>
          <Button disabled={submitting || availabilityLoading} type="submit">
            {submitting
              ? "Đang lưu..."
              : mode === "create"
                ? "Tạo đặt phòng"
                : "Lưu thay đổi"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
