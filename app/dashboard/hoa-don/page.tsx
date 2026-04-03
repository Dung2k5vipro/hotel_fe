"use client";

import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { useAuthUser } from "@/hooks/use-auth-user";
import { formatCurrencyVND } from "@/lib/hotel";
import { repairVietnameseText } from "@/lib/text";
import { getDatPhongList } from "@/services/dat-phong";
import { isAdmin, isNhanVien } from "@/services/auth";
import { getHoaDonByReservation, payHoaDon } from "@/services/hoa-don";
import type { DatPhong } from "@/types/dat-phong";
import type { HoaDon, HoaDonSummaryState } from "@/types/hoa-don";

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

const INITIAL_SUMMARY_STATE: HoaDonSummaryState = {
  status: "idle",
  item: null,
  error: null,
  lastDatPhongId: null,
};

function normalizeMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = repairVietnameseText(error.message).trim();
  return message.length > 0 ? message : fallback;
}

function parseDatPhongId(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number(trimmedValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function sortReservations(list: DatPhong[]) {
  return [...list].sort(
    (currentItem, nextItem) => nextItem.datPhongId - currentItem.datPhongId,
  );
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Chưa thanh toán";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return repairVietnameseText(value);
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsedDate);
}

function formatBookingStatus(value?: string | null) {
  if (!value) {
    return "Chưa cập nhật";
  }

  const normalized = repairVietnameseText(value).trim();

  if (normalized === "DatTruoc") {
    return "Đặt trước";
  }

  if (normalized === "DaNhanPhong") {
    return "Đã nhận phòng";
  }

  if (normalized === "DaTraPhong") {
    return "Đã trả phòng";
  }

  if (normalized === "DaHuy") {
    return "Đã hủy";
  }

  return normalized;
}

function getPaymentBadgeTone(item: HoaDon | null) {
  if (!item) {
    return "default" as const;
  }

  return item.daThanhToan ? "success" : "warning";
}

function getPaymentLabel(item: HoaDon | null) {
  if (!item) {
    return "Chưa có hóa đơn";
  }

  return item.daThanhToan ? "Đã thanh toán" : "Chưa thanh toán";
}

function getRoleLabel(role?: "Admin" | "NhanVien" | null) {
  if (role === "Admin") {
    return "Admin";
  }

  if (role === "NhanVien") {
    return "Nhân viên";
  }

  return "Đang đồng bộ quyền";
}

function SummaryField({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 ${
        accent
          ? "summary-field summary-field-accent border-slate-900 bg-slate-900 text-white"
          : "summary-field border-slate-200 bg-slate-50 text-slate-900"
      }`}
    >
      <p
        className={`text-xs uppercase tracking-[0.18em] ${
          accent ? "text-slate-300" : "text-slate-400"
        }`}
      >
        {label}
      </p>
      <p className="mt-3 text-lg font-semibold">{value}</p>
    </div>
  );
}

export default function HoaDonPage() {
  const user = useAuthUser();
  const [reservationInput, setReservationInput] = useState("");
  const [reservationOptions, setReservationOptions] = useState<DatPhong[]>([]);
  const [reservationOptionsLoading, setReservationOptionsLoading] =
    useState(true);
  const [reservationOptionsError, setReservationOptionsError] = useState<
    string | null
  >(null);
  const [summary, setSummary] = useState<HoaDonSummaryState>(
    INITIAL_SUMMARY_STATE,
  );
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [paying, setPaying] = useState(false);

  const lookupRequestIdRef = useRef(0);
  const canManageHoaDon = user === null || isAdmin(user) || isNhanVien(user);
  const selectedReservation =
    reservationOptions.find(
      (item) => String(item.datPhongId) === reservationInput.trim(),
    ) ?? null;
  const reservationSelectValue = selectedReservation
    ? String(selectedReservation.datPhongId)
    : "";
  const currentHoaDon = summary.item;

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const items = await getDatPhongList();

        if (!active) {
          return;
        }

        setReservationOptions(sortReservations(items));
        setReservationOptionsError(null);
      } catch (error) {
        if (!active) {
          return;
        }

        setReservationOptions([]);
        setReservationOptionsError(
          normalizeMessage(
            error,
            "Không thể tải danh sách đặt phòng. Bạn vẫn có thể nhập DatPhong_ID thủ công.",
          ),
        );
      } finally {
        if (active) {
          setReservationOptionsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function handleLoadHoaDon(datPhongIdValue?: number) {
    if (!canManageHoaDon) {
      setFeedback({
        type: "error",
        message:
          "Tài khoản hiện tại không có quyền xem hoặc chốt thanh toán hóa đơn.",
      });
      return;
    }

    const parsedDatPhongId =
      datPhongIdValue ?? parseDatPhongId(reservationInput);

    if (parsedDatPhongId === null) {
      setFeedback(null);
      setSummary({
        status: "error",
        item: null,
        error: "Vui lòng nhập DatPhong_ID hợp lệ.",
        lastDatPhongId: null,
      });
      return;
    }

    setReservationInput(String(parsedDatPhongId));
    setFeedback(null);

    const requestId = ++lookupRequestIdRef.current;

    setSummary((currentState) => ({
      status: "loading",
      item:
        currentState.lastDatPhongId === parsedDatPhongId
          ? currentState.item
          : null,
      error: null,
      lastDatPhongId: parsedDatPhongId,
    }));

    try {
      const item = await getHoaDonByReservation(parsedDatPhongId);

      if (requestId !== lookupRequestIdRef.current) {
        return;
      }

      setSummary({
        status: "ready",
        item,
        error: null,
        lastDatPhongId: parsedDatPhongId,
      });
    } catch (error) {
      if (requestId !== lookupRequestIdRef.current) {
        return;
      }

      setSummary({
        status: "error",
        item: null,
        error: normalizeMessage(
          error,
          `Không thể tải hóa đơn cho DatPhong_ID #${parsedDatPhongId}.`,
        ),
        lastDatPhongId: parsedDatPhongId,
      });
    }
  }

  async function handlePayHoaDon() {
    if (!canManageHoaDon) {
      setFeedback({
        type: "error",
        message: "Tài khoản hiện tại không có quyền chốt thanh toán hóa đơn.",
      });
      return;
    }

    if (!currentHoaDon) {
      setFeedback({
        type: "error",
        message: "Chưa tải được hóa đơn để thanh toán.",
      });
      return;
    }

    if (currentHoaDon.daThanhToan) {
      return;
    }

    setFeedback(null);
    setPaying(true);

    try {
      const paidItem = await payHoaDon(currentHoaDon.id);

      if (paidItem) {
        setSummary({
          status: "ready",
          item: paidItem,
          error: null,
          lastDatPhongId: paidItem.datPhongId,
        });
      }

      try {
        const refreshedItem = await getHoaDonByReservation(
          currentHoaDon.datPhongId,
        );

        setSummary({
          status: "ready",
          item: refreshedItem,
          error: null,
          lastDatPhongId: refreshedItem.datPhongId,
        });
        setReservationInput(String(refreshedItem.datPhongId));
        setFeedback({
          type: "success",
          message: `Đã chốt thanh toán hóa đơn #${refreshedItem.id}.`,
        });
      } catch (refreshError) {
        if (!paidItem) {
          throw refreshError;
        }

        setReservationInput(String(paidItem.datPhongId));
        setFeedback({
          type: "success",
          message:
            "Đã chốt thanh toán thành công. Dữ liệu đang hiển thị từ phản hồi thanh toán.",
        });
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeMessage(
          error,
          `Không thể chốt thanh toán hóa đơn #${currentHoaDon.id}.`,
        ),
      });
    } finally {
      setPaying(false);
    }
  }

  function handlePrintHoaDon() {
    if (!currentHoaDon) {
      setFeedback({
        type: "error",
        message: "Vui lòng tải hóa đơn trước khi in.",
      });
      return;
    }

    window.print();
  }

  const pageAction = (
    <div className="flex items-center gap-3">
      <Badge tone={canManageHoaDon ? "default" : "danger"}>
        {getRoleLabel(user?.vaiTro ?? null)}
      </Badge>
      <Badge tone={getPaymentBadgeTone(currentHoaDon)}>
        {getPaymentLabel(currentHoaDon)}
      </Badge>
    </div>
  );

  return (
    <section className="hoa-don-page space-y-6">
      <div className="no-print">
        <PageHeader
        action={pageAction}
        description="Tra cứu hóa đơn theo đúng DatPhong_ID"
        title="Quản lý hóa đơn"
        />
      </div>

      {feedback ? (
        <div
          className={`no-print rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {!canManageHoaDon ? (
        <div className="no-print rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Tài khoản hiện tại không có quyền thao tác với hóa đơn.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_360px]">
        <div className="space-y-6">
          <div className="no-print rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Tra cứu hóa đơn theo đặt phòng
                </h2>
              </div>
            </div>

            <div className="mt-5 grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm xl:grid-cols-[220px_minmax(0,1fr)_auto_auto]">
              <Input
                inputMode="numeric"
                onChange={(event) => setReservationInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleLoadHoaDon();
                  }
                }}
                placeholder="Nhập DatPhong_ID"
                value={reservationInput}
              />
              <Select
                disabled={
                  reservationOptionsLoading || reservationOptions.length === 0
                }
                onChange={(event) => setReservationInput(event.target.value)}
                value={reservationSelectValue}
              >
                <option value="">
                  {reservationOptionsLoading
                    ? "Đang tải danh sách đặt phòng..."
                    : "Chọn nhanh từ danh sách đặt phòng"}
                </option>
                {reservationOptions.map((item) => (
                  <option key={item.datPhongId} value={item.datPhongId}>
                    #{item.datPhongId} - Phòng {item.soPhong} -{" "}
                    {item.tenKhachHang ??
                      item.khachHang?.hoTen ??
                      "Chưa cập nhật"}
                  </option>
                ))}
              </Select>
              <Button
                disabled={
                  !canManageHoaDon || summary.status === "loading" || paying
                }
                onClick={() => {
                  void handleLoadHoaDon();
                }}
              >
                {summary.status === "loading" ? "Đang tải..." : "Tải hóa đơn"}
              </Button>
              <Button
                disabled={
                  !canManageHoaDon ||
                  paying ||
                  summary.lastDatPhongId === null ||
                  summary.status === "loading"
                }
                onClick={() => {
                  if (summary.lastDatPhongId !== null) {
                    void handleLoadHoaDon(summary.lastDatPhongId);
                  }
                }}
                variant="secondary"
              >
                Làm mới
              </Button>
            </div>

            {selectedReservation ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <SummaryField
                  label="Đặt phòng đang chọn"
                  value={`#${selectedReservation.datPhongId}`}
                />
                <SummaryField
                  label="Khách hàng"
                  value={
                    selectedReservation.tenKhachHang ??
                    selectedReservation.khachHang?.hoTen ??
                    "Chưa cập nhật"
                  }
                />
                <SummaryField
                  label="Phòng / trạng thái"
                  value={`Phòng ${selectedReservation.soPhong} • ${formatBookingStatus(
                    selectedReservation.trangThai,
                  )}`}
                />
              </div>
            ) : null}

            {reservationOptionsError ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {reservationOptionsError}
              </div>
            ) : null}
          </div>

          {summary.status === "idle" ? (
            <div className="no-print grid min-h-[280px] place-items-center rounded-[28px] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <div className="max-w-lg">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
                  Hóa đơn
                </p>
                <h3 className="mt-3 text-xl font-semibold text-slate-900">
                  Chưa có dữ liệu để hiển thị
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Nhập DatPhong_ID và bấm “Tải hóa đơn” để lấy số liệu tổng hợp
                  mới nhất
                </p>
              </div>
            </div>
          ) : null}

          {summary.status === "loading" && !currentHoaDon ? (
            <div className="no-print rounded-[28px] border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Đang tải hóa đơn ...
            </div>
          ) : null}

          {summary.status === "error" ? (
            <div className="no-print rounded-[28px] border border-rose-200 bg-rose-50 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-rose-700">
                Không tải được hóa đơn
              </h3>
              <p className="mt-3 text-sm leading-6 text-rose-700">
                {summary.error}
              </p>
            </div>
          ) : null}

          {currentHoaDon ? (
            <div className="print-area rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="print-only border-b border-slate-300 pb-4">
                <h1 className="text-2xl font-semibold text-slate-900">Hóa đơn</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Mã hóa đơn #{currentHoaDon.id} • Mã đặt phòng #{currentHoaDon.datPhongId}
                </p>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Chi tiết hóa đơn
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    Hóa đơn #{currentHoaDon.id}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Gắn với DatPhong_ID #{currentHoaDon.datPhongId}. Tổng tiền
                    đang hiển thị lấy trực tiếp từ dữ liệu đã tổng hợp.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {summary.status === "loading" ? (
                    <Badge tone="default">Đang đồng bộ </Badge>
                  ) : null}
                  <Badge tone={getPaymentBadgeTone(currentHoaDon)}>
                    {getPaymentLabel(currentHoaDon)}
                  </Badge>
                  <Button
                    className="no-print"
                    disabled={summary.status === "loading"}
                    onClick={handlePrintHoaDon}
                    variant="secondary"
                  >
                    In hóa đơn
                  </Button>
                </div>
              </div>

              <div className="print-grid mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <SummaryField
                  label="Mã hóa đơn"
                  value={`#${currentHoaDon.id}`}
                />
                <SummaryField
                  label="Mã đặt phòng"
                  value={`#${currentHoaDon.datPhongId}`}
                />
                <SummaryField
                  label="Tiền phòng"
                  value={formatCurrencyVND(currentHoaDon.tongTienPhong)}
                />
                <SummaryField
                  label="Tiền dịch vụ"
                  value={formatCurrencyVND(currentHoaDon.tongTienDichVu)}
                />
                <SummaryField
                  accent
                  label="Tổng thanh toán"
                  value={formatCurrencyVND(currentHoaDon.tongThanhToan)}
                />
                <SummaryField
                  label="Ngày thanh toán"
                  value={formatDateTime(currentHoaDon.ngayThanhToan)}
                />
              </div>

              {currentHoaDon.hoTenKhachHang ||
              currentHoaDon.soPhong ||
              currentHoaDon.trangThaiDatPhong ? (
                <div className="print-grid mt-5 grid gap-4 md:grid-cols-3">
                  <SummaryField
                    label="Khách hàng"
                    value={currentHoaDon.hoTenKhachHang ?? "Chưa cập nhật"}
                  />
                  <SummaryField
                    label="Phòng"
                    value={currentHoaDon.soPhong ?? "Chưa cập nhật"}
                  />
                  <SummaryField
                    label="Trạng thái đặt phòng"
                    value={formatBookingStatus(currentHoaDon.trangThaiDatPhong)}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="no-print space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-5 text-white shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
              Thanh toán
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Chốt thanh toán hóa đơn
            </h2>

            {currentHoaDon ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-slate-300">
                    Hóa đơn đang thao tác
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    #{currentHoaDon.id}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    DatPhong_ID #{currentHoaDon.datPhongId}
                  </p>
                </div>

                {currentHoaDon.daThanhToan ? (
                  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                    Hóa đơn này đã được thanh toán vào{" "}
                    {formatDateTime(currentHoaDon.ngayThanhToan)}.
                  </div>
                ) : (
                  <Button
                    className="w-full border-white/20 bg-white text-slate-900 hover:bg-slate-100"
                    disabled={
                      !canManageHoaDon || paying || summary.status === "loading"
                    }
                    onClick={() => {
                      void handlePayHoaDon();
                    }}
                    variant="secondary"
                  >
                    {paying ? "Đang chốt thanh toán..." : "Thanh toán"}
                  </Button>
                )}

                <Button
                  className="w-full border border-white/20 text-white hover:bg-white/10 hover:text-white"
                  disabled={
                    !currentHoaDon || paying || summary.status === "loading"
                  }
                  onClick={() => {
                    if (currentHoaDon) {
                      void handleLoadHoaDon(currentHoaDon.datPhongId);
                    }
                  }}
                  variant="ghost"
                >
                  Tải lại
                </Button>

                <Button
                  className="w-full border border-white/20 text-white hover:bg-white/10 hover:text-white"
                  disabled={!currentHoaDon || summary.status === "loading"}
                  onClick={handlePrintHoaDon}
                  variant="ghost"
                >
                  In hóa đơn
                </Button>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300">
                Tải hóa đơn trước khi thực hiện thanh toán.
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media screen {
          .hoa-don-page .print-only {
            display: none;
          }
        }

        @media print {
          aside,
          header,
          .hoa-don-page .no-print {
            display: none !important;
          }

          body {
            background: #ffffff !important;
            color: #000000 !important;
          }

          .hoa-don-page {
            margin: 0 !important;
            padding: 0 !important;
          }

          .hoa-don-page .print-area {
            border: 1px solid #cbd5e1 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 20px !important;
          }

          .hoa-don-page .print-area .summary-field {
            border-color: #cbd5e1 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }

          .hoa-don-page .print-area .summary-field-accent {
            border-color: #0f172a !important;
            background: #ffffff !important;
            color: #000000 !important;
          }

          .hoa-don-page .print-area .summary-field-accent p:first-child {
            color: #475569 !important;
          }

          .hoa-don-page .print-area * {
            color: #000000 !important;
          }

          .hoa-don-page .print-only {
            display: block !important;
          }

          .hoa-don-page .print-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </section>
  );
}
