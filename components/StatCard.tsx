export function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-[2rem] border border-stone-200 bg-white/85 p-6 shadow-card backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
      <div className="mt-4 h-1.5 w-16 rounded-full" style={{ backgroundColor: accent }} />
    </div>
  );
}
