"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/hooks/use-auth-user";
import { cn } from "@/lib/cn";
import { dashboardNavItems, isActiveDashboardPath } from "@/lib/dashboard";
import { getRoleLabel, isAdmin, logout } from "@/services/auth";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthUser();

  const menuItems = useMemo(() => {
    if (isAdmin(user)) {
      return dashboardNavItems;
    }

    return dashboardNavItems.filter((item) => !item.adminOnly);
  }, [user]);

  function handleLogout() {
    logout();
    onClose();
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <div
        aria-hidden={!isOpen}
        className={cn(
          "fixed inset-0 z-30 bg-slate-950/40 transition lg:hidden",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-slate-200 bg-white px-4 py-5 transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-[270px] lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
            Hotel Management System
          </p>
          <h2 className="mt-3 text-xl font-semibold text-slate-900">Điều hành khách sạn</h2>
          
        </div>

        <nav className="mt-8 space-y-1">
          {menuItems.map((item) => {
            const isActive = isActiveDashboardPath(pathname, item.href);

            return (
              <Link
                key={item.href}
                className={cn(
                  "flex items-center rounded-2xl px-3 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
                href={item.href}
                onClick={onClose}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Tài khoản</p>
            <p className="text-sm font-semibold text-slate-900">{user?.hoTen ?? "Chưa có thông tin"}</p>
            <p className="text-sm text-slate-500">{user?.tenDangNhap ?? "Khách"}</p>
          </div>

          <p className="text-sm text-slate-600">
            Vai trò: <span className="font-medium text-slate-900">{getRoleLabel(user?.vaiTro)}</span>
          </p>

          <Button className="w-full" onClick={handleLogout} variant="secondary">
            Đăng xuất
          </Button>
        </div>
      </aside>
    </>
  );
}
