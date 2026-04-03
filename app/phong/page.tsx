"use client";

import { useEffect, useState } from "react";

import { EmptyState } from "@/components/public/EmptyState";
import { PublicHeader } from "@/components/public/PublicHeader";
import { RoomCard } from "@/components/public/RoomCard";
import { SectionTitle } from "@/components/public/SectionTitle";
import { getPublicRoomTypes } from "@/services/public/room.service";
import type { PublicRoomType } from "@/types/public/public-room";

function normalizeErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.trim();
  return message.length > 0 ? message : fallback;
}

export default function PublicRoomPage() {
  const [roomTypes, setRoomTypes] = useState<PublicRoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          description="Xem thông tin loại phòng, giá cơ bản và số người tối đa cho từng loại."
          title="Danh sách loại phòng"
        />

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Đang tải danh sách loại phòng...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            {error}
          </div>
        ) : roomTypes.length === 0 ? (
          <EmptyState
            description="Hiện chưa có loại phòng để hiển thị."
            title="Không có dữ liệu loại phòng"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {roomTypes.map((item) => (
              <RoomCard key={item.LoaiPhong_ID} roomType={item} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
