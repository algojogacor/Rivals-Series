export default function AwardsLoading() {
  return (
    <div className="space-y-10 animate-pulse">
      {/* 1. Header */}
      <div className="space-y-3 border-b border-[var(--line)] pb-6">
        <div className="h-12 w-48 bg-[var(--ink-1)] rounded-[8px]" />
        <div className="h-4 w-96 max-w-full bg-[var(--ink-1)]/60 rounded-[6px]" />
      </div>

      {/* 2. Top Banner / Hero Skeleton */}
      <div className="rounded-[16px] bg-[var(--ink-1)] border border-[var(--line)] p-6 sm:p-8 space-y-4">
        <div className="h-6 w-36 bg-[var(--ink-2)] rounded-[6px]" />
        <div className="h-8 w-64 bg-[var(--ink-2)] rounded-[8px]" />
        <div className="h-4 w-80 max-w-full bg-[var(--ink-2)]/60 rounded-[6px]" />
      </div>

      {/* 3. Awards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-24 bg-[var(--ink-2)] rounded-[4px]" />
              <div className="h-5 w-12 bg-[var(--ink-2)] rounded-[4px]" />
            </div>
            <div className="h-6 w-40 bg-[var(--ink-2)] rounded-[6px]" />
            <div className="h-4 w-full bg-[var(--ink-2)]/50 rounded-[4px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
