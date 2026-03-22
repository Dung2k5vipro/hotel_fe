import type { ReactNode } from "react";

type DataTableProps = {
  children: ReactNode;
  head: ReactNode;
};

export function DataTable({ head, children }: DataTableProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">{head}</thead>
          <tbody className="divide-y divide-slate-200">{children}</tbody>
        </table>
      </div>
    </div>
  );
}
