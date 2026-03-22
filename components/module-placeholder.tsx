type ModulePlaceholderProps = {
  title: string;
  description: string;
  message?: string;
};

export function ModulePlaceholder({
  title,
  description,
  message = "Đang phát triển",
}: ModulePlaceholderProps) {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      </div>

      <div className="grid min-h-[360px] place-items-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-sm">
        <div className="max-w-md space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
            Module
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
          <p className="text-sm leading-6 text-slate-600">{message}</p>
        </div>
      </div>
    </section>
  );
}
