import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type ModalProps = {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  className?: string;
};

export function Modal({
  children,
  isOpen,
  onClose,
  title,
  description,
  className,
}: ModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <button
        aria-label="Dong modal"
        className="absolute inset-0 bg-transparent"
        onClick={onClose}
        type="button"
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl",
          className,
        )}
      >
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
