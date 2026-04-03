import type { ReactNode } from "react";

type SectionTitleProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function SectionTitle({ title, description, action }: SectionTitleProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
