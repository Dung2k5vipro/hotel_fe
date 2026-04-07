"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { BookingForm } from "@/components/public/BookingForm";
import { EmptyState } from "@/components/public/EmptyState";
import { PublicHeader } from "@/components/public/PublicHeader";
import { SectionTitle } from "@/components/public/SectionTitle";
import { getPublicRoomTypes } from "@/services/public/room.service";
import type { PublicRoomType } from "@/types/public/public-room";

function parsePositiveInteger(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return Math.floor(parsed);
}

function normalizeErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.trim();
  return message.length > 0 ? message : fallback;
}

function PublicBookingPageContent() {
  const searchParams = useSearchParams();
  const [roomTypes, setRoomTypes] = useState<PublicRoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialLoaiPhongId = useMemo(
    () => parsePositiveInteger(searchParams.get("loaiPhongId")),
    [searchParams],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadRoomTypes() {
      setLoading(true);

      try {
        const data = await getPublicRoomTypes();

        if (!isMounted) {
          return;
        }

        setRoomTypes(data);
        setError(null);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(
          normalizeErrorMessage(loadError, "Không thể tải danh sách loại phòng."),
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadRoomTypes();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-100">
      <PublicHeader />

      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <SectionTitle
          description="Điền thông tin, kiểm tra tình trạng phòng và gửi yêu cầu đặt phòng."
          title="Yêu cầu đặt phòng"
        />

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Đang tải dữ liệu đặt phòng...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            {error}
          </div>
        ) : roomTypes.length === 0 ? (
          <EmptyState
            description="Hiện chưa có loại phòng để tiếp nhận yêu cầu đặt phòng."
            title="Không có loại phòng khả dụng"
          />
        ) : (
          <BookingForm
            initialLoaiPhongId={initialLoaiPhongId}
            roomTypes={roomTypes}
          />
        )}
      </div>
    </main>
  );
}

export default function PublicBookingPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-100">
          <PublicHeader />

          <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
            <SectionTitle
              description="Đang chuẩn bị biểu mẫu đặt phòng."
              title="Yêu cầu đặt phòng"
            />
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Đang tải dữ liệu đặt phòng...
            </div>
          </div>
        </main>
      }
    >
      <PublicBookingPageContent />
    </Suspense>
  );
}
