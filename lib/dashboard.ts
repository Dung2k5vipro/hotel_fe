export type DashboardNavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

export const dashboardNavItems: DashboardNavItem[] = [
  { href: "/dashboard", label: "Tổng quan" },
  { href: "/dashboard/loai-phong", label: "Loại phòng" },
  { href: "/dashboard/phong", label: "Phòng" },
  { href: "/dashboard/khach-hang", label: "Khách hàng" },
  { href: "/dashboard/dat-phong", label: "Đặt phòng" },
  { href: "/dashboard/dich-vu", label: "Dịch vụ" },
  { href: "/dashboard/hoa-don", label: "Hóa đơn" },
  { href: "/dashboard/tai-khoan", label: "Tài khoản", adminOnly: true },
];

export function getPageTitle(pathname: string) {
  const matchedItem = [...dashboardNavItems]
    .sort((currentItem, nextItem) => nextItem.href.length - currentItem.href.length)
    .find(
      (item) =>
        pathname === item.href ||
        (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)),
    );

  return matchedItem?.label ?? "Tổng quan";
}

export function isActiveDashboardPath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
