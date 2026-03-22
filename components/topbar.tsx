"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/hooks/use-auth-user";
import { getPageTitle } from "@/lib/dashboard";
import {
  getRoleLabel,
  isAdmin,
  logout,
} from "@/services/auth";

type TopbarProps = {
  onToggleSidebar: () => void;
};

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthUser();
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const updateTime = () => {
      setCurrentTime(formatter.format(new Date()));
    };

    updateTime();
    const timer = window.setInterval(updateTime, 60000);

    return () => window.clearInterval(timer);
  }, []);

  function handleLogout() {
    logout();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            aria-label="Mở menu"
            className="lg:hidden"
            onClick={onToggleSidebar}
            variant="secondary"
          >
            Menu
          </Button>

          <div>
            <p className="text-sm text-slate-500">
              {currentTime || "Đang cập nhật thời gian..."}
            </p>
            <h1 className="text-xl font-semibold text-slate-900">
              {getPageTitle(pathname)}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-900">
              {user?.hoTen ?? "Tài khoản đăng nhập"}
            </p>
            <p className="text-xs text-slate-500">
              {user?.tenDangNhap ?? "Đang đồng bộ dữ liệu"}
            </p>
          </div>

          <Badge tone={isAdmin(user) ? "warning" : "default"}>
            {getRoleLabel(user?.vaiTro)}
          </Badge>

          <Button onClick={handleLogout} variant="ghost">
            Đăng xuất
          </Button>
        </div>
      </div>
    </header>
  );
}
