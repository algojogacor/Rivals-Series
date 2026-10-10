export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-3 border-b border-[var(--line)] pb-6">
        <div className="h-10 w-48 bg-[var(--ink-1)] rounded-[8px]" />
        <div className="h-4 w-96 max-w-full bg-[var(--ink-1)]/60 rounded-[6px]" />
      </div>

      {/* Content panel skeleton */}
      <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-6 space-y-4">
        <div className="h-6 w-36 bg-[var(--ink-2)] rounded-[6px]" />
        <div className="space-y-3">
          <div className="h-14 bg-[var(--ink-2)]/50 rounded-[8px]" />
          <div className="h-14 bg-[var(--ink-2)]/50 rounded-[8px]" />
          <div className="h-14 bg-[var(--ink-2)]/50 rounded-[8px]" />
        </div>
      </div>
    </div>
  );
}
