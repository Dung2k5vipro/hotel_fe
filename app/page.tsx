"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/public/EmptyState";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicHero } from "@/components/public/PublicHero";
import { RoomCard } from "@/components/public/RoomCard";
import { SectionTitle } from "@/components/public/SectionTitle";
import { ServiceCard } from "@/components/public/ServiceCard";
import { getPublicRoomTypes } from "@/services/public/room.service";
import { getPublicServices } from "@/services/public/service.service";
import type { PublicRoomType } from "@/types/public/public-room";
import type { PublicServiceItem } from "@/types/public/public-service";

function normalizeErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.trim();
  return message.length > 0 ? message : fallback;
}

export default function HomePage() {
  const [roomTypes, setRoomTypes] = useState<PublicRoomType[]>([]);
  const [services, setServices] = useState<PublicServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadHighlights() {
      setLoading(true);

      try {
        const [rooms, serviceItems] = await Promise.all([
          getPublicRoomTypes(),
          getPublicServices(),
        ]);

        if (!isMounted) {
          return;
        }

        setRoomTypes(rooms);
        setServices(serviceItems);
        setError(null);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(
          normalizeErrorMessage(loadError, "Không thể tải dữ liệu giới thiệu lúc này."),
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadHighlights();

    return () => {
      isMounted = false;
    };
  }, []);

  const featuredRooms = roomTypes.slice(0, 3);
  const featuredServices = services.slice(0, 4);

  return (
    <main className="min-h-screen bg-slate-100">
      <PublicHeader />

      <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8 sm:px-6">
        <PublicHero
          loadingHighlights={loading}
          roomTypeCount={roomTypes.length}
          serviceCount={services.length}
        />

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="space-y-5">
          <SectionTitle
            action={
              <Link
                className="text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-900 hover:underline"
                href="/phong"
              >
                Xem tất cả loại phòng
              </Link>
            }
            description="Danh sách gợi ý nhanh một số loại phòng được nhiều khách chọn."
            title="Loại phòng nổi bật"
          />

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Đang tải loại phòng...
            </div>
          ) : featuredRooms.length === 0 ? (
            <EmptyState
              description="Hiện chưa có loại phòng để hiển thị."
              title="Chưa có dữ liệu loại phòng"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featuredRooms.map((item) => (
                <RoomCard key={item.LoaiPhong_ID} roomType={item} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-5">
          <SectionTitle
            action={
              <Link
                className="text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-900 hover:underline"
                href="/dich-vu"
              >
                Xem tất cả dịch vụ
              </Link>
            }
            description="Một số dịch vụ đang được cung cấp để hỗ trợ kỳ nghỉ của bạn."
            title="Dịch vụ nổi bật"
          />

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Đang tải dịch vụ...
            </div>
          ) : featuredServices.length === 0 ? (
            <EmptyState
              description="Hiện chưa có dịch vụ để hiển thị."
              title="Chưa có dữ liệu dịch vụ"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {featuredServices.map((item) => (
                <ServiceCard key={item.DichVu_ID} service={item} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
