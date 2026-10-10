export default function StatisticsLoading() {
  return (
    <div className="space-y-10 animate-pulse">
      {/* 1. Header */}
      <div className="space-y-3 border-b border-[var(--line)] pb-6">
        <div className="h-12 w-44 bg-[var(--ink-1)] rounded-[8px]" />
        <div className="h-4 w-96 max-w-full bg-[var(--ink-1)]/60 rounded-[6px]" />
      </div>

      {/* 2. Dua Kolom: Golden Boot & Golden Glove */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="h-7 w-36 bg-[var(--ink-1)] rounded-[6px]" />
          <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-[var(--ink-2)]/60 rounded-[8px]" />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="h-7 w-36 bg-[var(--ink-1)] rounded-[6px]" />
          <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-[var(--ink-2)]/60 rounded-[8px]" />
            ))}
          </div>
        </div>
      </div>

      {/* 3. Winning Streak & CS Bar Skeleton */}
      <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-6 space-y-4">
        <div className="h-6 w-48 bg-[var(--ink-2)] rounded-[6px]" />
        <div className="h-6 w-full bg-[var(--ink-2)]/40 rounded-[8px]" />
      </div>
    </div>
  );
}
