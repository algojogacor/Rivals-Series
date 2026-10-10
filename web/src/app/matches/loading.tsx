export default function MatchesLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* 1. Header with Segmented Control */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--line)] pb-6">
        <div className="space-y-3">
          <div className="h-12 w-52 bg-[var(--ink-1)] rounded-[8px]" />
          <div className="h-4 w-96 max-w-full bg-[var(--ink-1)]/60 rounded-[6px]" />
        </div>
        <div className="h-9 w-48 bg-[var(--ink-1)] rounded-[8px] border border-[var(--line)]" />
      </div>

      {/* 2. Match Cards Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((idx) => (
          <div
            key={idx}
            className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-4 sm:p-5 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="h-6 w-14 bg-[var(--ink-2)] rounded-[6px]" />
              <div className="h-5 w-28 bg-[var(--ink-2)] rounded-[6px]" />
            </div>
            <div className="h-7 w-20 bg-[var(--ink-2)] rounded-[6px]" />
            <div className="h-5 w-28 bg-[var(--ink-2)] rounded-[6px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
