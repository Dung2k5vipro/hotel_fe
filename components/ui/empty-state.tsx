type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="grid min-h-[260px] place-items-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <div className="max-w-md">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
          Empty state
        </p>
        <h3 className="mt-3 text-xl font-semibold text-slate-900">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  );
}
