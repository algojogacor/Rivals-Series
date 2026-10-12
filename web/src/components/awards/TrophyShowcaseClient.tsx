'use client';

import dynamic from 'next/dynamic';
import type { TrophyType } from './TrophyViewer3D';

const TrophyViewer3D = dynamic(() => import('./TrophyViewer3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[180px] flex flex-col items-center justify-center gap-2 select-none animate-pulse">
      <div className="w-9 h-9 rounded-full border-2 border-[var(--gold)]/20 border-t-[var(--gold)] animate-spin" />
      <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-faint)]">
        Memuat 3D...
      </span>
    </div>
  ),
});

export function ChampionTrophyShowcase({
  isCompleted = false,
  isTied = false,
}: {
  isCompleted?: boolean;
  isTied?: boolean;
}) {
  return (
    <TrophyViewer3D
      type="champion"
      size="hero"
      isCompleted={isCompleted}
      isTied={isTied}
      showCelebrateButton={true}
    />
  );
}

export function AwardTrophyShowcase({
  type,
  size = 'md',
  isCompleted = false,
  isTied = false,
}: {
  type: TrophyType;
  size?: 'sm' | 'md' | 'lg';
  isCompleted?: boolean;
  isTied?: boolean;
}) {
  return (
    <TrophyViewer3D
      type={type}
      size={size}
      isCompleted={isCompleted}
      isTied={isTied}
    />
  );
}

// Backward-compatible default export
export function TrophyShowcaseClient() {
  return <ChampionTrophyShowcase />;
}
