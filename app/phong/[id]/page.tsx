"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { EmptyState } from "@/components/public/EmptyState";
import { PublicHeader } from "@/components/public/PublicHeader";
import { RoomAvailabilityCheck } from "@/components/public/RoomAvailabilityCheck";
import { SectionTitle } from "@/components/public/SectionTitle";
import { formatCurrencyVND } from "@/lib/hotel";
import { getPublicRoomDetail } from "@/services/public/room.service";
import type { PublicRoomDetail } from "@/types/public/public-room";

function parsePositiveInteger(value: string | string[] | undefined) {
  if (typeof value !== "string") {
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

function getGalleryImages(detail: PublicRoomDetail | null) {
  if (!detail) {
    return [];
  }

  return (detail.galleryImages ?? [])
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export default function PublicRoomDetailPage() {
  const params = useParams();
  const roomId = useMemo(() => parsePositiveInteger(params?.id), [params]);
  const [roomDetail, setRoomDetail] = useState<PublicRoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const galleryImages = useMemo(() => getGalleryImages(roomDetail), [roomDetail]);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      setRoomDetail(null);
      setError("Mã loại phòng không hợp lệ.");
      return;
    }

    const normalizedRoomId = roomId;
    let isMounted = true;

    async function loadRoomDetail() {
      setLoading(true);

      try {
        const data = await getPublicRoomDetail(normalizedRoomId);

        if (!isMounted) {
          return;
        }

        setRoomDetail(data);
        setError(null);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setRoomDetail(null);
        setError(
          normalizeErrorMessage(loadError, "Không thể tải chi tiết loại phòng."),
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadRoomDetail();

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  return (
    <main className="min-h-screen bg-slate-100">
      <PublicHeader />

      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle
            description="Xem thông tin chi tiết loại phòng và kiểm tra phòng theo ngày giờ."
            title="Chi tiết loại phòng"
          />
          <Link
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            href="/phong"
          >
            Quay lại danh sách
          </Link>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Đang tải chi tiết loại phòng...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            {error}
          </div>
        ) : !roomDetail ? (
          <EmptyState
            description="Không tìm thấy thông tin loại phòng này."
            title="Không có dữ liệu"
          />
        ) : (
          <div className="space-y-6">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="grid gap-0 md:grid-cols-2">
                <div className="h-64 bg-slate-200 md:h-full">
                  {roomDetail.HinhAnh ? (
                    <div
                      aria-label={roomDetail.TenLoaiPhong}
                      className="h-full w-full bg-cover bg-center"
                      role="img"
                      style={{
                        backgroundImage: `url("${roomDetail.HinhAnh}")`,
                      }}
                    />
                  ) : (
                    <div className="grid h-full min-h-64 place-items-center bg-[linear-gradient(135deg,#e2e8f0_0%,#cbd5e1_100%)] px-4 text-center text-sm text-slate-600">
                      Chưa có ảnh đại diện
                    </div>
                  )}
                </div>

                <div className="space-y-4 p-6">
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                    {roomDetail.TenLoaiPhong}
                  </h1>
                  <p className="text-sm text-slate-600">
                    Giá cơ bản:{" "}
                    <span className="font-semibold text-slate-900">
                      {formatCurrencyVND(roomDetail.GiaCoBan)}
                    </span>
                  </p>
                  <p className="text-sm text-slate-600">
                    Số người tối đa:{" "}
                    <span className="font-semibold text-slate-900">
                      {roomDetail.SoNguoiToiDa}
                    </span>
                  </p>
                  <p className="text-sm leading-6 text-slate-600">
                    {roomDetail.MoTa || "Chưa có mô tả cho loại phòng này."}
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Gallery</h2>

              {galleryImages.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {galleryImages.map((imageUrl, index) => (
                    <div
                      key={`${index}-${imageUrl}`}
                      className="h-44 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                    >
                      <div
                        aria-label={`${roomDetail.TenLoaiPhong} - ảnh ${index + 1}`}
                        className="h-full w-full bg-cover bg-center"
                        role="img"
                        style={{
                          backgroundImage: `url("${imageUrl}")`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : roomDetail.HinhAnh ? (
                <div className="space-y-2">
                  <div className="h-44 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:w-80">
                    <div
                      aria-label={`${roomDetail.TenLoaiPhong} - ảnh đại diện`}
                      className="h-full w-full bg-cover bg-center"
                      role="img"
                      style={{
                        backgroundImage: `url("${roomDetail.HinhAnh}")`,
                      }}
                    />
                  </div>
                  <p className="text-sm text-slate-600">
                    Chưa có gallery riêng, đang dùng ảnh đại diện.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  Chưa có ảnh.
                </div>
              )}
            </section>

            <RoomAvailabilityCheck
              giaMoiDem={roomDetail.GiaCoBan}
              loaiPhongId={roomDetail.LoaiPhong_ID}
            />
          </div>
        )}
      </div>
    </main>
  );
}
