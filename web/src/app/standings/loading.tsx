export default function StandingsLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* 1. Header */}
      <div className="space-y-3">
        <div className="h-12 w-44 bg-[var(--ink-1)] rounded-[8px]" />
        <div className="h-4 w-96 max-w-full bg-[var(--ink-1)]/60 rounded-[6px]" />
      </div>

      {/* 2. Standings Table Skeleton */}
      <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] overflow-hidden">
        {/* Table Head */}
        <div className="h-12 border-b border-[var(--line)] bg-[var(--ink-1)]/80 flex items-center px-4 justify-between">
          <div className="h-3 w-10 bg-[var(--ink-2)] rounded" />
          <div className="h-3 w-28 bg-[var(--ink-2)] rounded" />
          <div className="h-3 w-40 bg-[var(--ink-2)] rounded" />
        </div>

        {/* Table Rows (72px each) */}
        <div className="divide-y divide-[var(--line)]">
          {[1, 2].map((idx) => (
            <div key={idx} className="h-[72px] px-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-[var(--ink-2)]" />
                <div className="h-5 w-32 bg-[var(--ink-2)] rounded-[6px]" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-5 w-12 bg-[var(--ink-2)] rounded-[4px]" />
                <div className="h-7 w-16 bg-[var(--ink-2)] rounded-[6px]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Auxiliary Card Skeleton */}
      <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-5 space-y-3">
        <div className="h-4 w-40 bg-[var(--ink-2)] rounded" />
        <div className="h-3 w-full bg-[var(--ink-2)]/50 rounded" />
      </div>
    </div>
  );
}
