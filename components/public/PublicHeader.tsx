"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/", label: "Trang chủ" },
  { href: "/phong", label: "Loại phòng" },
  { href: "/dich-vu", label: "Dịch vụ" },
  { href: "/dat-phong", label: "Đặt phòng" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname.startsWith(href);
}

export function PublicHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link className="text-lg font-semibold tracking-tight text-slate-900" href="/">
          Khách sạn Hướng Dương
        </Link>

        <nav className="flex flex-wrap items-center gap-2">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                className={cn(
                  "rounded-xl px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
