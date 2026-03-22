import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type AlertProps = {
  children: ReactNode;
  tone?: "error" | "info" | "success";
  className?: string;
};

export function Alert({
  children,
  tone = "info",
  className,
}: AlertProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        tone === "error" && "border-rose-200 bg-rose-50 text-rose-700",
        tone === "info" && "border-slate-200 bg-slate-50 text-slate-700",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        className,
      )}
    >
      {children}
    </div>
  );
}
