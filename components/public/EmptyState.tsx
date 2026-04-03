type PublicEmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: PublicEmptyStateProps) {
  return (
    <div className="grid min-h-[220px] place-items-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <div className="max-w-xl">
        <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  );
}
