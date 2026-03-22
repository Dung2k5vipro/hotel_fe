"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type SVGProps,
} from "react";
import {
  Activity,
  ArrowUpRight,
  BedDouble,
  CalendarCheck2,
  Clock3,
  ConciergeBell,
  DoorOpen,
  ReceiptText,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { repairVietnameseText } from "@/lib/text";
import { getDatPhongList } from "@/services/dat-phong";
import { getAllSuDungDichVu } from "@/services/dich-vu";
import { getHoaDonByReservation } from "@/services/hoa-don";
import { getKhachHangList } from "@/services/khach-hang";
import { getPhongList } from "@/services/phong";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

type MainStatItem = {
  key: string;
  title: string;
  description: string;
  icon: IconType;
  iconToneClass: string;
  metricKey: keyof OverviewMetrics;
};

type QuickModuleItem = {
  href: string;
  title: string;
  description: string;
  icon: IconType;
};

type SummaryItem = {
  key: string;
  title: string;
  note: string;
  icon: IconType;
  metricKey: keyof OverviewMetrics;
};

type ReportItem = {
  key: string;
  title: string;
  note: string;
  icon: IconType;
  metricKey: keyof OverviewMetrics;
  format?: "number" | "percent";
};

type OverviewMetrics = {
  phongTrong: number | null;
  phongDangO: number | null;
  phongCanDon: number | null;
  phongBaoTri: number | null;
  tongPhong: number | null;
  tyLePhongDangSuDung: number | null;
  phongCanXuLy: number | null;
  khachHang: number | null;
  datPhongDangHoatDong: number | null;
  hoaDonChuaThanhToan: number | null;
  luotSuDungDichVu: number | null;
};

type OverviewSourceErrorMap = {
  phong: string | null;
  datPhong: string | null;
  khachHang: string | null;
  dichVu: string | null;
  hoaDon: string | null;
};

const MAIN_STATS: MainStatItem[] = [
  {
    key: "available",
    title: "Phòng trống",
    metricKey: "phongTrong",
    description: "Sẵn sàng đón khách mới trong ngày.",
    icon: DoorOpen,
    iconToneClass: "bg-emerald-100 text-emerald-700",
  },
  {
    key: "occupied",
    title: "Phòng đang ở",
    metricKey: "phongDangO",
    description: "Đang có khách lưu trú và phục vụ.",
    icon: BedDouble,
    iconToneClass: "bg-sky-100 text-sky-700",
  },
  {
    key: "cleaning",
    title: "Phòng cần dọn",
    metricKey: "phongCanDon",
    description: "Ưu tiên xử lý trong ca trực hiện tại.",
    icon: Activity,
    iconToneClass: "bg-amber-100 text-amber-700",
  },
  {
    key: "maintenance",
    title: "Phòng bảo trì",
    metricKey: "phongBaoTri",
    description: "Tạm dừng khai thác để bảo trì kỹ thuật.",
    icon: Wrench,
    iconToneClass: "bg-rose-100 text-rose-700",
  },
];

const QUICK_MODULES: QuickModuleItem[] = [
  {
    href: "/dashboard/khach-hang",
    title: "Khách hàng",
    description: "Tra cứu hồ sơ lưu trú và thông tin liên hệ.",
    icon: Users,
  },
  {
    href: "/dashboard/dat-phong",
    title: "Đặt phòng",
    description: "Theo dõi check-in, check-out và lịch đặt.",
    icon: CalendarCheck2,
  },
  {
    href: "/dashboard/dich-vu",
    title: "Dịch vụ",
    description: "Ghi nhận dịch vụ phát sinh theo đặt phòng.",
    icon: ConciergeBell,
  },
  {
    href: "/dashboard/hoa-don",
    title: "Hóa đơn",
    description: "Kiểm soát trạng thái thanh toán trong ngày.",
    icon: ReceiptText,
  },
  {
    href: "/dashboard/phong",
    title: "Phòng",
    description: "Quản lý danh mục phòng và trạng thái sử dụng.",
    icon: BedDouble,
  },
  {
    href: "/dashboard/tai-khoan",
    title: "Tài khoản",
    description: "Phân quyền và quản lý tài khoản nhân viên.",
    icon: ShieldCheck,
  },
];

const SUMMARY_ITEMS: SummaryItem[] = [
  {
    key: "customers",
    title: "Khách hàng",
    metricKey: "khachHang",
    note: "Tổng số hồ sơ khách hàng hiện có trong hệ thống.",
    icon: Users,
  },
  {
    key: "activeBookings",
    title: "Đặt phòng đang hoạt động",
    metricKey: "datPhongDangHoatDong",
    note: "Bao gồm trạng thái Đặt trước và Đã nhận phòng.",
    icon: CalendarCheck2,
  },
  {
    key: "unpaidInvoices",
    title: "Hóa đơn chưa thanh toán",
    metricKey: "hoaDonChuaThanhToan",
    note: "Tổng hợp theo tất cả DatPhong_ID đang có trong hệ thống.",
    icon: ReceiptText,
  },
  {
    key: "serviceRecords",
    title: "Dịch vụ đã ghi nhận",
    metricKey: "luotSuDungDichVu",
    note: "Đếm số lượt sử dụng dịch vụ từ module Dịch vụ.",
    icon: ConciergeBell,
  },
];

const REPORT_ITEMS: ReportItem[] = [
  {
    key: "report-customers",
    title: "Tổng số khách hàng",
    metricKey: "khachHang",
    note: "Đồng bộ trực tiếp từ module Khách hàng.",
    icon: Users,
  },
  {
    key: "report-total-rooms",
    title: "Tổng số phòng",
    metricKey: "tongPhong",
    note: "Tổng tất cả phòng đang quản lý trong hệ thống.",
    icon: BedDouble,
  },
  {
    key: "report-active-bookings",
    title: "Đặt phòng đang hoạt động",
    metricKey: "datPhongDangHoatDong",
    note: "Bao gồm Đặt trước và Đã nhận phòng.",
    icon: CalendarCheck2,
  },
  {
    key: "report-unpaid-invoices",
    title: "Hóa đơn chưa thanh toán",
    metricKey: "hoaDonChuaThanhToan",
    note: "Tổng hợp theo toàn bộ DatPhong_ID hiện có.",
    icon: ReceiptText,
  },
  {
    key: "report-service-usage",
    title: "Tổng lượt sử dụng dịch vụ",
    metricKey: "luotSuDungDichVu",
    note: "Đếm số bản ghi phát sinh từ module Dịch vụ.",
    icon: ConciergeBell,
  },
  {
    key: "report-occupancy-rate",
    title: "Tỷ lệ phòng đang sử dụng",
    metricKey: "tyLePhongDangSuDung",
    note: "Tính theo số phòng đang ở trên tổng số phòng.",
    icon: Activity,
    format: "percent",
  },
];

const SOURCE_LABELS: Record<keyof OverviewSourceErrorMap, string> = {
  phong: "Phòng",
  datPhong: "Đặt phòng",
  khachHang: "Khách hàng",
  dichVu: "Dịch vụ",
  hoaDon: "Hóa đơn",
};

const INITIAL_METRICS: OverviewMetrics = {
  phongTrong: null,
  phongDangO: null,
  phongCanDon: null,
  phongBaoTri: null,
  tongPhong: null,
  tyLePhongDangSuDung: null,
  phongCanXuLy: null,
  khachHang: null,
  datPhongDangHoatDong: null,
  hoaDonChuaThanhToan: null,
  luotSuDungDichVu: null,
};

const INITIAL_SOURCE_ERRORS: OverviewSourceErrorMap = {
  phong: null,
  datPhong: null,
  khachHang: null,
  dichVu: null,
  hoaDon: null,
};

function getGreetingByHour(hour: number) {
  if (hour < 12) {
    return "Chào buổi sáng";
  }

  if (hour < 18) {
    return "Chào buổi chiều";
  }

  return "Chào buổi tối";
}

function normalizeErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const normalized = repairVietnameseText(error.message).trim();
  return normalized.length > 0 ? normalized : fallback;
}

