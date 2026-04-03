"use client";

import { useEffect, useState } from "react";

import { EmptyState } from "@/components/public/EmptyState";
import { PublicHeader } from "@/components/public/PublicHeader";
import { SectionTitle } from "@/components/public/SectionTitle";
import { ServiceCard } from "@/components/public/ServiceCard";
import { getPublicServices } from "@/services/public/service.service";
import type { PublicServiceItem } from "@/types/public/public-service";

function normalizeErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.trim();
  return message.length > 0 ? message : fallback;
}

export default function PublicServicePage() {
  const [services, setServices] = useState<PublicServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadServices() {
      setLoading(true);

      try {
        const data = await getPublicServices();

        if (!isMounted) {
          return;
        }

        setServices(data);
        setError(null);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(normalizeErrorMessage(loadError, "Không thể tải danh sách dịch vụ."));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadServices();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-100">
      <PublicHeader />

      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <SectionTitle
          description="Danh sách dịch vụ hiện có tại khách sạn."
          title="Danh sách dịch vụ"
        />

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Đang tải danh sách dịch vụ...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            {error}
          </div>
        ) : services.length === 0 ? (
          <EmptyState
            description="Hiện chưa có dịch vụ để hiển thị."
            title="Không có dữ liệu dịch vụ"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {services.map((item) => (
              <ServiceCard key={item.DichVu_ID} service={item} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