function isLikelyNoInvoiceError(message: string) {
  const normalized = repairVietnameseText(message).trim().toLowerCase();

  return (
    normalized.includes("không tìm thấy") ||
    normalized.includes("not found") ||
    normalized.includes("chưa có hóa đơn") ||
    normalized.includes("không có hóa đơn") ||
    normalized.includes("khong tim thay") ||
    normalized.includes("không thể tải hóa đơn cho datphong_id")
  );
}

function formatMetricValue(value: number | null) {
  if (value === null) {
    return "--";
  }

  return value.toLocaleString("vi-VN");
}

function formatPercentValue(value: number | null) {
  if (value === null) {
    return "--";
  }

  return `${value.toFixed(1).replace(".", ",")}%`;
}

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [metrics, setMetrics] = useState<OverviewMetrics>(INITIAL_METRICS);
  const [sourceErrors, setSourceErrors] = useState<OverviewSourceErrorMap>(
    INITIAL_SOURCE_ERRORS,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const requestIdRef = useRef(0);

  const loadOverviewMetrics = useCallback(async (showLoading = false) => {
    const requestId = ++requestIdRef.current;

    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    const nextErrors: OverviewSourceErrorMap = {
      ...INITIAL_SOURCE_ERRORS,
    };

    let phongTrong: number | null = null;
    let phongDangO: number | null = null;
    let phongCanDon: number | null = null;
    let phongBaoTri: number | null = null;
    let tongPhong: number | null = null;
    let tyLePhongDangSuDung: number | null = null;
    let phongCanXuLy: number | null = null;

    let datPhongDangHoatDong: number | null = null;
    let datPhongIds: number[] | null = null;

    let khachHangCount: number | null = null;
    let serviceUsageCount: number | null = null;
    let unpaidInvoiceCount: number | null = null;

    const [phongResult, datPhongResult, khachHangResult, dichVuResult] =
      await Promise.allSettled([
        getPhongList(),
        getDatPhongList(),
        getKhachHangList(),
        getAllSuDungDichVu(),
      ]);

    if (phongResult.status === "fulfilled") {
      const roomStats = {
        trong: 0,
        dangO: 0,
        canDon: 0,
        baoTri: 0,
      };

      for (const room of phongResult.value) {
        if (room.trangThai === "Trong") {
          roomStats.trong += 1;
          continue;
        }

        if (room.trangThai === "DangO") {
          roomStats.dangO += 1;
          continue;
        }

        if (room.trangThai === "CanDon") {
          roomStats.canDon += 1;
          continue;
        }

        if (room.trangThai === "BaoTri") {
          roomStats.baoTri += 1;
        }
      }

      phongTrong = roomStats.trong;
      phongDangO = roomStats.dangO;
      phongCanDon = roomStats.canDon;
      phongBaoTri = roomStats.baoTri;
      tongPhong =
        roomStats.trong + roomStats.dangO + roomStats.canDon + roomStats.baoTri;
      tyLePhongDangSuDung =
        tongPhong > 0 ? (roomStats.dangO / tongPhong) * 100 : 0;
      phongCanXuLy = roomStats.canDon + roomStats.baoTri;
    } else {
      nextErrors.phong = normalizeErrorMessage(
        phongResult.reason,
        "Không thể tải dữ liệu phòng.",
      );
    }

    if (datPhongResult.status === "fulfilled") {
      const datPhongList = datPhongResult.value;

      datPhongDangHoatDong = datPhongList.filter((item) =>
        ["DatTruoc", "DaNhanPhong"].includes(item.trangThai),
      ).length;

      datPhongIds = Array.from(
        new Set(
          datPhongList
            .map((item) => item.datPhongId)
            .filter((id) => Number.isInteger(id) && id > 0),
        ),
      );
    } else {
      nextErrors.datPhong = normalizeErrorMessage(
        datPhongResult.reason,
        "Không thể tải dữ liệu đặt phòng.",
      );
    }

    if (khachHangResult.status === "fulfilled") {
      khachHangCount = khachHangResult.value.length;
    } else {
      nextErrors.khachHang = normalizeErrorMessage(
        khachHangResult.reason,
        "Không thể tải dữ liệu khách hàng.",
      );
    }

    if (dichVuResult.status === "fulfilled") {
      serviceUsageCount = dichVuResult.value.length;
    } else {
      nextErrors.dichVu = normalizeErrorMessage(
        dichVuResult.reason,
        "Không thể tải dữ liệu dịch vụ.",
      );
    }

    if (datPhongIds === null) {
      unpaidInvoiceCount = null;
      nextErrors.hoaDon =
        "Không thể tổng hợp hóa đơn vì dữ liệu đặt phòng chưa tải được.";
    } else if (datPhongIds.length === 0) {
      unpaidInvoiceCount = 0;
    } else {
      const hoaDonResults = await Promise.allSettled(
        datPhongIds.map((datPhongId) => getHoaDonByReservation(datPhongId)),
      );

      const invoices = new Map<number, { daThanhToan: boolean }>();
      let fatalErrorCount = 0;

      for (const result of hoaDonResults) {
        if (result.status === "fulfilled") {
          invoices.set(result.value.id, {
            daThanhToan: result.value.daThanhToan,
          });
          continue;
        }

        const normalizedMessage = normalizeErrorMessage(
          result.reason,
          "Không thể tải dữ liệu hóa đơn.",
        );

        if (isLikelyNoInvoiceError(normalizedMessage)) {
          continue;
        }

        fatalErrorCount += 1;
      }

      if (fatalErrorCount === hoaDonResults.length && invoices.size === 0) {
        unpaidInvoiceCount = null;
        nextErrors.hoaDon = "Không thể tải dữ liệu hóa đơn.";
      } else {
        unpaidInvoiceCount = Array.from(invoices.values()).filter(
          (item) => item.daThanhToan === false,
        ).length;

        if (fatalErrorCount > 0) {
          nextErrors.hoaDon =
            "Một phần dữ liệu hóa đơn chưa tải được. Số liệu đang hiển thị là dữ liệu hợp lệ đã nhận.";
        }
      }
    }

    if (requestId !== requestIdRef.current) {
      return;
    }

    setMetrics({
      phongTrong,
      phongDangO,
      phongCanDon,
      phongBaoTri,
      tongPhong,
      tyLePhongDangSuDung,
      phongCanXuLy,
      khachHang: khachHangCount,
      datPhongDangHoatDong,
      hoaDonChuaThanhToan: unpaidInvoiceCount,
      luotSuDungDichVu: serviceUsageCount,
    });
    setSourceErrors(nextErrors);
    setLoadedOnce(true);

    if (showLoading) {
      setLoading(false);
    } else {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOverviewMetrics(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadOverviewMetrics]);

  const greeting = useMemo(
    () => getGreetingByHour(currentTime.getHours()),
    [currentTime],
  );

  const timeLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(currentTime),
    [currentTime],
  );

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(currentTime),
    [currentTime],
  );

  const sourceErrorMessages = useMemo(
    () =>
      (
        Object.entries(sourceErrors) as Array<
          [keyof OverviewSourceErrorMap, string | null]
        >
      )
        .filter(([, message]) => message !== null)
        .map(
          ([sourceKey, message]) => `${SOURCE_LABELS[sourceKey]}: ${message}`,
        ),
    [sourceErrors],
  );

  return (
    <section className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-6 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <ShieldCheck className="size-3.5" />
              Đang vận hành bình thường
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{greeting}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Tổng quan
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Theo dõi nhanh các chỉ số vận hành của khách sạn và truy cập các
                chức năng đang hoạt động.
              </p>
            </div>
          </div>

          <div className="min-w-[220px] space-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                <Clock3 className="size-3.5" />
                Thời gian hiện tại
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {timeLabel}
              </p>
              <p className="mt-1 text-sm text-slate-600">{dateLabel}</p>
            </div>
            <Button
              className="w-full"
              disabled={loading || refreshing}
              onClick={() => {
                void loadOverviewMetrics(false);
              }}
              variant="secondary"
            >
              {refreshing ? "Đang làm mới..." : "Làm mới số liệu"}
            </Button>
          </div>
        </div>
      </section>

      {loading && !loadedOnce ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          Đang tải số liệu tổng quan từ các chứ năng
        </div>
      ) : null}

      {sourceErrorMessages.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">
            Một số nguồn dữ liệu chưa đồng bộ hoàn toàn:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {sourceErrorMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {MAIN_STATS.map((item) => {
          const Icon = item.icon;

          return (
            <article
              key={item.key}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-slate-600">
                  {item.title}
                </p>
                <span className={`rounded-xl p-2 ${item.iconToneClass}`}>
                  <Icon className="size-4" />
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold text-slate-900">
                {formatMetricValue(metrics[item.metricKey])}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {item.description}
              </p>
            </article>
          );
        })}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Truy cập nhanh
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Mở nhanh các chức năng chính để xử lý tác vụ vận hành hằng ngày.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {QUICK_MODULES.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
                href={item.href}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-xl bg-white p-2 text-slate-700 shadow-sm">
                    <Icon className="size-4" />
                  </span>
                  <ArrowUpRight className="size-4 text-slate-400 transition group-hover:text-slate-700" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.description}
                </p>
                <span className="mt-4 inline-flex items-center text-sm font-medium text-slate-700">
                  Mở chức năng
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Tổng kết vận hành hôm nay
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Các số liệu tóm tắt theo ca trực, đồng bộ từ dữ liệu thật của từng
              chức năng
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SUMMARY_ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.key}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Icon className="size-4 text-slate-500" />
                  {item.title}
                </div>
                <p className="mt-3 text-3xl font-semibold text-slate-900">
                  {formatMetricValue(metrics[item.metricKey])}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.note}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Báo cáo nhanh
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Tổng hợp tức thời các chỉ số vận hành thực tế từ các chức năng
              hiện có.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {REPORT_ITEMS.map((item) => {
            const Icon = item.icon;
            const value = metrics[item.metricKey];
            const displayValue =
              item.format === "percent"
                ? formatPercentValue(value)
                : formatMetricValue(value);

            return (
              <article
                key={item.key}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Icon className="size-4 text-slate-500" />
                  {item.title}
                </div>
                <p className="mt-3 text-3xl font-semibold text-slate-900">
                  {displayValue}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.note}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
